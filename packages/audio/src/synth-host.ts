/**
 * The synth worker's logic, independent of messaging: an alphaTab AlphaSynth writing into the
 * shared ring buffer, driven by commands from the UI and MIDI from the engine.
 *
 * The metronome is part of the MIDI: its clicks are notes on a drum kit on a channel of their
 * own, generated from the song's bar grid (metronome.ts). Turning it on or off and changing its
 * level only touch that channel; changing its pattern swaps in MIDI with the new clicks while
 * playing (alphaTab patch 0009), so nothing is interrupted.
 */
import * as alphaTab from '@coderline/alphatab';
import type { MidiDelivery, PreviewDelivery, SynthDelivery } from '@opentabz/core/shared';
import {
  clickTrackBars,
  CLICK_TRACK_BARS,
  countInStart,
  DEFAULT_METRONOME,
  metronomeClicks,
  METRONOME_SOUNDS,
  type MetronomeSettings,
} from './metronome.ts';
import type { CountInSettings, SynthCommand, SynthEvent, SynthPosition, TickRange } from './protocol.ts';
import { type RingWriter } from './ring.ts';
import { RingSynthOutput } from './synth-output.ts';
import { DEFAULT_TRAINER, nextTrainerSpeed, type TrainerSettings } from './trainer.ts';

/** Audio kept ready ahead of the playhead; absorbs scheduling hiccups in the worker. */
export const SYNTH_BUFFER_MS = 250;
/** Length of a metronome click note in ticks (percussion samples ring out on their own). */
const CLICK_TICKS = 60;

interface ChannelMix {
  mute: boolean;
  solo: boolean;
  volume: number;
  /** -1 to 1, or null for the song's own pan. */
  pan: number | null;
  /** General MIDI program, or null for the song's own. */
  program: number | null;
  transpose: number;
  detune: number;
}

export class SynthHost {
  private readonly emit: (event: SynthEvent) => void;
  private synth: alphaTab.synth.AlphaSynth | null = null;
  private output: RingSynthOutput | null = null;
  private song: MidiDelivery | null = null;
  private tickShift = 0;
  private playbackId: string | null = null;
  private loop: { enabled: boolean; range: TickRange | null } = { enabled: false, range: null };
  /** The last position reported, so acknowledgements can say where the playhead is. */
  private position: SynthPosition | null = null;
  private readonly mixer = new Map<number, ChannelMix>();
  private metronome: { enabled: boolean; volume: number; settings: MetronomeSettings } = {
    enabled: false,
    volume: 1,
    settings: DEFAULT_METRONOME,
  };
  /** Settings the loaded MIDI's clicks were generated with. */
  private builtMetronome: MetronomeSettings | null = null;
  private metronomeChannel = -1;
  private countIn: CountInSettings = { enabled: false, volume: 1, bars: 1, everyLoop: false };
  /** Beats in a bar of the count-in being played, so the UI can show the beat of the bar. */
  private countInNumerator = 4;
  /** Set while the loaded song is the metronome's own song of clicks. */
  private clickTrack: { playbackId: string; numerator: number; denominator: number } | null = null;
  private trainer: TrainerSettings = DEFAULT_TRAINER;
  /** Passes generated at the trainer's current speed. */
  private trainerPasses = 0;
  /** Passes of a loop to play before stopping (null: endlessly). */
  private loopPasses: number | null = null;
  /** The pass of the loop being generated, from 1. */
  private pass = 1;
  /** The last of a counted number of passes is under way: looping is off until playback stops. */
  private lastPass = false;
  /** Quarter-note BPM for the whole song instead of its tempo map (null: the score's tempos). */
  private fixedTempo: number | null = null;
  /** Bars of rest between loop passes. */
  private loopRest = 0;

  public constructor(emit: (event: SynthEvent) => void) {
    this.emit = emit;
  }

  public handle(command: Exclude<SynthCommand, { type: 'init' } | { type: 'connectWorklet' }>): void {
    const synth = this.synth;
    if (synth === null) {
      this.emit({ type: 'error', context: command.type, message: 'The synthesizer is not initialized.' });
      return;
    }
    switch (command.type) {
      case 'loadSoundFont':
        synth.loadSoundFont(new Uint8Array(command.bytes), false);
        break;
      case 'play':
        this.play(synth);
        break;
      case 'pause':
        synth.pause();
        break;
      case 'stop':
        synth.stop();
        this.restartPasses();
        this.moved(command.id);
        break;
      case 'seek':
        synth.tickPosition = Math.max(0, command.tick + this.tickShift);
        this.moved(command.id, Math.max(0, command.tick));
        break;
      case 'setSpeed':
        synth.playbackSpeed = command.value;
        break;
      case 'setMasterVolume':
        synth.masterVolume = command.value;
        break;
      case 'setMetronome':
        this.metronome = { enabled: command.enabled, volume: command.volume, settings: command.settings };
        if (this.song !== null && !sameSettings(this.builtMetronome, command.settings)) this.rebuild();
        this.applyMetronomeChannel();
        break;
      case 'loadClickTrack':
        this.loadClickTrack(synth, command);
        break;
      case 'setTrainer':
        this.trainer = {
          enabled: command.enabled,
          from: command.from,
          to: command.to,
          step: command.step,
          passes: command.passes,
        };
        this.restartPasses();
        break;
      case 'setLoopPasses':
        this.loopPasses = command.passes;
        this.restartPasses();
        break;
      case 'setLoopRest':
        this.loopRest = Math.max(0, Math.round(command.bars));
        this.applyLoopRest();
        break;
      case 'setFixedTempo':
        if (command.bpm === this.fixedTempo) break;
        this.fixedTempo = command.bpm;
        // Swapped in while playing: the position carries over by tick.
        if (this.song !== null && this.clickTrack === null) synth.replaceMidiFile(this.buildMidi(this.song));
        break;
      case 'setCountIn':
        this.countIn = {
          enabled: command.enabled,
          volume: command.volume,
          bars: command.bars,
          everyLoop: command.everyLoop,
        };
        this.applyCountIn();
        break;
      case 'setLoop': {
        const previous = this.loop.range;
        this.loop = { enabled: command.enabled, range: command.range };
        this.applyLoop(previous);
        this.restartPasses();
        this.moved(command.id);
        break;
      }
      case 'setChannelMute':
        this.mixFor(command.channel).mute = command.value;
        synth.setChannelMute(command.channel, command.value);
        this.applyMetronomeChannel();
        break;
      case 'setChannelSolo':
        this.mixFor(command.channel).solo = command.value;
        synth.setChannelSolo(command.channel, command.value);
        this.applyMetronomeChannel();
        break;
      case 'setChannelVolume':
        this.mixFor(command.channel).volume = command.value;
        synth.setChannelVolume(command.channel, command.value);
        break;
      case 'setChannelPan':
        this.mixFor(command.channel).pan = command.value;
        synth.setChannelPan(command.channel, command.value);
        break;
      case 'setChannelProgram':
        this.mixFor(command.channel).program = command.program;
        synth.setChannelProgram(command.channel, command.program);
        break;
      case 'setChannelTranspose':
        this.mixFor(command.channel).transpose = command.semitones;
        synth.setChannelTranspositionPitch(command.channel, command.semitones);
        break;
      case 'setChannelDetune':
        this.mixFor(command.channel).detune = command.cents;
        synth.setChannelDetune(command.channel, command.cents);
        break;
    }
  }

  /** Creates the synthesizer for an output running at `sampleRate`. */
  public init(sampleRate: number, ring: RingWriter): void {
    this.output = new RingSynthOutput(ring, sampleRate);
    const synth = new alphaTab.synth.AlphaSynth(this.output, SYNTH_BUFFER_MS);
    this.synth = synth;
    synth.ready.on(() => {
      this.emit({ type: 'ready' });
    });
    synth.soundFontLoaded.on(() => {
      this.emit({ type: 'soundFontLoaded' });
    });
    synth.soundFontLoadFailed.on(error => {
      this.emit({ type: 'error', context: 'soundFont', message: messageOf(error) });
    });
    synth.midiLoadFailed.on(error => {
      this.emit({ type: 'error', context: 'midi', message: messageOf(error) });
    });
    synth.midiLoaded.on(args => {
      if (this.playbackId === null) return;
      this.emit({
        type: 'midiLoaded',
        playbackId: this.playbackId,
        endTick: args.endTick - this.tickShift,
        endTime: args.endTime,
      });
    });
    synth.stateChanged.on(args => {
      // After the last of a counted number of passes, the next play loops again.
      if (args.stopped && this.lastPass) this.restartPasses();
      this.emit({
        type: 'state',
        playing: args.state === alphaTab.synth.PlayerState.Playing,
        stopped: args.stopped,
      });
    });
    synth.positionChanged.on(args => {
      this.position = {
        tick: args.currentTick - this.tickShift,
        time: args.currentTime,
        endTick: args.endTick - this.tickShift,
        endTime: args.endTime,
        tempo: args.modifiedTempo,
        isSeek: args.isSeek,
      };
      this.emit({ type: 'position', ...this.position });
    });
    synth.finished.on(() => {
      this.emit({ type: 'finished' });
    });
    synth.passGenerated.on(() => {
      this.nextPass(synth);
    });
    synth.heardSpeedChanged.on(speed => {
      if (this.trainer.enabled) this.emit({ type: 'speed', value: speed });
    });
    synth.restProgress.on(({ beat, beats }) => {
      this.emit({ type: 'rest', beat, beats, numerator: this.countInNumerator });
    });
    synth.countInProgress.on(({ beat, beats }) => {
      this.emit({ type: 'countIn', beat, beats, numerator: this.countInNumerator });
      // Later passes of a loop count in to the loop start.
      if (beat < 0) this.fitCountInToLoop();
    });
  }

  /** Acknowledges a command that may have moved the playhead, with the position it is at now. */
  private moved(id: number, requested?: number): void {
    const synth = this.synth;
    if (synth === null) return;
    // alphaTab converts ticks to time and back, which can be off by a tick; report the requested
    // tick unless the synthesizer moved somewhere else (a loop range clamps seeks).
    const actual = Math.max(0, synth.tickPosition - this.tickShift);
    const tick = requested !== undefined && Math.abs(actual - requested) <= 2 ? requested : actual;
    const position = this.position ?? { tick, time: 0, endTick: 0, endTime: 0, tempo: 0, isSeek: true };
    this.emit({ type: 'moved', id, ...position, tick });
  }

  /** Handles everything the engine worker sends. */
  public receive(delivery: SynthDelivery): void {
    switch (delivery.type) {
      case 'midi':
        this.receiveMidi(delivery);
        break;
      case 'preview':
        this.preview(delivery);
        break;
    }
  }

  /** Sounds a few beats once without moving the song position (audible stepping). */
  public preview(delivery: PreviewDelivery): void {
    const synth = this.synth;
    if (synth === null) return;
    try {
      synth.playOneTimeMidiFile(alphaTab.model.JsonConverter.jsObjectToMidiFile(delivery.midi));
    } catch (error) {
      this.emit({ type: 'error', context: 'preview', message: messageOf(error) });
    }
  }

  /** Loads MIDI generated by the engine worker. */
  public receiveMidi(delivery: MidiDelivery): void {
    const synth = this.synth;
    if (synth === null) return;
    try {
      synth.pause();
      this.song = delivery;
      this.tickShift = delivery.tickShift;
      this.playbackId = delivery.playbackId;
      this.clickTrack = null;
      // A new document starts with the mixer the UI sends next.
      this.mixer.clear();
      synth.resetChannelStates();
      for (const channel of delivery.centeredChannels) synth.setChannelCentered(channel, true);
      this.load(synth, delivery);
      this.applyLoop(null);
    } catch (error) {
      this.emit({ type: 'error', context: 'midi', message: messageOf(error) });
    }
  }

  /** The AudioWorklet played more audio. */
  public progress(): void {
    this.output?.onProgress();
  }

  private play(synth: alphaTab.synth.AlphaSynth): void {
    const song = this.song;
    // The metronome on its own needs no count-in.
    synth.countInVolume = this.clickTrack === null ? this.countInLevel() : 0;
    if (this.countIn.enabled && this.clickTrack === null && song !== null) {
      // Count in to the start of the beat, with the beats of the bar before it.
      const tick = Math.max(0, synth.tickPosition - this.tickShift);
      const start = countInStart(song.bars, song.endTick, tick);
      if (Math.abs(start.tick - tick) > 2) synth.tickPosition = start.tick + this.tickShift;
      synth.countInLeadBeats = start.beatsBefore;
      this.countInNumerator = start.numerator;
    }
    synth.play();
  }

  /**
   * Loads (or retunes) the metronome's own song of clicks. The same id and meter only change the
   * tempo, swapped in while playing; anything else starts the clicks from the top.
   */
  private loadClickTrack(
    synth: alphaTab.synth.AlphaSynth,
    command: Extract<SynthCommand, { type: 'loadClickTrack' }>,
  ): void {
    try {
      const { playbackId, bpm, numerator, denominator } = command;
      const delivery = clickTrackDelivery(playbackId, bpm, numerator, denominator);
      const previous = this.clickTrack;
      this.song = delivery;
      this.tickShift = 0;
      this.playbackId = playbackId;
      this.clickTrack = { playbackId, numerator, denominator };
      if (
        previous !== null &&
        previous.playbackId === playbackId &&
        previous.numerator === numerator &&
        previous.denominator === denominator
      ) {
        synth.replaceMidiFile(this.buildMidi(delivery));
        return;
      }
      const playing = synth.state === alphaTab.synth.PlayerState.Playing;
      synth.pause();
      this.mixer.clear();
      synth.resetChannelStates();
      this.loop = { enabled: true, range: null };
      this.load(synth, delivery);
      this.applyLoop(null);
      if (playing) this.play(synth);
    } catch (error) {
      this.emit({ type: 'error', context: 'midi', message: messageOf(error) });
    }
  }

  /**
   * A new pass of the loop is being generated: the trainer may move the speed on (for the whole
   * pass), and the last of a counted number of passes ends playback.
   */
  private nextPass(synth: alphaTab.synth.AlphaSynth): void {
    // The metronome on its own just keeps clicking.
    if (this.clickTrack !== null) return;
    this.pass += 1;
    if (this.loopPasses !== null && this.pass >= this.loopPasses) {
      synth.isLooping = false;
      this.lastPass = true;
    }
    if (!this.trainer.enabled) return;
    this.trainerPasses += 1;
    if (this.trainerPasses < Math.max(1, this.trainer.passes)) return;
    this.trainerPasses = 0;
    const next = nextTrainerSpeed(synth.playbackSpeed, this.trainer);
    if (next !== synth.playbackSpeed) synth.playbackSpeed = next;
  }

  /** Counting passes starts over (and the trainer's run, at its first speed). */
  private restartPasses(): void {
    const synth = this.synth;
    if (synth === null) return;
    this.pass = 1;
    this.trainerPasses = 0;
    if (this.lastPass) {
      this.lastPass = false;
      synth.isLooping = this.loop.enabled || this.clickTrack !== null;
    }
    if (this.trainer.enabled && this.clickTrack === null && synth.playbackSpeed !== this.trainer.from) {
      synth.playbackSpeed = this.trainer.from;
    }
  }

  /** After the first count-in, later loop passes count in to the loop start. */
  private fitCountInToLoop(): void {
    const synth = this.synth;
    const song = this.song;
    const range = this.loop.range;
    if (synth === null || song === null) return;
    const start = countInStart(song.bars, song.endTick, range?.startTick ?? 0);
    synth.countInLeadBeats = start.beatsBefore;
    this.countInNumerator = start.numerator;
  }

  /** Loads the song with the metronome's clicks on a drum channel of their own. */
  private load(synth: alphaTab.synth.AlphaSynth, song: MidiDelivery): void {
    synth.loadMidiFile(this.buildMidi(song));
    synth.applyTranspositionPitches(new Map(song.transpositionPitches.map(([key, pitch]) => [key, pitch])));
    for (const [mixChannel, mix] of this.mixer) {
      synth.setChannelMute(mixChannel, mix.mute);
      synth.setChannelSolo(mixChannel, mix.solo);
      synth.setChannelVolume(mixChannel, mix.volume);
      synth.setChannelPan(mixChannel, mix.pan);
      if (mix.program !== null) synth.setChannelProgram(mixChannel, mix.program);
      if (mix.transpose !== 0) synth.setChannelTranspositionPitch(mixChannel, mix.transpose);
      if (mix.detune !== 0) synth.setChannelDetune(mixChannel, mix.detune);
    }
    // alphaTab's own metronome stays off: the clicks above replace it.
    synth.metronomeVolume = 0;
    this.applyMetronomeChannel();
    this.applyCountIn();
    this.applyLoopRest();
  }

  /** The metronome on its own clicks on without rests. */
  private applyLoopRest(): void {
    if (this.synth !== null) this.synth.loopRestBars = this.clickTrack === null ? this.loopRest : 0;
  }

  /** The song's MIDI plus the metronome's clicks. */
  private buildMidi(song: MidiDelivery): alphaTab.midi.MidiFile {
    const midi = alphaTab.model.JsonConverter.jsObjectToMidiFile(song.midi);
    let channel = 0;
    for (const event of midi.events) {
      if ('channel' in event && typeof event.channel === 'number') channel = Math.max(channel, event.channel);
    }
    this.metronomeChannel = channel + 1;
    const clicks = metronomeClicks(song.bars, song.endTick, this.metronome.settings);
    const { ControlChangeEvent, ControllerType, NoteOffEvent, NoteOnEvent, ProgramChangeEvent } =
      alphaTab.midi;
    const track = 0;
    const events: alphaTab.midi.MidiEvent[] = [
      // Bank 127 selects a drum kit on any channel (alphaTab patch 0007).
      new ControlChangeEvent(track, 0, this.metronomeChannel, ControllerType.BankSelectCoarse, 127),
      new ProgramChangeEvent(track, 0, this.metronomeChannel, 0),
      new ControlChangeEvent(track, 0, this.metronomeChannel, ControllerType.VolumeCoarse, 127),
    ];
    // Every metronome key once, silently (a note-on with velocity 0 is a note-off): alphaTab loads
    // the samples of the keys a song uses, and the sound may change while the song plays.
    const keys = new Set(Object.values(METRONOME_SOUNDS).flatMap(sound => [sound.accent, sound.normal]));
    for (const key of keys) events.push(new NoteOnEvent(track, 0, this.metronomeChannel, key, 0));
    for (const click of clicks) {
      const tick = click.tick + song.tickShift;
      events.push(new NoteOnEvent(track, tick, this.metronomeChannel, click.key, click.velocity));
      events.push(new NoteOffEvent(track, tick + CLICK_TICKS, this.metronomeChannel, click.key, 0));
    }
    // Fixed-tempo practice: one tempo for the whole song instead of the score's tempo map.
    const fixedTempo = this.clickTrack === null ? this.fixedTempo : null;
    if (fixedTempo !== null) {
      for (const track of midi.tracks) {
        for (let index = track.events.length - 1; index >= 0; index--) {
          if (track.events[index]?.type === alphaTab.midi.MidiEventType.TempoChange)
            track.events.splice(index, 1);
        }
      }
      events.push(new alphaTab.midi.TempoChangeEvent(0, Math.round(60_000_000 / fixedTempo)));
    }
    events.sort((a, b) => a.tick - b.tick);
    // The engine writes one track (format 0): one merge and a stable sort instead of thousands
    // of sorted inserts.
    const songTrack = midi.tracks[0];
    if (songTrack === undefined) {
      for (const event of events) midi.addEvent(event);
    } else {
      songTrack.events.push(...events);
      songTrack.events.sort((a, b) => a.tick - b.tick);
    }
    this.builtMetronome = this.metronome.settings;
    return midi;
  }

  /** New metronome clicks, swapped in without moving or interrupting playback. */
  private rebuild(): void {
    const synth = this.synth;
    const song = this.song;
    if (synth === null || song === null) return;
    synth.replaceMidiFile(this.buildMidi(song));
  }

  private mixFor(channel: number): ChannelMix {
    let mix = this.mixer.get(channel);
    if (mix === undefined) {
      mix = { mute: false, solo: false, volume: 1, pan: null, program: null, transpose: 0, detune: 0 };
      this.mixer.set(channel, mix);
    }
    return mix;
  }

  /**
   * The metronome channel: muted when off, kept audible when tracks are soloed, and centered
   * (drum kits spread percussion across the stereo field; alphaTab patch 0008).
   */
  private applyMetronomeChannel(): void {
    const synth = this.synth;
    if (synth === null || this.metronomeChannel < 0) return;
    const anySolo = [...this.mixer.entries()].some(
      ([channel, mix]) => channel !== this.metronomeChannel && mix.solo,
    );
    synth.setChannelCentered(this.metronomeChannel, true);
    // The metronome on its own always clicks; its volume can still make it silent (visual only).
    synth.setChannelMute(this.metronomeChannel, !this.metronome.enabled && this.clickTrack === null);
    synth.setChannelSolo(this.metronomeChannel, anySolo);
    synth.setChannelVolume(this.metronomeChannel, this.metronome.volume);
  }

  private applyCountIn(): void {
    const synth = this.synth;
    if (synth === null) return;
    synth.countInVolume = this.clickTrack === null ? this.countInLevel() : 0;
    synth.countInBars = this.countIn.bars;
    synth.countInEveryLoop = this.countIn.everyLoop;
  }

  /** alphaTab counts in whenever its count-in volume is above zero: a silent count-in stays on. */
  private countInLevel(): number {
    return this.countIn.enabled ? Math.max(0.0001, this.countIn.volume) : 0;
  }

  /** Applies the loop state; `previous` is the range the synthesizer currently has. */
  private applyLoop(previous: TickRange | null): void {
    const synth = this.synth;
    if (synth === null) return;
    const { enabled, range } = this.loop;
    if (range === null) {
      if (previous !== null || synth.playbackRange !== null) synth.playbackRange = null;
    } else if (previous?.startTick !== range.startTick || previous.endTick !== range.endTick) {
      const position = synth.tickPosition;
      const playbackRange = new alphaTab.synth.PlaybackRange();
      playbackRange.startTick = range.startTick + this.tickShift;
      playbackRange.endTick = range.endTick + this.tickShift;
      // alphaTab moves the playhead to the start of a new range; a range adjusted around the
      // playhead keeps playing from where it is.
      synth.playbackRange = playbackRange;
      if (position > playbackRange.startTick && position < playbackRange.endTick)
        synth.tickPosition = position;
    }
    // The metronome's own song of clicks always repeats.
    synth.isLooping = enabled || this.clickTrack !== null;
    this.fitCountInToLoop();
  }
}

/** The metronome's own song: bars of one meter at one tempo, with nothing but its clicks. */
function clickTrackDelivery(
  playbackId: string,
  bpm: number,
  numerator: number,
  denominator: number,
): MidiDelivery {
  const { AlphaTabRestEvent, MidiFile, TempoChangeEvent, TimeSignatureEvent } = alphaTab.midi;
  const midi = new MidiFile();
  const bars = clickTrackBars(numerator, denominator);
  const endTick = CLICK_TRACK_BARS * ((numerator * 4 * midi.division) / denominator);
  // BPM counts beats of the meter; MIDI tempo counts quarter notes.
  const quarterBpm = (bpm * 4) / denominator;
  midi.addEvent(new TimeSignatureEvent(0, 0, numerator, Math.log2(denominator), 24, 8));
  midi.addEvent(new TempoChangeEvent(0, Math.round(60_000_000 / quarterBpm)));
  // A rest at the end makes the song last its full bars.
  midi.addEvent(new AlphaTabRestEvent(0, endTick, 0));
  return {
    type: 'midi',
    playbackId,
    midi: alphaTab.model.JsonConverter.midiFileToJsObject(midi),
    tickShift: 0,
    transpositionPitches: [],
    bars,
    endTick,
    centeredChannels: [],
  };
}

function sameSettings(a: MetronomeSettings | null, b: MetronomeSettings): boolean {
  return a !== null && JSON.stringify(a) === JSON.stringify(b);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
