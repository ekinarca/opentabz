/**
 * Playback state for the UI. The audio engine runs in workers; this store mirrors what it reports
 * and exposes the transport actions. The cursor subscribes outside React for smoothness.
 */
import type { PlaybackTimeline, TickRange, TrackInterpretation } from '@opentabz/core/shared';
import type { SynthCommand, SynthEvent } from '@opentabz/audio/protocol';
import { create } from 'zustand';
import { getAudioEngine, type AudioEngine } from '../audio/audio-engine.ts';
import type { SoundFontPreset } from '../audio/soundfont-presets.ts';
import {
  canToggle,
  INITIAL_TRANSPORT,
  transition,
  type TransportEvent,
  type TransportState,
} from '../audio/transport-machine.ts';
import { getEngine } from '../engine/instance.ts';
import { whenPainted } from '../score-view/first-paint.ts';
import { strings } from '../strings.ts';
import { useDocuments, type OpenDocument } from './documents.ts';
import { effectiveVolume } from './mixer-memory.ts';
import { trackChannels } from './track-channels.ts';
import { usePractice, type PracticeSettings } from './practice.ts';
import { usePreferences } from './preferences.ts';

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;
/** Guitar Pro's practice range: 10 % to 300 % (alphaTab patch 0005 lowers its floor to 10 %). */
export const MIN_SPEED = 0.1;
export const MAX_SPEED = 3;
/** Fixed-tempo practice range, in quarter notes per minute. */
export const MIN_FIXED_TEMPO = 10;
export const MAX_FIXED_TEMPO = 300;
export const FIXED_TEMPO_PRESETS = [60, 80, 100, 120] as const;

export interface PlayerState {
  readonly transport: TransportState;
  /** Document whose MIDI is loaded. */
  readonly docKey: string | null;
  readonly timeline: PlaybackTimeline | null;
  readonly tick: number;
  /** Milliseconds from the start of the song. */
  readonly time: number;
  readonly endTime: number;
  /** BPM including the speed factor. */
  readonly tempo: number;
  readonly speed: number;
  /** One tempo for the whole song instead of its tempo map (quarter notes per minute), if set. */
  readonly fixedTempo: number | null;
  /** The count-in click being heard, while counting in. */
  readonly countInBeat: CountInBeat | null;
  /** The beat of a rest between loop passes being heard, while resting. */
  readonly restBeat: CountInBeat | null;
  /** The metronome plays on its own (its song of clicks is loaded instead of a document). */
  readonly clickTrack: boolean;
  readonly loop: boolean;
  /**
   * The selected range (A/B). Playback stays inside it: it plays the range once, or repeats it
   * while `loop` is on.
   */
  readonly selection: TickRange | null;
  readonly volume: number;
  /** Master balance, -1 (left) to 1 (right). */
  readonly balance: number;
  /** The sound bank's drum kits, once it is loaded. */
  readonly drumKits: readonly SoundFontPreset[];
  readonly load: (doc: OpenDocument) => Promise<void>;
  readonly unload: () => void;
  /** Play/pause. Must be called from a user gesture (it may create the audio output). */
  readonly toggle: () => void;
  readonly stop: () => void;
  /** Moves playback to `tick`; a tick outside the selection clears the selection. */
  readonly seek: (tick: number) => void;
  readonly setSpeed: (speed: number) => void;
  readonly setFixedTempo: (bpm: number | null) => void;
  readonly setLoop: (on: boolean) => void;
  /** Loads the metronome's own song of clicks (tempo and meter from the practice settings). */
  readonly openClickTrack: () => Promise<void>;
  /** Back from the metronome on its own to the active document, if any. */
  readonly closeClickTrack: () => void;
  /**
   * Changes the selection. While a gesture is still adjusting it pass `final: false`: only the
   * UI follows, and the synthesizer gets the range once the gesture ends.
   */
  readonly setSelection: (range: TickRange | null, final?: boolean) => void;
  readonly setVolume: (volume: number) => void;
  readonly setBalance: (balance: number) => void;
}

export interface CountInBeat {
  /** 0-based click of `beats`. */
  readonly beat: number;
  readonly beats: number;
  /** Beats in a bar of the count-in's meter. */
  readonly numerator: number;
}

let loadSeq = 0;
/** Id of the loaded song of clicks: the same id lets the synthesizer change its tempo in place. */
let clickTrackId: string | null = null;

/**
 * Commands that move the playhead (seek, stop, loop range) carry an id; position events that
 * arrive before the synth's `moved` answer for the latest one describe the old position and are
 * ignored, so quick successive moves never jump back.
 */
let moveId = 0;
let awaitingMove: number | null = null;
function nextMove(): number {
  moveId += 1;
  awaitingMove = moveId;
  return moveId;
}

/** Performance mark set when play is pressed; `ot:play-start` measures until the synth plays. */
const PLAY_REQUEST = 'ot:play-request';

/** Commands the UI sends the synthesizer once it runs. */
export type ChannelCommand = Exclude<SynthCommand, { type: 'init' } | { type: 'connectWorklet' }>;

/**
 * A document's mixer state as synthesizer commands, channel by channel: everything, or only what
 * changed since `before`. Pan and instrument go as overrides only when they differ from the file,
 * so the song's own pan and program changes play as written otherwise. Playback and the audio
 * export send the same.
 */
export function mixCommands(
  doc: OpenDocument,
  timeline: PlaybackTimeline | null,
  before?: OpenDocument,
): ChannelCommand[] {
  const commands: ChannelCommand[] = [];
  doc.summary.tracks.forEach((track, index) => {
    const mix = doc.mix[index];
    if (mix === undefined) return;
    const old = before?.mix[index];
    const volume = effectiveVolume(doc.mix, doc.focus, index);
    const oldVolume = before === undefined ? null : effectiveVolume(before.mix, before.focus, index);
    const filePan = Math.min(1, Math.max(-1, (track.mix.balance - 8) / 8));
    for (const { channel, drums } of trackChannels(index, track.channels, timeline)) {
      if (old?.mute !== mix.mute) commands.push({ type: 'setChannelMute', channel, value: mix.mute });
      if (old?.solo !== mix.solo) commands.push({ type: 'setChannelSolo', channel, value: mix.solo });
      if (oldVolume !== volume) commands.push({ type: 'setChannelVolume', channel, value: volume });
      if (old?.pan !== mix.pan) {
        commands.push({ type: 'setChannelPan', channel, value: mix.pan === filePan ? null : mix.pan });
      }
      if (drums) continue;
      if (old?.program !== mix.program) {
        // On a drum track the program is the kit.
        commands.push({
          type: 'setChannelProgram',
          channel,
          program: mix.program === track.program ? null : mix.program,
        });
      }
      if (track.isPercussion) continue;
      if (old?.transpose !== mix.transpose) {
        commands.push({ type: 'setChannelTranspose', channel, semitones: mix.transpose });
      }
      if (old?.detune !== mix.detune) commands.push({ type: 'setChannelDetune', channel, cents: mix.detune });
    }
  });
  return commands;
}

/** Sends a document's mixer state (or what changed since `before`) to the synthesizer. */
function applyMix(doc: OpenDocument, timeline: PlaybackTimeline | null, before?: OpenDocument): void {
  const engine = getAudioEngine();
  for (const command of mixCommands(doc, timeline, before)) engine.send(command);
}

function sendMetronome(engine: AudioEngine, practice: PracticeSettings): void {
  engine.send({
    type: 'setMetronome',
    enabled: practice.metronome,
    volume: practice.metronomeVolume,
    settings: practice.click,
  });
}

function sendCountIn(engine: AudioEngine, practice: PracticeSettings): void {
  engine.send({
    type: 'setCountIn',
    enabled: practice.countIn,
    volume: practice.countInVolume,
    bars: practice.countInBars,
    everyLoop: practice.countInEveryLoop,
  });
}

function sendTrainer(engine: AudioEngine, practice: PracticeSettings): void {
  engine.send({ type: 'setTrainer', ...practice.trainer });
}

function sendLoopPasses(engine: AudioEngine, practice: PracticeSettings): void {
  engine.send({ type: 'setLoopPasses', passes: practice.loopPasses });
  engine.send({ type: 'setLoopRest', bars: practice.loopRest });
}

function sendClickTrack(engine: AudioEngine, playbackId: string, practice: PracticeSettings): void {
  engine.send({
    type: 'loadClickTrack',
    playbackId,
    bpm: practice.toolBpm,
    numerator: practice.toolNumerator,
    denominator: practice.toolDenominator,
  });
}

// Keep the synthesizer in step with the practice settings. Before the synthesizer exists nothing
// is sent; loading sends everything.
usePractice.subscribe((state, previous) => {
  const engine = getAudioEngine();
  if (
    state.metronome !== previous.metronome ||
    state.metronomeVolume !== previous.metronomeVolume ||
    state.click !== previous.click
  ) {
    sendMetronome(engine, state);
  }
  if (
    state.countIn !== previous.countIn ||
    state.countInVolume !== previous.countInVolume ||
    state.countInBars !== previous.countInBars ||
    state.countInEveryLoop !== previous.countInEveryLoop
  ) {
    sendCountIn(engine, state);
  }
  if (state.trainer !== previous.trainer) sendTrainer(engine, state);
  if (state.loopPasses !== previous.loopPasses || state.loopRest !== previous.loopRest) {
    sendLoopPasses(engine, state);
  }
  if (
    clickTrackId !== null &&
    (state.toolBpm !== previous.toolBpm ||
      state.toolNumerator !== previous.toolNumerator ||
      state.toolDenominator !== previous.toolDenominator)
  ) {
    sendClickTrack(engine, clickTrackId, state);
  }
});

// The audio delay preference: playback pauses, and the next start opens the output anew.
getAudioEngine().setLatencyHint(usePreferences.getState().audioLatency);
usePreferences.subscribe((state, previous) => {
  if (state.audioLatency === previous.audioLatency) return;
  if (usePlayer.getState().transport.status === 'playing') usePlayer.getState().toggle();
  getAudioEngine().setLatencyHint(state.audioLatency);
});

/** How each track of a document is played: its mixer's playing style. */
export function interpretations(doc: OpenDocument): TrackInterpretation[] {
  return doc.mix.map(mix => ({
    letRing: mix.letRing,
    brush: mix.brush,
    palmMute: mix.palmMute,
    accent: mix.accent,
  }));
}

function styleChanged(doc: OpenDocument, before: OpenDocument): boolean {
  return doc.mix.some((mix, index) => {
    const old = before.mix[index];
    return (
      old !== undefined &&
      (old.letRing !== mix.letRing ||
        old.brush !== mix.brush ||
        old.palmMute !== mix.palmMute ||
        old.accent !== mix.accent)
    );
  });
}

/** How long playback waits for the score's first paint before it is prepared anyway. */
const PAINT_WAIT_MS = 4000;

/** A playing style changed: the song is generated again and swapped in where it is playing. */
const RESTYLE_DELAY_MS = 300;
let restyleTimer: ReturnType<typeof setTimeout> | null = null;
function restyle(key: string): void {
  if (restyleTimer !== null) clearTimeout(restyleTimer);
  restyleTimer = setTimeout(() => {
    restyleTimer = null;
    const { docKey, timeline } = usePlayer.getState();
    const doc = useDocuments.getState().docs.find(candidate => candidate.key === key);
    if (docKey !== key || timeline === null || doc === undefined) return;
    getEngine()
      .call('preparePlayback', {
        docId: doc.engineId,
        playbackId: timeline.playbackId,
        interpretations: interpretations(doc),
        replace: true,
      })
      .catch((error: unknown) => {
        useDocuments.getState().notify({
          title: strings.transport.unavailable,
          description: error instanceof Error ? error.message : String(error),
          tone: 'error',
        });
      });
  }, RESTYLE_DELAY_MS);
}

/**
 * The song generated again from a score just edited (EDIT-001) and swapped in where it plays; its
 * timeline, where the beats now are, replaces the old one.
 */
export async function regenerateSong(key: string): Promise<void> {
  const { docKey, timeline } = usePlayer.getState();
  const doc = useDocuments.getState().docs.find(candidate => candidate.key === key);
  if (docKey !== key || timeline === null || doc === undefined) return;
  const next = await getEngine().call('preparePlayback', {
    docId: doc.engineId,
    playbackId: timeline.playbackId,
    interpretations: interpretations(doc),
    replace: true,
  });
  const current = usePlayer.getState();
  if (current.docKey === key && current.timeline?.playbackId === next.playbackId)
    usePlayer.setState({ timeline: next });
}

// Keep the synthesizer in step with mixer changes of the loaded document.
useDocuments.subscribe((state, previous) => {
  const key = usePlayer.getState().docKey;
  if (key === null) return;
  const doc = state.docs.find(candidate => candidate.key === key);
  const before = previous.docs.find(candidate => candidate.key === key);
  // While the song loads, the whole mixer is sent once it is ready.
  if (usePlayer.getState().transport.status === 'loading') return;
  if (doc !== undefined && before !== undefined && (doc.mix !== before.mix || doc.focus !== before.focus)) {
    applyMix(doc, usePlayer.getState().timeline, before);
    if (styleChanged(doc, before)) restyle(key);
  }
});

export function clampSpeed(speed: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round(speed * 100) / 100));
}

export const usePlayer = create<PlayerState>((set, get) => {
  const dispatch = (event: TransportEvent) => {
    set(state => ({ transport: transition(state.transport, event) }));
  };

  const onSynthEvent = (event: SynthEvent) => {
    switch (event.type) {
      case 'state':
        if (event.playing && performance.getEntriesByName(PLAY_REQUEST, 'mark').length > 0) {
          performance.clearMeasures('ot:play-start');
          performance.measure('ot:play-start', PLAY_REQUEST);
          performance.clearMarks(PLAY_REQUEST);
        }
        dispatch(event.playing ? { type: 'play' } : { type: 'pause' });
        if (!event.playing) set({ countInBeat: null, restBeat: null });
        break;
      case 'speed':
        // The speed trainer moved on: the new speed is being heard.
        set(state => ({ speed: event.value, tempo: (state.tempo / state.speed) * event.value }));
        break;
      case 'rest':
        set({
          restBeat:
            event.beat < 0 ? null : { beat: event.beat, beats: event.beats, numerator: event.numerator },
        });
        break;
      case 'countIn':
        set({
          countInBeat:
            event.beat < 0 ? null : { beat: event.beat, beats: event.beats, numerator: event.numerator },
        });
        break;
      case 'position':
        if (awaitingMove !== null) break;
        set({ tick: event.tick, time: event.time, endTime: event.endTime, tempo: event.tempo });
        break;
      case 'moved':
        if (event.id !== awaitingMove) break;
        awaitingMove = null;
        set(state => ({
          tick: event.tick,
          time: event.time,
          endTime: event.endTime > 0 ? event.endTime : state.endTime,
          tempo: event.tempo > 0 ? event.tempo : state.tempo,
        }));
        break;
      case 'finished':
        if (!get().loop) dispatch({ type: 'finished' });
        break;
      case 'error':
        dispatch({ type: 'fail', message: event.message });
        break;
      case 'ready':
      case 'soundFontLoaded':
      case 'midiLoaded':
        break;
    }
  };
  let subscribed = false;
  const audio = () => {
    const engine = getAudioEngine();
    if (!subscribed) {
      subscribed = true;
      engine.subscribe(onSynthEvent);
    }
    return engine;
  };

  return {
    transport: INITIAL_TRANSPORT,
    docKey: null,
    timeline: null,
    tick: 0,
    time: 0,
    endTime: 0,
    tempo: 120,
    speed: 1,
    fixedTempo: null,
    countInBeat: null,
    restBeat: null,
    clickTrack: false,
    loop: false,
    selection: null,
    volume: 1,
    balance: 0,
    drumKits: [],

    load: async doc => {
      const seq = ++loadSeq;
      const engine = audio();
      if (get().transport.status === 'playing') engine.send({ type: 'pause' });
      dispatch({ type: 'load' });
      clickTrackId = null;
      set({
        docKey: doc.key,
        timeline: null,
        tick: 0,
        time: 0,
        endTime: 0,
        selection: null,
        countInBeat: null,
        clickTrack: false,
        fixedTempo: null,
        tempo: doc.summary.tempo * get().speed,
      });
      try {
        await engine.prepare();
        set({ drumKits: engine.drumKits });
        const playbackId = `${doc.key}#${seq}`;
        const loaded = engine.waitFor(
          event =>
            (event.type === 'midiLoaded' && event.playbackId === playbackId) ||
            (event.type === 'error' && event.context === 'midi'),
        );
        // The engine worker does one thing at a time: the score paints first.
        await whenPainted(doc.key, PAINT_WAIT_MS);
        if (seq !== loadSeq) return;
        const current = useDocuments.getState().docs.find(candidate => candidate.key === doc.key) ?? doc;
        const timeline = await getEngine().call('preparePlayback', {
          docId: doc.engineId,
          playbackId,
          interpretations: interpretations(current),
        });
        const result = await loaded;
        if (seq !== loadSeq) return;
        if (result.type === 'error') {
          dispatch({ type: 'fail', message: result.message });
          return;
        }
        const { speed, loop, volume } = get();
        const practice = usePractice.getState();
        engine.send({ type: 'setSpeed', value: speed });
        sendMetronome(engine, practice);
        sendCountIn(engine, practice);
        sendLoopPasses(engine, practice);
        engine.send({ type: 'setFixedTempo', bpm: null });
        engine.send({ type: 'setLoop', enabled: loop, range: null, id: nextMove() });
        sendTrainer(engine, practice);
        engine.send({ type: 'setMasterVolume', value: volume });
        applyMix(useDocuments.getState().docs.find(candidate => candidate.key === doc.key) ?? doc, timeline);
        set({ timeline, endTime: result.type === 'midiLoaded' ? result.endTime : 0 });
        dispatch({ type: 'loaded' });
      } catch (error) {
        if (seq !== loadSeq) return;
        dispatch({ type: 'fail', message: error instanceof Error ? error.message : String(error) });
      }
    },

    unload: () => {
      loadSeq += 1;
      clickTrackId = null;
      if (get().transport.status === 'playing') audio().send({ type: 'pause' });
      set({
        docKey: null,
        timeline: null,
        tick: 0,
        time: 0,
        endTime: 0,
        selection: null,
        countInBeat: null,
        clickTrack: false,
      });
      dispatch({ type: 'unload' });
    },

    openClickTrack: async () => {
      const seq = ++loadSeq;
      const engine = audio();
      if (get().transport.status === 'playing') engine.send({ type: 'pause' });
      dispatch({ type: 'load' });
      set({
        docKey: null,
        timeline: null,
        tick: 0,
        time: 0,
        endTime: 0,
        selection: null,
        countInBeat: null,
        clickTrack: true,
      });
      try {
        await engine.prepare();
        if (seq !== loadSeq) return;
        const playbackId = `clicks#${seq}`;
        const loaded = engine.waitFor(
          event =>
            (event.type === 'midiLoaded' && event.playbackId === playbackId) ||
            (event.type === 'error' && event.context === 'midi'),
        );
        const practice = usePractice.getState();
        sendMetronome(engine, practice);
        // The tempo is the metronome's own: no practice speed.
        engine.send({ type: 'setSpeed', value: 1 });
        engine.send({ type: 'setMasterVolume', value: get().volume });
        clickTrackId = playbackId;
        sendClickTrack(engine, playbackId, practice);
        const result = await loaded;
        if (seq !== loadSeq) return;
        if (result.type === 'error') {
          dispatch({ type: 'fail', message: result.message });
          return;
        }
        set({ endTime: result.type === 'midiLoaded' ? result.endTime : 0 });
        dispatch({ type: 'loaded' });
      } catch (error) {
        if (seq !== loadSeq) return;
        dispatch({ type: 'fail', message: error instanceof Error ? error.message : String(error) });
      }
    },

    closeClickTrack: () => {
      if (!get().clickTrack) return;
      const { docs, activeKey } = useDocuments.getState();
      const active = docs.find(doc => doc.key === activeKey);
      if (active === undefined) get().unload();
      else void get().load(active);
    },

    toggle: () => {
      const { transport } = get();
      if (!canToggle(transport)) return;
      const engine = audio();
      if (transport.status === 'playing') {
        engine.send({ type: 'pause' });
        return;
      }
      performance.clearMarks(PLAY_REQUEST);
      performance.mark(PLAY_REQUEST);
      // Created synchronously inside the gesture; resolves once the output is connected.
      engine.ensureOutput().then(
        () => {
          engine.send({ type: 'play' });
        },
        (error: unknown) => {
          dispatch({ type: 'fail', message: error instanceof Error ? error.message : String(error) });
        },
      );
    },

    stop: () => {
      audio().send({ type: 'stop', id: nextMove() });
      // The synthesizer returns to the start of the selection, if any; its positions follow.
      const selection = get().selection;
      if (selection === null) set({ tick: 0, time: 0 });
      else set({ tick: selection.startTick });
    },

    seek: tick => {
      // Playback cannot leave the selection, so moving outside it clears it.
      const selection = get().selection;
      if (selection !== null && (tick < selection.startTick || tick >= selection.endTick)) {
        get().setSelection(null);
      }
      audio().send({ type: 'seek', tick, id: nextMove() });
      set({ tick });
    },

    setSpeed: speed => {
      const value = clampSpeed(speed);
      // Choosing a speed by hand ends the speed trainer's run.
      const practice = usePractice.getState();
      if (practice.trainer.enabled) practice.setTrainer({ enabled: false });
      audio().send({ type: 'setSpeed', value });
      // The live tempo includes the speed; it follows at once, not with the next position.
      set(state => ({ speed: value, tempo: (state.tempo / state.speed) * value }));
    },

    setFixedTempo: bpm => {
      const value =
        bpm === null ? null : Math.min(MAX_FIXED_TEMPO, Math.max(MIN_FIXED_TEMPO, Math.round(bpm)));
      if (value === get().fixedTempo) return;
      audio().send({ type: 'setFixedTempo', bpm: value });
      set(state => ({ fixedTempo: value, tempo: value === null ? state.tempo : value * state.speed }));
      // Paused, no position arrives to show the tempo here again: ask for one.
      if (value === null && get().transport.status !== 'playing') {
        audio().send({ type: 'seek', tick: get().tick, id: nextMove() });
      }
    },

    setLoop: on => {
      audio().send({ type: 'setLoop', enabled: on, range: get().selection, id: nextMove() });
      set({ loop: on });
    },

    setSelection: (range, final = true) => {
      const selection = range === null || range.endTick <= range.startTick ? null : range;
      set({ selection });
      if (final) audio().send({ type: 'setLoop', enabled: get().loop, range: selection, id: nextMove() });
    },

    setVolume: volume => {
      const value = Math.min(1, Math.max(0, volume));
      audio().send({ type: 'setMasterVolume', value });
      set({ volume: value });
    },

    setBalance: balance => {
      const value = Math.min(1, Math.max(-1, balance));
      audio().setBalance(value);
      set({ balance: value });
    },
  };
});
