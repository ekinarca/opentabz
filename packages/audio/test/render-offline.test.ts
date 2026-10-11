import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { generatePlayback, openScore } from '@opentabz/core';
import { describe, expect, it } from 'vitest';
import type { SynthEvent } from '../src/protocol.ts';
import { createRingBuffers, RingReader, RingWriter } from '../src/ring.ts';
import { SynthHost } from '../src/synth-host.ts';

const SAMPLE_RATE = 44100;
const QUANTUM = 128;
const PING_FRAMES = 1024;

function soundFont(): ArrayBuffer {
  const require = createRequire(import.meta.url);
  const dist = dirname(require.resolve('@coderline/alphatab'));
  const bytes = readFileSync(join(dist, 'soundfont', 'sonivox.sf2'));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

/** Plays a score through the real synth host and ring buffer, simulating the AudioWorklet. */
async function renderOffline(
  tex: string,
  seconds: number,
): Promise<{ left: Float32Array; events: SynthEvent[] }> {
  const events: SynthEvent[] = [];
  const host = new SynthHost(event => events.push(event));
  const buffers = createRingBuffers(1 << 15);
  host.init(SAMPLE_RATE, new RingWriter(buffers));
  host.handle({ type: 'loadSoundFont', bytes: soundFont() });
  const { score } = openScore(new TextEncoder().encode(tex), 'test.atex');
  const playback = generatePlayback(score, 'test');
  host.receiveMidi({
    type: 'midi',
    playbackId: 'test',
    midi: playback.midi,
    tickShift: playback.tickShift,
    transpositionPitches: playback.transpositionPitches,
  });
  await Promise.resolve();
  host.handle({ type: 'play' });

  const reader = new RingReader(buffers);
  const total = Math.ceil((seconds * SAMPLE_RATE) / QUANTUM) * QUANTUM;
  const left = new Float32Array(total);
  const right = new Float32Array(total);
  let sincePing = 0;
  for (let offset = 0; offset < total; offset += QUANTUM) {
    reader.read(left.subarray(offset, offset + QUANTUM), right.subarray(offset, offset + QUANTUM));
    sincePing += QUANTUM;
    if (sincePing >= PING_FRAMES) {
      sincePing = 0;
      host.progress();
    }
  }
  return { left, events };
}

function rms(samples: Float32Array): number {
  let sum = 0;
  for (const value of samples) sum += value * value;
  return Math.sqrt(sum / Math.max(1, samples.length));
}

/** Fundamental frequency by normalized autocorrelation, searched between 70 Hz and 1200 Hz. */
function fundamental(samples: Float32Array): number {
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

function window(samples: Float32Array, from: number, to: number): Float32Array {
  return samples.subarray(Math.floor(from * SAMPLE_RATE), Math.floor(to * SAMPLE_RATE));
}

describe('offline playback through the real synth path', () => {
  it('plays notes at the right pitch and time and stays silent during rests', async () => {
    const tex =
      '\\tempo 120\n\\track "Flute" {instrument flute}\n\\staff {score}\nA4.4 r.4 C5.4 r.4 | E5.2 r.2';
    const { left, events } = await renderOffline(tex, 3.2);
    expect(events.some(event => event.type === 'soundFontLoaded')).toBe(true);
    expect(events.some(event => event.type === 'midiLoaded')).toBe(true);
    expect(events.some(event => event.type === 'state' && event.playing)).toBe(true);

    const a4 = window(left, 0.1, 0.4);
    const rest = window(left, 0.75, 0.95);
    const c5 = window(left, 1.1, 1.4);
    const e5 = window(left, 2.1, 2.8);
    expect(rms(a4)).toBeGreaterThan(0.01);
    expect(fundamental(a4)).toBeGreaterThan(440 * 0.98);
    expect(fundamental(a4)).toBeLessThan(440 * 1.02);
    expect(fundamental(c5)).toBeGreaterThan(523.25 * 0.98);
    expect(fundamental(c5)).toBeLessThan(523.25 * 1.02);
    expect(fundamental(e5)).toBeGreaterThan(659.26 * 0.98);
    expect(fundamental(e5)).toBeLessThan(659.26 * 1.02);
    expect(rms(rest)).toBeLessThan(rms(a4) / 4);
  });

  it('reports positions that advance with the audio', async () => {
    const { events } = await renderOffline(
      '\\tempo 120\n\\track "Flute" {instrument flute}\n\\staff {score}\nA4.1 | A4.1',
      2,
    );
    const positions = events.filter(event => event.type === 'position');
    expect(positions.length).toBeGreaterThan(20);
    const last = positions.at(-1);
    // About two seconds in at 120 BPM: two quarters per second, 960 ticks per quarter.
    expect(last?.time).toBeGreaterThan(1500);
    expect(last?.tick).toBeGreaterThan(2.8 * 960);
  });
});
