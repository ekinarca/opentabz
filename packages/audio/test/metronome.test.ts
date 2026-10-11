import { describe, expect, it } from 'vitest';
import {
  CLICK_TRACK_BARS,
  clickTrackBars,
  countInStart,
  DEFAULT_METRONOME,
  metronomeClicks,
  METRONOME_SOUNDS,
  type MetronomeSettings,
} from '../src/metronome.ts';

/** Bars of one meter: [startTick, numerator, denominator]. */
function grid(count: number, numerator = 4, denominator = 4, first = 0): Int32Array {
  const length = (numerator * 3840) / denominator;
  return Int32Array.from(
    Array.from({ length: count }, (_, index) => [first + index * length, numerator, denominator]).flat(),
  );
}

function settings(patch: Partial<MetronomeSettings>): MetronomeSettings {
  return { ...DEFAULT_METRONOME, ...patch };
}

describe('metronome clicks', () => {
  it('clicks every beat with an accent on the first', () => {
    const clicks = metronomeClicks(grid(2), 7680, DEFAULT_METRONOME);
    expect(clicks.map(click => click.tick)).toEqual([0, 960, 1920, 2880, 3840, 4800, 5760, 6720]);
    expect(clicks[0]).toEqual({ tick: 0, key: METRONOME_SOUNDS.click.accent, velocity: 127 });
    expect(clicks[1]).toEqual({ tick: 960, key: METRONOME_SOUNDS.click.normal, velocity: 96 });
    expect(clicks[4]?.velocity).toBe(127);
  });

  it('subdivides, swings, and clicks in half time', () => {
    const eighths = metronomeClicks(grid(1), 3840, settings({ subdivision: 2 }));
    expect(eighths.map(click => click.tick)).toEqual([0, 480, 960, 1440, 1920, 2400, 2880, 3360]);
    expect(eighths[1]?.velocity).toBe(58);
    const swung = metronomeClicks(grid(1), 3840, settings({ subdivision: 2, swing: 1 }));
    expect(swung.map(click => click.tick)).toEqual([0, 640, 960, 1600, 1920, 2560, 2880, 3520]);
    const triplets = metronomeClicks(grid(1), 3840, settings({ subdivision: 3 }));
    expect(triplets).toHaveLength(12);
    expect(triplets[1]?.tick).toBe(320);
    const half = metronomeClicks(grid(1), 3840, settings({ every: 2 }));
    expect(half.map(click => click.tick)).toEqual([0, 1920]);
  });

  it('follows a custom accent pattern, with silent beats', () => {
    const clicks = metronomeClicks(
      grid(1),
      3840,
      settings({ accent: 'pattern', pattern: ['accent', 'off', 'soft', 'normal'] }),
    );
    expect(clicks.map(click => [click.tick, click.velocity])).toEqual([
      [0, 127],
      [1920, 64],
      [2880, 96],
    ]);
    const plain = metronomeClicks(grid(1), 3840, settings({ accent: 'none' }));
    expect(new Set(plain.map(click => click.velocity))).toEqual(new Set([96]));
  });

  it('adds a polyrhythm voice spread evenly over the bar', () => {
    const clicks = metronomeClicks(grid(1), 3840, settings({ polyrhythm: 3 }));
    const poly = clicks.filter(click => click.key === METRONOME_SOUNDS.claves.normal);
    expect(poly.map(click => click.tick)).toEqual([0, 1280, 2560]);
  });

  it('evens out the loudness of the sounds with their gain', () => {
    const cowbell = metronomeClicks(grid(1), 3840, settings({ sound: 'cowbell' }));
    expect(cowbell.map(click => click.velocity)).toEqual([
      Math.round(127 * METRONOME_SOUNDS.cowbell.gain),
      Math.round(96 * METRONOME_SOUNDS.cowbell.gain),
      Math.round(96 * METRONOME_SOUNDS.cowbell.gain),
      Math.round(96 * METRONOME_SOUNDS.cowbell.gain),
    ]);
  });

  it('drops whole bars at random, never the first, and the same way every time', () => {
    const all = metronomeClicks(grid(8), 8 * 3840, settings({ beatDrop: 1 }));
    expect(all.every(click => click.tick < 3840)).toBe(true);
    const some = metronomeClicks(grid(64), 64 * 3840, settings({ beatDrop: 0.5 }), 7);
    const bars = new Set(some.map(click => Math.floor(click.tick / 3840)));
    expect(bars.size).toBeGreaterThan(10);
    expect(bars.size).toBeLessThan(54);
    expect(metronomeClicks(grid(64), 64 * 3840, settings({ beatDrop: 0.5 }), 7)).toEqual(some);
  });

  it('counts pickup bars from the end of their meter', () => {
    // A one-beat pickup in 3/4, then a full bar.
    const bars = Int32Array.from([0, 3, 4, 960, 3, 4]);
    const clicks = metronomeClicks(bars, 960 + 2880, DEFAULT_METRONOME);
    expect(clicks.map(click => [click.tick, click.velocity])).toEqual([
      [0, 96],
      [960, 127],
      [1920, 96],
      [2880, 96],
    ]);
  });
});

describe('click track', () => {
  it('is a run of bars of one meter', () => {
    const bars = clickTrackBars(6, 8);
    expect(bars.length).toBe(CLICK_TRACK_BARS * 3);
    expect([...bars.slice(0, 6)]).toEqual([0, 6, 8, 2880, 6, 8]);
  });
});

describe('count-in start', () => {
  it('snaps to the beat and counts the beats before it in the bar', () => {
    const bars = grid(4);
    expect(countInStart(bars, 4 * 3840, 0)).toEqual({ tick: 0, beatsBefore: 0, numerator: 4 });
    expect(countInStart(bars, 4 * 3840, 3840 + 2000)).toEqual({
      tick: 3840 + 1920,
      beatsBefore: 2,
      numerator: 4,
    });
    expect(countInStart(bars, 4 * 3840, 3 * 3840 + 2880)).toEqual({
      tick: 3 * 3840 + 2880,
      beatsBefore: 3,
      numerator: 4,
    });
    // A pickup of one beat in 3/4 starts on beat three.
    expect(countInStart(Int32Array.from([0, 3, 4, 960, 3, 4]), 3840, 100)).toEqual({
      tick: 0,
      beatsBefore: 2,
      numerator: 3,
    });
  });
});
