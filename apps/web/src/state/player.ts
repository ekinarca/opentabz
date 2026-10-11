/**
 * Playback state for the UI. The audio engine runs in workers; this store mirrors what it reports
 * and exposes the transport actions. The cursor subscribes outside React for smoothness.
 */
import type { PlaybackTimeline, TickRange } from '@opentabz/core/shared';
import type { SynthEvent } from '@opentabz/audio/protocol';
import { create } from 'zustand';
import { getAudioEngine } from '../audio/audio-engine.ts';
import {
  canToggle,
  INITIAL_TRANSPORT,
  transition,
  type TransportEvent,
  type TransportState,
} from '../audio/transport-machine.ts';
import { getEngine } from '../engine/instance.ts';
import { useDocuments, type OpenDocument } from './documents.ts';

export const SPEED_PRESETS = [0.25, 0.5, 0.75, 0.9, 1, 1.25, 1.5, 2] as const;
export const MIN_SPEED = 0.25;
export const MAX_SPEED = 2;

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
  readonly metronome: boolean;
  readonly countIn: boolean;
  readonly loop: boolean;
  /**
   * The selected range (A/B). Playback stays inside it: it plays the range once, or repeats it
   * while `loop` is on.
   */
  readonly selection: TickRange | null;
  readonly volume: number;
  readonly load: (doc: OpenDocument) => Promise<void>;
  readonly unload: () => void;
  /** Play/pause. Must be called from a user gesture (it may create the audio output). */
  readonly toggle: () => void;
  readonly stop: () => void;
  /** Moves playback to `tick`; a tick outside the selection clears the selection. */
  readonly seek: (tick: number) => void;
  readonly setSpeed: (speed: number) => void;
  readonly setMetronome: (on: boolean) => void;
  readonly setCountIn: (on: boolean) => void;
  readonly setLoop: (on: boolean) => void;
  /**
   * Changes the selection. While a gesture is still adjusting it pass `final: false`: only the
   * UI follows, and the synthesizer gets the range once the gesture ends.
   */
  readonly setSelection: (range: TickRange | null, final?: boolean) => void;
  readonly setVolume: (volume: number) => void;
}

let loadSeq = 0;

/** Performance mark set when play is pressed; `ot:play-start` measures until the synth plays. */
const PLAY_REQUEST = 'ot:play-request';

/** Sends a document's mixer state to the synthesizer, channel by channel. */
function applyMix(doc: OpenDocument): void {
  const engine = getAudioEngine();
  doc.summary.tracks.forEach((track, index) => {
    const mix = doc.mix[index];
    if (mix === undefined) return;
    for (const channel of track.channels) {
      engine.send({ type: 'setChannelMute', channel, value: mix.mute });
      engine.send({ type: 'setChannelSolo', channel, value: mix.solo });
      engine.send({ type: 'setChannelVolume', channel, value: mix.volume });
    }
  });
}

// Keep the synthesizer in step with mixer changes of the loaded document.
useDocuments.subscribe((state, previous) => {
  const key = usePlayer.getState().docKey;
  if (key === null) return;
  const doc = state.docs.find(candidate => candidate.key === key);
  const before = previous.docs.find(candidate => candidate.key === key);
  if (doc !== undefined && before !== undefined && doc.mix !== before.mix) applyMix(doc);
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
        break;
      case 'position':
        set({ tick: event.tick, time: event.time, endTime: event.endTime, tempo: event.tempo });
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
    metronome: false,
    countIn: false,
    loop: false,
    selection: null,
    volume: 1,

    load: async doc => {
      const seq = ++loadSeq;
      const engine = audio();
      if (get().transport.status === 'playing') engine.send({ type: 'pause' });
      dispatch({ type: 'load' });
      set({ docKey: doc.key, timeline: null, tick: 0, time: 0, endTime: 0, selection: null });
      try {
        await engine.prepare();
        const playbackId = `${doc.key}#${seq}`;
        const loaded = engine.waitFor(
          event =>
            (event.type === 'midiLoaded' && event.playbackId === playbackId) ||
            (event.type === 'error' && event.context === 'midi'),
        );
        const timeline = await getEngine().call('preparePlayback', { docId: doc.engineId, playbackId });
        const result = await loaded;
        if (seq !== loadSeq) return;
        if (result.type === 'error') {
          dispatch({ type: 'fail', message: result.message });
          return;
        }
        const { speed, metronome, countIn, loop, volume } = get();
        engine.send({ type: 'setSpeed', value: speed });
        engine.send({ type: 'setMetronomeVolume', value: metronome ? 1 : 0 });
        engine.send({ type: 'setCountInVolume', value: countIn ? 1 : 0 });
        engine.send({ type: 'setLoop', enabled: loop, range: null });
        engine.send({ type: 'setMasterVolume', value: volume });
        applyMix(useDocuments.getState().docs.find(candidate => candidate.key === doc.key) ?? doc);
        set({ timeline, endTime: result.type === 'midiLoaded' ? result.endTime : 0 });
        dispatch({ type: 'loaded' });
      } catch (error) {
        if (seq !== loadSeq) return;
        dispatch({ type: 'fail', message: error instanceof Error ? error.message : String(error) });
      }
    },

    unload: () => {
      loadSeq += 1;
      if (get().transport.status === 'playing') audio().send({ type: 'pause' });
      set({ docKey: null, timeline: null, tick: 0, time: 0, endTime: 0, selection: null });
      dispatch({ type: 'unload' });
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
      audio().send({ type: 'stop' });
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
      audio().send({ type: 'seek', tick });
      set({ tick });
    },

    setSpeed: speed => {
      const value = clampSpeed(speed);
      audio().send({ type: 'setSpeed', value });
      set({ speed: value });
    },

    setMetronome: on => {
      audio().send({ type: 'setMetronomeVolume', value: on ? 1 : 0 });
      set({ metronome: on });
    },

    setCountIn: on => {
      audio().send({ type: 'setCountInVolume', value: on ? 1 : 0 });
      set({ countIn: on });
    },

    setLoop: on => {
      audio().send({ type: 'setLoop', enabled: on, range: get().selection });
      set({ loop: on });
    },

    setSelection: (range, final = true) => {
      const selection = range === null || range.endTick <= range.startTick ? null : range;
      set({ selection });
      if (final) audio().send({ type: 'setLoop', enabled: get().loop, range: selection });
    },

    setVolume: volume => {
      const value = Math.min(1, Math.max(0, volume));
      audio().send({ type: 'setMasterVolume', value });
      set({ volume: value });
    },
  };
});
