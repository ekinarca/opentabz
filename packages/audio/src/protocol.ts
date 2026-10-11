/**
 * Messages between the UI, the synth worker, the engine worker and the AudioWorklet.
 * Ticks are always score ticks (the engine's MIDI tick shift is applied inside the synth worker).
 */
import type { MetronomeSettings } from './metronome.ts';
import type { RingBuffers } from './ring.ts';
import type { TrainerSettings } from './trainer.ts';

import type { TickRange } from '@opentabz/core/shared';

export type { MidiDelivery, PreviewDelivery, SynthDelivery, TickRange } from '@opentabz/core/shared';

/** UI → synth worker. */
export type SynthCommand =
  | {
      readonly type: 'init';
      readonly sampleRate: number;
      readonly ring: RingBuffers;
      /** Pings from the AudioWorklet asking for more audio. */
      readonly workletPort: MessagePort;
      /** MIDI arriving directly from the engine worker. */
      readonly enginePort: MessagePort;
    }
  | { readonly type: 'loadSoundFont'; readonly bytes: ArrayBuffer }
  | { readonly type: 'play' }
  | { readonly type: 'pause' }
  /** `id` is echoed by a `moved` event once the position has changed. */
  | { readonly type: 'stop'; readonly id: number }
  | { readonly type: 'seek'; readonly tick: number; readonly id: number }
  | { readonly type: 'setSpeed'; readonly value: number }
  | { readonly type: 'setMasterVolume'; readonly value: number }
  /** The metronome: on or off, its level (0–1), and its pattern and sound. */
  | {
      readonly type: 'setMetronome';
      readonly enabled: boolean;
      readonly volume: number;
      readonly settings: MetronomeSettings;
    }
  | ({ readonly type: 'setCountIn' } & CountInSettings)
  /** The speed trainer; enabling it starts its run at `from`, as does stopping playback. */
  | ({ readonly type: 'setTrainer' } & TrainerSettings)
  /** Passes of a loop to play before playback stops; null repeats endlessly. */
  | { readonly type: 'setLoopPasses'; readonly passes: number | null }
  /**
   * The metronome without a score: a song of clicks in one meter, played in a loop. Sent again
   * with the same id and meter it changes the tempo without interrupting the clicks.
   */
  | {
      readonly type: 'loadClickTrack';
      readonly playbackId: string;
      /** Clicks per minute, one per beat of the meter (quarters in 4/4, eighths in 6/8). */
      readonly bpm: number;
      readonly numerator: number;
      readonly denominator: number;
    }
  | {
      readonly type: 'setLoop';
      readonly enabled: boolean;
      readonly range: TickRange | null;
      /** Echoed by a `moved` event: a new range may move the playhead. */
      readonly id: number;
    }
  | { readonly type: 'setChannelMute'; readonly channel: number; readonly value: boolean }
  | { readonly type: 'setChannelSolo'; readonly channel: number; readonly value: boolean }
  | { readonly type: 'setChannelVolume'; readonly channel: number; readonly value: number };

export interface CountInSettings {
  readonly enabled: boolean;
  /** Level of the count-in clicks, separate from the metronome's (0–1). */
  readonly volume: number;
  /** Whole bars counted in; a start in mid-bar adds the beats before it. */
  readonly bars: 1 | 2;
  /** Count in again before every pass of a loop. */
  readonly everyLoop: boolean;
}

export interface SynthPosition {
  readonly tick: number;
  readonly time: number;
  readonly endTick: number;
  readonly endTime: number;
  /** Current tempo in BPM including the playback speed. */
  readonly tempo: number;
  readonly isSeek: boolean;
}

/** Synth worker → UI. */
export type SynthEvent =
  | { readonly type: 'ready' }
  | { readonly type: 'soundFontLoaded' }
  | {
      readonly type: 'midiLoaded';
      readonly playbackId: string;
      readonly endTick: number;
      readonly endTime: number;
    }
  | { readonly type: 'state'; readonly playing: boolean; readonly stopped: boolean }
  | ({ readonly type: 'position' } & SynthPosition)
  /**
   * The position changed because of command `id` (seek, stop, loop range). Position events sent
   * before it describe the old position.
   */
  | ({ readonly type: 'moved'; readonly id: number } & SynthPosition)
  /**
   * The count-in click being heard (0-based) of `beats`, in a meter of `numerator` beats (the
   * beat of the bar is `beat % numerator`); -1 when the count-in is over.
   */
  | { readonly type: 'countIn'; readonly beat: number; readonly beats: number; readonly numerator: number }
  | { readonly type: 'finished' }
  /** The speed trainer moved the speed on, and the new speed is now heard. */
  | { readonly type: 'speed'; readonly value: number }
  | { readonly type: 'error'; readonly context: string; readonly message: string };
