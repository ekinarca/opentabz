import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { EngineHost, generatePlayback, openScore } from '@opentabz/core';
import type { SynthDelivery } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import type { SynthCommand, SynthEvent } from '../src/protocol.ts';
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

type Command = Exclude<SynthCommand, { type: 'init' }>;

interface RenderOptions {
  /** Sent after the MIDI is loaded, before playing. */
  readonly before?: readonly Command[];
  /** Sent once the given number of seconds of audio has been played. */
  readonly schedule?: readonly { readonly at: number; readonly command: Command }[];
  /** Start playing after loading (default true). */
  readonly play?: boolean;
  /** Called after loading, with the host (to deliver more from the engine). */
  readonly afterLoad?: (host: SynthHost) => void;
}

/** Plays a score through the real synth host and ring buffer, simulating the AudioWorklet. */
async function renderOffline(
  tex: string,
  seconds: number,
  options: RenderOptions = {},
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

/** Power of one frequency (Goertzel). */
function power(samples: Float32Array, frequency: number): number {
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

  // Three bars at 120 BPM in 4/4: two seconds each, one pitch per bar.
  const BARS = '\\tempo 120\n\\track "Flute" {instrument flute}\n\\staff {score}\nA4.1 | C5.1 | E5.1';
  const BAR_TICKS = 4 * 960;

  it('loops a range: starts at its beginning and never plays past its end', async () => {
    const range = { startTick: BAR_TICKS, endTick: 2 * BAR_TICKS };
    const { left, events } = await renderOffline(BARS, 6.2, {
      before: [{ type: 'setLoop', enabled: true, range, id: 1 }],
    });
    for (const start of [0.2, 2.2, 4.2]) {
      const pitch = fundamental(window(left, start, start + 0.5));
      expect(pitch).toBeGreaterThan(523.25 * 0.98);
      expect(pitch).toBeLessThan(523.25 * 1.02);
    }
    const started = events.findIndex(event => event.type === 'state' && event.playing);
    const ticks = events.slice(started).flatMap(event => (event.type === 'position' ? [event.tick] : []));
    expect(ticks.length).toBeGreaterThan(20);
    expect(Math.min(...ticks)).toBeGreaterThanOrEqual(range.startTick);
    // Positions are reported per audio block, so the last one before wrapping may be a block late.
    const blockTicks = ((PING_FRAMES / SAMPLE_RATE) * 1000 * 960) / 500;
    expect(Math.max(...ticks)).toBeLessThanOrEqual(range.endTick + blockTicks);
    // Nothing of the following bar (E5) leaks into the wrap.
    for (const wrap of [2, 4]) {
      const around = window(left, wrap - 0.05, wrap + 0.15);
      expect(power(around, 659.26)).toBeLessThan(power(around, 523.25) / 20);
    }
    expect(events.filter(event => event.type === 'finished').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the playhead when a range is adjusted around it and jumps when it is not', async () => {
    const { events } = await renderOffline(BARS, 2.6, {
      before: [{ type: 'setLoop', enabled: true, range: { startTick: 0, endTick: 2 * BAR_TICKS }, id: 1 }],
      schedule: [
        // Widened around the playhead (about 0.75 bars in): playback continues.
        {
          at: 1.5,
          command: { type: 'setLoop', enabled: true, range: { startTick: 0, endTick: 3 * BAR_TICKS }, id: 2 },
        },
        // Moved away from the playhead: playback jumps to the new start.
        {
          at: 2.2,
          command: {
            type: 'setLoop',
            enabled: true,
            range: { startTick: 2 * BAR_TICKS, endTick: 3 * BAR_TICKS },
            id: 3,
          },
        },
      ],
    });
    const positions = events.flatMap(event => (event.type === 'position' ? [event] : []));
    const afterWiden = positions.find(event => event.time > 1500 && event.isSeek);
    expect(afterWiden?.tick ?? 0).toBeGreaterThan(0.6 * BAR_TICKS);
    const last = positions.at(-1);
    expect(last?.tick ?? 0).toBeGreaterThanOrEqual(2 * BAR_TICKS);
  });

  it('acknowledges moves with the new position, after the position events of the old one', async () => {
    const { events } = await renderOffline(BARS, 1.5, {
      schedule: [{ at: 0.5, command: { type: 'seek', tick: 2 * BAR_TICKS, id: 7 } }],
    });
    const index = events.findIndex(event => event.type === 'moved');
    const moved = events[index];
    if (moved?.type !== 'moved') throw new Error('no moved event');
    expect(moved.id).toBe(7);
    expect(moved.tick).toBe(2 * BAR_TICKS);
    expect(moved.tempo).toBeGreaterThan(0);
    // Every position reported afterwards is at or past the new position.
    const later = events.slice(index + 1).flatMap(event => (event.type === 'position' ? [event.tick] : []));
    expect(later.length).toBeGreaterThan(0);
    expect(Math.min(...later)).toBeGreaterThanOrEqual(2 * BAR_TICKS);
  });

  // Two flutes on their own channels: A4 (440 Hz) and E5 (659 Hz).
  const DUET =
    '\\tempo 120\n\\track "One" {instrument flute}\n\\staff {score}\nA4.1 | A4.1\n\\track "Two" {instrument flute}\n\\staff {score}\nE5.1 | E5.1';

  it('mutes, solos and turns down channels in the mixer', async () => {
    const window1 = (left: Float32Array) => window(left, 0.3, 1.3);
    const open = window1((await renderOffline(DUET, 1.5)).left);
    const muted = window1(
      (
        await renderOffline(DUET, 1.5, {
          before: [
            { type: 'setChannelMute', channel: 0, value: true },
            { type: 'setChannelMute', channel: 1, value: true },
          ],
        })
      ).left,
    );
    const soloed = window1(
      (
        await renderOffline(DUET, 1.5, {
          before: [
            { type: 'setChannelSolo', channel: 0, value: true },
            { type: 'setChannelSolo', channel: 1, value: true },
          ],
        })
      ).left,
    );
    const quieter = window1(
      (
        await renderOffline(DUET, 1.5, {
          before: [
            { type: 'setChannelVolume', channel: 2, value: 0.25 },
            { type: 'setChannelVolume', channel: 3, value: 0.25 },
          ],
        })
      ).left,
    );
    const a = (samples: Float32Array) => power(samples, 440);
    const e = (samples: Float32Array) => power(samples, 659.26);
    expect(a(open)).toBeGreaterThan(0);
    expect(e(open)).toBeGreaterThan(0);
    // Muting track one silences A4 and leaves E5.
    expect(a(muted)).toBeLessThan(a(open) / 100);
    expect(e(muted)).toBeGreaterThan(e(open) / 2);
    // Soloing track one silences E5 and leaves A4.
    expect(e(soloed)).toBeLessThan(e(open) / 100);
    expect(a(soloed)).toBeGreaterThan(a(open) / 2);
    // A quarter of the level is a sixteenth of the power or less.
    expect(e(quieter)).toBeLessThan(e(open) / 8);
    expect(a(quieter)).toBeGreaterThan(a(open) / 2);
    // The master volume scales everything.
    const master = window1(
      (await renderOffline(DUET, 1.5, { before: [{ type: 'setMasterVolume', value: 0.25 }] })).left,
    );
    expect(a(master)).toBeLessThan(a(open) / 8);
    expect(e(master)).toBeLessThan(e(open) / 8);
  });

  it('slows down without changing the pitch', async () => {
    const tex = '\\tempo 120\n\\track "Flute" {instrument flute}\n\\staff {score}\nA4.4 r.4 C5.4 r.4';
    const { left } = await renderOffline(tex, 3.4, { before: [{ type: 'setSpeed', value: 0.5 }] });
    // At half speed every beat lasts a second: A4 from 0 s, C5 from 2 s.
    const a4 = fundamental(window(left, 0.2, 0.8));
    const c5 = fundamental(window(left, 2.2, 2.8));
    expect(a4).toBeGreaterThan(440 * 0.98);
    expect(a4).toBeLessThan(440 * 1.02);
    expect(c5).toBeGreaterThan(523.25 * 0.98);
    expect(c5).toBeLessThan(523.25 * 1.02);
    expect(rms(window(left, 1.3, 1.8))).toBeLessThan(rms(window(left, 0.2, 0.8)) / 4);
  });

  it('sounds a stepped beat once without moving the song position', async () => {
    const engine = new EngineHost();
    const deliveries: SynthDelivery[] = [];
    engine.connectSynth({ port: { postMessage: message => deliveries.push(message) } });
    const opened = engine.open({ name: 'duet.atex', bytes: new TextEncoder().encode(DUET).buffer });
    if (!opened.ok) throw new Error('duet did not open');
    const timeline = engine.preparePlayback({ docId: opened.summary.id, playbackId: 'p' });
    const firstBeats = new Set<number>();
    for (let index = 0; index < timeline.items.length; index += 3) {
      if (timeline.items[index + 2] === 0) firstBeats.add(timeline.items[index] ?? -1);
    }
    engine.previewBeats({ docId: opened.summary.id, beatIds: [...firstBeats] });
    const preview = deliveries.find(delivery => delivery.type === 'preview');
    if (preview === undefined) throw new Error('no preview');
    const { left, events } = await renderOffline(DUET, 1, {
      play: false,
      afterLoad: host => {
        host.receive(preview);
      },
    });
    const chord = window(left, 0.1, 0.6);
    expect(power(chord, 440)).toBeGreaterThan(0);
    expect(power(chord, 659.26)).toBeGreaterThan(0);
    expect(fundamental(window(left, 0.1, 0.6))).toBeGreaterThan(0);
    // The song stays where it was (alphaTab's time-to-tick conversion may round by a tick).
    expect(events.some(event => event.type === 'position' && event.tick > 2)).toBe(false);
    expect(events.some(event => event.type === 'state' && event.playing)).toBe(false);
  });
});
