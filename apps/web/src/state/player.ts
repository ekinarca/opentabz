/**
 * Playback state for the UI. The audio engine runs in workers; this store mirrors what it reports
 * and exposes the transport actions. The cursor subscribes outside React for smoothness.
 */
import type { PlaybackTimeline } from '@opentabz/core/shared';
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
import type { OpenDocument } from './documents.ts';

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
  readonly volume: number;
  readonly load: (doc: OpenDocument) => Promise<void>;
  readonly unload: () => void;
  /** Play/pause. Must be called from a user gesture (it may create the audio output). */
  readonly toggle: () => void;
  readonly stop: () => void;
  readonly seek: (tick: number) => void;
  readonly setSpeed: (speed: number) => void;
  readonly setMetronome: (on: boolean) => void;
  readonly setCountIn: (on: boolean) => void;
  readonly setLoop: (on: boolean) => void;
  readonly setVolume: (volume: number) => void;
}

let loadSeq = 0;

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
    volume: 1,

    load: async doc => {
      const seq = ++loadSeq;
      const engine = audio();
      if (get().transport.status === 'playing') engine.send({ type: 'pause' });
      dispatch({ type: 'load' });
      set({ docKey: doc.key, timeline: null, tick: 0, time: 0, endTime: 0 });
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
      set({ docKey: null, timeline: null, tick: 0, time: 0, endTime: 0 });
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
      set({ tick: 0, time: 0 });
    },

    seek: tick => {
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
      audio().send({ type: 'setLoop', enabled: on, range: null });
      set({ loop: on });
    },

    setVolume: volume => {
      const value = Math.min(1, Math.max(0, volume));
      audio().send({ type: 'setMasterVolume', value });
      set({ volume: value });
    },
  };
});
