/**
 * alphaTab synthesizer output that writes into the shared ring buffer (ADR-0015). Runs in the
 * synth worker. The AudioWorklet pings the worker as it plays; each ping reports progress to the
 * synthesizer and tops the ring up to its target fill level.
 */
import type * as alphaTab from '@coderline/alphatab';
import { distance, type RingWriter } from './ring.ts';

type Listener<T> = (value: T) => void;

class Emitter implements alphaTab.IEventEmitter {
  private readonly listeners = new Set<() => void>();
  public on(value: () => void): () => void {
    this.listeners.add(value);
    return () => this.listeners.delete(value);
  }
  public off(value: () => void): void {
    this.listeners.delete(value);
  }
  public trigger(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

class EmitterOf<T> implements alphaTab.IEventEmitterOfT<T> {
  private readonly listeners = new Set<Listener<T>>();
  public on(value: Listener<T>): () => void {
    this.listeners.add(value);
    return () => this.listeners.delete(value);
  }
  public off(value: Listener<T>): void {
    this.listeners.delete(value);
  }
  public trigger(value: T): void {
    for (const listener of [...this.listeners]) listener(value);
  }
}

/** Upper bound of synth chunks produced per refill, so one call can never spin. */
const MAX_CHUNKS_PER_FILL = 64;

export class RingSynthOutput implements alphaTab.synth.ISynthOutput {
  public readonly ready = new Emitter();
  public readonly samplesPlayed = new EmitterOf<number>();
  public readonly sampleRequest = new Emitter();
  public readonly sampleRate: number;

  private readonly ring: RingWriter;
  private targetFrames = 0;
  private playing = false;
  private filling = false;
  private lastConsumed: number;

  public constructor(ring: RingWriter, sampleRate: number) {
    this.ring = ring;
    this.sampleRate = sampleRate;
    this.lastConsumed = ring.consumed;
  }

  public open(bufferTimeInMilliseconds: number): void {
    this.targetFrames = Math.ceil((bufferTimeInMilliseconds / 1000) * this.sampleRate);
    queueMicrotask(() => {
      this.ready.trigger();
    });
  }

  public play(): void {
    this.playing = true;
    this.lastConsumed = this.ring.consumed;
    this.fill();
    this.ring.setPaused(false);
  }

  public pause(): void {
    this.playing = false;
    this.ring.setPaused(true);
  }

  public destroy(): void {
    this.pause();
  }

  public activate(): void {
    // The AudioContext is resumed by the UI inside the user's gesture.
  }

  public addSamples(samples: Float32Array): void {
    this.ring.write(samples);
  }

  public resetSamples(): void {
    this.ring.reset();
    this.lastConsumed = this.ring.consumed;
  }

  /** Called when the AudioWorklet reports progress. */
  public onProgress(): void {
    const consumed = this.ring.consumed;
    const played = distance(this.lastConsumed, consumed);
    this.lastConsumed = consumed;
    if (played > 0) this.samplesPlayed.trigger(played);
    if (this.playing) this.fill();
  }

  public enumerateOutputDevices(): Promise<alphaTab.synth.ISynthOutputDevice[]> {
    return Promise.resolve([]);
  }

  public setOutputDevice(): Promise<void> {
    return Promise.resolve();
  }

  public getOutputDevice(): Promise<alphaTab.synth.ISynthOutputDevice | null> {
    return Promise.resolve(null);
  }

  private fill(): void {
    if (this.filling) return;
    this.filling = true;
    try {
      for (
        let chunk = 0;
        chunk < MAX_CHUNKS_PER_FILL && this.playing && this.ring.buffered < this.targetFrames;
        chunk++
      ) {
        const before = this.ring.buffered;
        this.sampleRequest.trigger();
        // The synthesizer had nothing more to give (end of song).
        if (this.ring.buffered <= before) break;
      }
    } finally {
      this.filling = false;
    }
  }
}
