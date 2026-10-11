/**
 * Offline rendering through the real synth path (SynthHost, ring buffer, simulated AudioWorklet)
 * and the signal measurements the audio tests assert on.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { generatePlayback, openScore } from '@opentabz/core';
import { expect } from 'vitest';
import type { SynthCommand, SynthEvent } from '../src/protocol.ts';
import { createRingBuffers, RingReader, RingWriter } from '../src/ring.ts';
import { SynthHost } from '../src/synth-host.ts';

export const SAMPLE_RATE = 44100;
const QUANTUM = 128;
export const PING_FRAMES = 1024;

function soundFont(): ArrayBuffer {
  const require = createRequire(import.meta.url);
  const dist = dirname(require.resolve('@coderline/alphatab'));
  const bytes = readFileSync(join(dist, 'soundfont', 'sonivox.sf2'));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

export type Command = Exclude<SynthCommand, { type: 'init' }>;

export interface RenderOptions {
  /** Sent after the MIDI is loaded, before playing. */
  readonly before?: readonly Command[];
  /** Sent once the given number of seconds of audio has been played. */
  readonly schedule?: readonly { readonly at: number; readonly command: Command }[];
  /** Start playing after loading (default true). */
  readonly play?: boolean;
  /** Called after loading, with the host (to deliver more from the engine). */
  readonly afterLoad?: (host: SynthHost) => void;
}

/**
 * Plays a score (alphaTex; null for none, to send a click track in `before`) through the real
 * synth host and ring buffer, simulating the AudioWorklet.
 */
export async function renderOffline(
  tex: string | null,
  seconds: number,
  options: RenderOptions = {},
): Promise<{ left: Float32Array; right: Float32Array; events: SynthEvent[] }> {
  const events: SynthEvent[] = [];
  const host = new SynthHost(event => events.push(event));
  const buffers = createRingBuffers(1 << 15);
  host.init(SAMPLE_RATE, new RingWriter(buffers));
  host.handle({ type: 'loadSoundFont', bytes: soundFont() });
  if (tex !== null) {
    const { score } = openScore(new TextEncoder().encode(tex), 'test.atex');
    const playback = generatePlayback(score, 'test');
    host.receiveMidi({
      type: 'midi',
      playbackId: 'test',
      midi: playback.midi,
      tickShift: playback.tickShift,
      transpositionPitches: playback.transpositionPitches,
      bars: playback.bars,
      endTick: playback.timeline.endTick,
    });
  }
  await Promise.resolve();
  for (const command of options.before ?? []) host.handle(command);
  options.afterLoad?.(host);
  if (options.play !== false) host.handle({ type: 'play' });
  const schedule = [...(options.schedule ?? [])].sort((a, b) => a.at - b.at);

  const reader = new RingReader(buffers);
  const total = Math.ceil((seconds * SAMPLE_RATE) / QUANTUM) * QUANTUM;
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  let sincePing = 0;
  for (let offset = 0; offset < total; offset += QUANTUM) {
    while (schedule.length > 0 && (schedule[0]?.at ?? Infinity) * SAMPLE_RATE <= offset) {
      const next = schedule.shift();
      if (next !== undefined) host.handle(next.command);
    }
    reader.read(left.subarray(offset, offset + QUANTUM), right.subarray(offset, offset + QUANTUM));
    sincePing += QUANTUM;
    if (sincePing >= PING_FRAMES) {
      sincePing = 0;
      host.progress();
    }
  }
  // A voice without samples once rendered NaN (alphaTab patch 0007): every sample must be a number.
  const broken = [left, right].map(channel => channel.findIndex(value => !Number.isFinite(value)));
  expect(broken).toEqual([-1, -1]);
  return { left, right, events };
}

export function rms(samples: Float32Array): number {
  let sum = 0;
  for (const value of samples) sum += value * value;
  return Math.sqrt(sum / Math.max(1, samples.length));
}

/** Fundamental frequency by normalized autocorrelation, searched between 70 Hz and 1200 Hz. */
export function fundamental(samples: Float32Array): number {
  const minLag = Math.floor(SAMPLE_RATE / 1200);
  const maxLag = Math.ceil(SAMPLE_RATE / 70);
  let bestLag = minLag;
  let best = -Infinity;
  const correlation = (lag: number) => {
    let sum = 0;
    let energy = 0;
    for (let i = 0; i + lag < samples.length; i++) {
      sum += (samples[i] ?? 0) * (samples[i + lag] ?? 0);
      energy += (samples[i + lag] ?? 0) ** 2;
    }
    return energy > 0 ? sum / Math.sqrt(energy) : 0;
  };
  const values: number[] = [];
  for (let lag = minLag; lag <= maxLag; lag++) values[lag] = correlation(lag);
  // First strong peak: avoids picking a multiple of the period.
  const global = Math.max(...values.slice(minLag));
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    const value = values[lag] ?? 0;
    if (value > 0.85 * global && value >= (values[lag - 1] ?? 0) && value >= (values[lag + 1] ?? 0)) {
      bestLag = lag;
      best = value;
      break;
    }
  }
  if (best === -Infinity) return 0;
  // Parabolic interpolation around the peak.
  const a = values[bestLag - 1] ?? 0;
  const b = values[bestLag] ?? 0;
  const c = values[bestLag + 1] ?? 0;
  const shift = (a - c) / (2 * (a - 2 * b + c));
  return SAMPLE_RATE / (bestLag + (Number.isFinite(shift) ? shift : 0));
}

/** Power of one frequency (Goertzel). */
export function power(samples: Float32Array, frequency: number): number {
  const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / SAMPLE_RATE);
  let previous = 0;
  let beforePrevious = 0;
  for (const sample of samples) {
    const current = sample + coefficient * previous - beforePrevious;
    beforePrevious = previous;
    previous = current;
  }
  return (
    (previous * previous + beforePrevious * beforePrevious - coefficient * previous * beforePrevious) /
    samples.length
  );
}

export function window(samples: Float32Array, from: number, to: number): Float32Array {
  return samples.subarray(Math.floor(from * SAMPLE_RATE), Math.floor(to * SAMPLE_RATE));
}

/**
 * Times (in seconds) at which sound starts after near-silence: the first sample louder than
 * `level` after at least `gap` seconds without one.
 */
export function onsets(samples: Float32Array, level: number, gap = 0.1): number[] {
  const quiet = Math.round(gap * SAMPLE_RATE);
  const result: number[] = [];
  let lastLoud = -Infinity;
  for (let index = 0; index < samples.length; index++) {
    if (Math.abs(samples[index] ?? 0) <= level) continue;
    if (index - lastLoud > quiet) result.push(index / SAMPLE_RATE);
    lastLoud = index;
  }
  return result;
}

/**
 * Times (in seconds) at which a click starts: the first sample three times louder than anything
 * in the 50 ms before it. Works where `onsets` cannot, when a click starts while another rings.
 */
export function clickTimes(samples: Float32Array, floor = 0.01): number[] {
  const block = Math.round(SAMPLE_RATE / 1000);
  const peaks = new Float32Array(Math.ceil(samples.length / block));
  for (let index = 0; index < samples.length; index++) {
    const slot = Math.floor(index / block);
    peaks[slot] = Math.max(peaks[slot] ?? 0, Math.abs(samples[index] ?? 0));
  }
  const result: number[] = [];
  for (let slot = 0; slot < peaks.length; slot++) {
    let before = 0;
    for (let previous = Math.max(0, slot - 51); previous < slot - 1; previous++) {
      before = Math.max(before, peaks[previous] ?? 0);
    }
    const threshold = Math.max(floor, 3 * before);
    if ((peaks[slot] ?? 0) < threshold) continue;
    let index = slot * block;
    while (Math.abs(samples[index] ?? 0) < threshold) index++;
    result.push(index / SAMPLE_RATE);
    // One click per 100 ms at most.
    slot += 100;
  }
  return result;
}

/** The loudest sample between two times. */
export function peak(samples: Float32Array, from = 0, to = samples.length / SAMPLE_RATE): number {
  let loudest = 0;
  for (const value of window(samples, from, to)) loudest = Math.max(loudest, Math.abs(value));
  return loudest;
}
