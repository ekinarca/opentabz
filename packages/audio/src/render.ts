/**
 * Audio export: a song rendered faster than real time through the same path as playback (the
 * synth host with its mixer, metronome, count-in and speed, writing to a ring), read out until
 * the song ends. Nothing is padded: frames are taken as the synthesizer makes them.
 */
import type { MidiDelivery, TickRange } from '@opentabz/core/shared';
import type { SynthCommand } from './protocol.ts';
import { createRingBuffers, RingReader, RingWriter } from './ring.ts';
import { SynthHost } from './synth-host.ts';

export type RenderCommand = Exclude<SynthCommand, { type: 'init' } | { type: 'connectWorklet' }>;

export interface RenderRequest {
  readonly sampleRate: number;
  readonly soundFont: ArrayBuffer;
  readonly song: MidiDelivery;
  /** The mixer, speed, metronome and count-in, as playback sends them. */
  readonly commands: readonly RenderCommand[];
  /** Only these ticks (a selection), or the whole song. */
  readonly range: TickRange | null;
}

export interface RenderedAudio {
  readonly sampleRate: number;
  readonly left: Float32Array;
  readonly right: Float32Array;
}

export interface RenderHooks {
  /** How far the render is, from 0 to 1. */
  readonly progress?: (fraction: number) => void;
  /** Checked between chunks: true stops the render. */
  readonly cancelled?: () => boolean;
  /** Gives other work a turn between chunks (a worker answering messages). */
  readonly yield?: () => Promise<void>;
}

export class RenderCancelled extends Error {
  public constructor() {
    super('The export was cancelled.');
    this.name = 'RenderCancelled';
  }
}

const QUANTUM = 128;
const CHUNK_SECONDS = 2;
/** Rendering stops if the song has not finished this long after its own end (a safety net). */
const OVERRUN_SECONDS = 30;
/** Requests in a row that bring no samples before the render gives up. */
const MAX_IDLE = 10_000;

/** Growable stereo sample storage. */
class Samples {
  private chunks: Float32Array[] = [];
  private current: Float32Array;
  private used = 0;

  public constructor(private readonly chunkFrames: number) {
    this.current = new Float32Array(chunkFrames * 2);
  }

  public push(left: Float32Array, right: Float32Array, frames: number): void {
    for (let frame = 0; frame < frames; frame++) {
      if (this.used === this.current.length) {
        this.chunks.push(this.current);
        this.current = new Float32Array(this.chunkFrames * 2);
        this.used = 0;
      }
      this.current[this.used++] = left[frame] ?? 0;
      this.current[this.used++] = right[frame] ?? 0;
    }
  }

  public get frames(): number {
    return (this.chunks.length * this.chunkFrames * 2 + this.used) / 2;
  }

  public split(): { left: Float32Array; right: Float32Array } {
    const left = new Float32Array(this.frames);
    const right = new Float32Array(this.frames);
    let frame = 0;
    for (const chunk of [...this.chunks, this.current.subarray(0, this.used)]) {
      for (let index = 0; index + 1 < chunk.length; index += 2) {
        left[frame] = chunk[index] ?? 0;
        right[frame] = chunk[index + 1] ?? 0;
        frame++;
      }
    }
    return { left, right };
  }
}

export async function renderSong(request: RenderRequest, hooks: RenderHooks = {}): Promise<RenderedAudio> {
  // What the synthesizer reports, set from its events.
  const heard: { finished: boolean; failure: string | null; time: number; endTime: number } = {
    finished: false,
    failure: null,
    time: 0,
    endTime: 0,
  };
  const host = new SynthHost(event => {
    if (event.type === 'finished') heard.finished = true;
    else if (event.type === 'error') heard.failure = `${event.context}: ${event.message}`;
    else if (event.type === 'position') {
      heard.time = event.time;
      heard.endTime = event.endTime;
    }
  });
  const buffers = createRingBuffers(1 << 15);
  host.init(request.sampleRate, new RingWriter(buffers));
  host.handle({ type: 'loadSoundFont', bytes: request.soundFont });
  host.receiveMidi(request.song);
  await Promise.resolve();
  for (const command of request.commands) host.handle(command);
  if (request.range !== null) {
    host.handle({ type: 'setLoop', enabled: false, range: request.range, id: 0 });
    host.handle({ type: 'seek', tick: request.range.startTick, id: 0 });
  }
  host.handle({ type: 'play' });

  const reader = new RingReader(buffers);
  const samples = new Samples(request.sampleRate * CHUNK_SECONDS);
  const left = new Float32Array(QUANTUM);
  const right = new Float32Array(QUANTUM);
  const startTime = heard.time;
  let sinceYield = 0;
  let idle = 0;
  for (;;) {
    if (heard.failure !== null) throw new Error(heard.failure);
    const frames = reader.read(left, right);
    if (frames > 0) {
      samples.push(left, right, frames);
      idle = 0;
    }
    if (frames < QUANTUM) {
      // The synthesizer makes more when asked; once the song has finished, a dry ring is the end.
      if (heard.finished && frames === 0) break;
      host.progress();
      if (frames === 0 && ++idle > MAX_IDLE) throw new Error('The synthesizer stopped making sound.');
      continue;
    }
    sinceYield += frames;
    if (sinceYield < request.sampleRate * CHUNK_SECONDS) continue;
    sinceYield = 0;
    const span = Math.max(1, heard.endTime - startTime);
    if (heard.endTime > 0) hooks.progress?.(Math.min(1, (heard.time - startTime) / span));
    await hooks.yield?.();
    if (hooks.cancelled?.() === true) throw new RenderCancelled();
    if (heard.endTime > 0 && samples.frames > (span / 1000 + OVERRUN_SECONDS) * request.sampleRate) break;
  }
  hooks.progress?.(1);
  return { sampleRate: request.sampleRate, ...samples.split() };
}
