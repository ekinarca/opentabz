/**
 * The synth worker's logic, independent of messaging: an alphaTab AlphaSynth writing into the
 * shared ring buffer, driven by commands from the UI and MIDI from the engine.
 */
import * as alphaTab from '@coderline/alphatab';
import type { MidiDelivery, PreviewDelivery, SynthDelivery } from '@opentabz/core/shared';
import type { SynthCommand, SynthEvent, SynthPosition, TickRange } from './protocol.ts';
import { type RingWriter } from './ring.ts';
import { RingSynthOutput } from './synth-output.ts';

/** Audio kept ready ahead of the playhead; absorbs scheduling hiccups in the worker. */
export const SYNTH_BUFFER_MS = 250;

export class SynthHost {
  private readonly emit: (event: SynthEvent) => void;
  private synth: alphaTab.synth.AlphaSynth | null = null;
  private output: RingSynthOutput | null = null;
  private tickShift = 0;
  private playbackId: string | null = null;
  private loop: { enabled: boolean; range: TickRange | null } = { enabled: false, range: null };
  /** The last position reported, so acknowledgements can say where the playhead is. */
  private position: SynthPosition | null = null;

  public constructor(emit: (event: SynthEvent) => void) {
    this.emit = emit;
  }

  public handle(command: Exclude<SynthCommand, { type: 'init' }>): void {
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
        synth.play();
        break;
      case 'pause':
        synth.pause();
        break;
      case 'stop':
        synth.stop();
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
      case 'setMetronomeVolume':
        synth.metronomeVolume = command.value;
        break;
      case 'setCountInVolume':
        synth.countInVolume = command.value;
        break;
      case 'setLoop': {
        const previous = this.loop.range;
        this.loop = { enabled: command.enabled, range: command.range };
        this.applyLoop(previous);
        this.moved(command.id);
        break;
      }
      case 'setChannelMute':
        synth.setChannelMute(command.channel, command.value);
        break;
      case 'setChannelSolo':
        synth.setChannelSolo(command.channel, command.value);
        break;
      case 'setChannelVolume':
        synth.setChannelVolume(command.channel, command.value);
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
      this.tickShift = delivery.tickShift;
      this.playbackId = delivery.playbackId;
      const midi = alphaTab.model.JsonConverter.jsObjectToMidiFile(delivery.midi);
      synth.loadMidiFile(midi);
      synth.applyTranspositionPitches(
        new Map(delivery.transpositionPitches.map(([channel, pitch]) => [channel, pitch])),
      );
      this.applyLoop(null);
    } catch (error) {
      this.emit({ type: 'error', context: 'midi', message: messageOf(error) });
    }
  }

  /** The AudioWorklet played more audio. */
  public progress(): void {
    this.output?.onProgress();
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
    synth.isLooping = enabled;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
