/**
 * Lock-free single-producer/single-consumer ring of interleaved stereo float frames in shared
 * memory. The synth worker produces, the AudioWorklet consumes; the main thread is never on the
 * audio path. Indices are monotonically increasing 32-bit frame counters (wrapping safely).
 *
 * No imports: this module is bundled into the AudioWorklet.
 */

export const CHANNELS = 2;

/** Int32 control slots. */
export const Slot = {
  /** Total frames written by the producer. */
  Write: 0,
  /** Total frames read by the consumer. */
  Read: 1,
  /** 1 while paused: the consumer outputs silence and keeps the buffered frames. */
  Paused: 2,
  /** Incremented by the producer to ask the consumer to drop everything before DiscardUntil. */
  ResetEpoch: 3,
  /** Write index at the moment of the last reset. */
  DiscardUntil: 4,
  /** Frames the consumer had to fill with silence because the ring ran dry (diagnostics). */
  Underruns: 5,
} as const;

export const CONTROL_SLOTS = 8;

export interface RingBuffers {
  /** Shared memory for `CONTROL_SLOTS` Int32 values. */
  readonly control: SharedArrayBuffer;
  /** Shared memory for `capacity * CHANNELS` Float32 samples. */
  readonly samples: SharedArrayBuffer;
  /** Capacity in frames (a power of two). */
  readonly capacity: number;
}

export function createRingBuffers(capacity: number): RingBuffers {
  if (capacity <= 0 || (capacity & (capacity - 1)) !== 0)
    throw new RangeError('Ring capacity must be a power of two.');
  const control = new SharedArrayBuffer(CONTROL_SLOTS * Int32Array.BYTES_PER_ELEMENT);
  // Start paused: nothing plays (and nothing counts as an underrun) until playback starts.
  Atomics.store(new Int32Array(control), Slot.Paused, 1);
  return {
    control,
    samples: new SharedArrayBuffer(capacity * CHANNELS * Float32Array.BYTES_PER_ELEMENT),
    capacity,
  };
}

/** Frames between two wrapping 32-bit counters. */
export function distance(from: number, to: number): number {
  return (to - from) | 0;
}

/** Producer side (synth worker). */
export class RingWriter {
  private readonly control: Int32Array;
  private readonly samples: Float32Array;
  private readonly capacity: number;
  private readonly mask: number;

  public constructor(buffers: RingBuffers) {
    this.control = new Int32Array(buffers.control);
    this.samples = new Float32Array(buffers.samples);
    this.capacity = buffers.capacity;
    this.mask = buffers.capacity - 1;
  }

  /** Frames written but not yet consumed. */
  public get buffered(): number {
    const read = Atomics.load(this.control, Slot.Read);
    const write = Atomics.load(this.control, Slot.Write);
    const discard = Atomics.load(this.control, Slot.DiscardUntil);
    // Frames before a pending reset point no longer count.
    const effectiveRead = distance(read, discard) > 0 ? discard : read;
    return Math.max(0, distance(effectiveRead, write));
  }

  public get free(): number {
    return this.capacity - this.buffered;
  }

  /** Writes interleaved stereo frames; returns the number of frames written. */
  public write(interleaved: Float32Array): number {
    const frames = Math.min(Math.floor(interleaved.length / CHANNELS), this.free);
    let write = Atomics.load(this.control, Slot.Write);
    for (let frame = 0; frame < frames; frame++) {
      const target = ((write + frame) & this.mask) * CHANNELS;
      this.samples[target] = interleaved[frame * CHANNELS] ?? 0;
      this.samples[target + 1] = interleaved[frame * CHANNELS + 1] ?? 0;
    }
    write = (write + frames) | 0;
    Atomics.store(this.control, Slot.Write, write);
    return frames;
  }

  /** Drops every frame written so far (seek): the consumer skips to the current write index. */
  public reset(): void {
    Atomics.store(this.control, Slot.DiscardUntil, Atomics.load(this.control, Slot.Write));
    Atomics.add(this.control, Slot.ResetEpoch, 1);
  }

  public setPaused(paused: boolean): void {
    Atomics.store(this.control, Slot.Paused, paused ? 1 : 0);
  }

  /** Total frames the consumer has played. */
  public get consumed(): number {
    return Atomics.load(this.control, Slot.Read);
  }

  public get underruns(): number {
    return Atomics.load(this.control, Slot.Underruns);
  }
}

/** Consumer side (AudioWorklet). */
export class RingReader {
  private readonly control: Int32Array;
  private readonly samples: Float32Array;
  private readonly mask: number;
  private epoch = 0;

  public constructor(buffers: RingBuffers) {
    this.control = new Int32Array(buffers.control);
    this.samples = new Float32Array(buffers.samples);
    this.mask = buffers.capacity - 1;
  }

  /**
   * Fills `left`/`right` with up to their length in frames. Returns the frames taken from the ring
   * (the rest is silence). While paused nothing is consumed.
   */
  public read(left: Float32Array, right: Float32Array): number {
    const length = left.length;
    if (Atomics.load(this.control, Slot.Paused) === 1) {
      left.fill(0);
      right.fill(0);
      return 0;
    }
    let read = Atomics.load(this.control, Slot.Read);
    const epoch = Atomics.load(this.control, Slot.ResetEpoch);
    if (epoch !== this.epoch) {
      this.epoch = epoch;
      const discard = Atomics.load(this.control, Slot.DiscardUntil);
      if (distance(read, discard) > 0) read = discard;
    }
    const write = Atomics.load(this.control, Slot.Write);
    const available = Math.max(0, distance(read, write));
    const frames = Math.min(length, available);
    for (let frame = 0; frame < frames; frame++) {
      const source = ((read + frame) & this.mask) * CHANNELS;
      left[frame] = this.samples[source] ?? 0;
      right[frame] = this.samples[source + 1] ?? 0;
    }
    if (frames < length) {
      left.fill(0, frames);
      right.fill(0, frames);
      if (available === 0 && frames === 0) Atomics.add(this.control, Slot.Underruns, length);
    }
    Atomics.store(this.control, Slot.Read, (read + frames) | 0);
    return frames;
  }
}
