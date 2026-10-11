/**
 * Messages between the UI, the synth worker, the engine worker and the AudioWorklet.
 * Ticks are always score ticks (the engine's MIDI tick shift is applied inside the synth worker).
 */
import type { RingBuffers } from './ring.ts';

import type { TickRange } from '@opentabz/core/shared';

export type { MidiDelivery, TickRange } from '@opentabz/core/shared';

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
  | { readonly type: 'stop' }
  | { readonly type: 'seek'; readonly tick: number }
  | { readonly type: 'setSpeed'; readonly value: number }
  | { readonly type: 'setMasterVolume'; readonly value: number }
  | { readonly type: 'setMetronomeVolume'; readonly value: number }
  | { readonly type: 'setCountInVolume'; readonly value: number }
  | { readonly type: 'setLoop'; readonly enabled: boolean; readonly range: TickRange | null }
  | { readonly type: 'setChannelMute'; readonly channel: number; readonly value: boolean }
  | { readonly type: 'setChannelSolo'; readonly channel: number; readonly value: boolean }
  | { readonly type: 'setChannelVolume'; readonly channel: number; readonly value: number };

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
  | { readonly type: 'finished' }
  | { readonly type: 'error'; readonly context: string; readonly message: string };
