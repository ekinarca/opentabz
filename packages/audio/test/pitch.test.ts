/**
 * The tuner's pitch detection (PRAC-100) and note arithmetic (PRAC-101, PRAC-102, PRAC-113):
 * pure tones and guitar-like tones across the range of guitars and basses, found to within a
 * cent; silence and noise found to have no pitch.
 */
import { describe, expect, it } from 'vitest';
import {
  chromaticTarget,
  detectPitch,
  frequencyOf,
  midiOf,
  noteLabel,
  PitchTracker,
  stringTarget,
} from '../src/pitch.ts';

const RATE = 48000;

/** A tone of `harmonics` (amplitude per harmonic, the first being the fundamental). */
function tone(
  frequency: number,
  length = 4096,
  harmonics: readonly number[] = [1],
  offset = 0,
): Float32Array {
  const samples = new Float32Array(length);
  for (let index = 0; index < length; index++) {
    const t = (index + offset) / RATE;
    let value = 0;
    harmonics.forEach((amplitude, harmonic) => {
      value += amplitude * Math.sin(2 * Math.PI * frequency * (harmonic + 1) * t + harmonic);
    });
    samples[index] = 0.3 * value;
  }
  return samples;
}

const cents = (measured: number, expected: number) => 1200 * Math.log2(measured / expected);

/** A plucked string's spectrum: a weak fundamental under strong second and third harmonics. */
const GUITAR = [0.35, 1, 0.8, 0.45, 0.3, 0.2, 0.12, 0.08];

describe('pitch detection', () => {
  it.each([
    ['B0 (five-string bass)', 30.868],
    ['E1 (bass)', 41.203],
    ['E2 (guitar, low E)', 82.407],
    ['A2', 110],
    ['G3', 195.998],
    ['E4 (guitar, high E)', 329.628],
    ['A4', 440],
    ['E6 (24th fret)', 1318.51],
  ])('finds %s to within a cent', (_, frequency) => {
    const reading = detectPitch(tone(frequency, frequency < 40 ? 8192 : 4096), RATE);
    expect(reading).not.toBeNull();
    expect(Math.abs(cents(reading?.frequency ?? 0, frequency))).toBeLessThan(1);
    expect(reading?.clarity).toBeGreaterThan(0.9);
  });

  it.each([82.407, 110, 146.832, 195.998, 246.942, 329.628])(
    'finds the fundamental of a plucked string at %d Hz, not an octave above',
    frequency => {
      for (const offset of [0, 1234, 9999]) {
        const reading = detectPitch(tone(frequency, 4096, GUITAR, offset), RATE);
        expect(Math.abs(cents(reading?.frequency ?? 0, frequency))).toBeLessThan(1.5);
      }
    },
  );

  it('measures a string a few cents out', () => {
    const sharp = frequencyOf(45.07);
    const reading = detectPitch(tone(sharp, 4096, GUITAR), RATE);
    expect(chromaticTarget(midiOf(reading?.frequency ?? 0)).cents).toBeCloseTo(7, 0);
  });

  it('hears no pitch in silence or noise', () => {
    expect(detectPitch(new Float32Array(4096), RATE)).toBeNull();
    let seed = 7;
    const noise = Float32Array.from({ length: 4096 }, () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return (seed / 0x7fffffff - 0.5) * 0.5;
    });
    expect(detectPitch(noise, RATE)).toBeNull();
  });
});

describe('notes and cents', () => {
  it('names notes in scientific pitch notation against any reference pitch', () => {
    expect(midiOf(440)).toBe(69);
    expect(noteLabel(midiOf(82.407))).toEqual({ name: 'E', octave: 2 });
    expect(noteLabel(61)).toEqual({ name: 'C♯', octave: 4 });
    // With A4 at 442 Hz, 440 Hz is about 7.9 cents flat.
    expect(chromaticTarget(midiOf(440, 442)).cents).toBeCloseTo(-7.85, 1);
    expect(frequencyOf(69, 415)).toBe(415);
  });

  it('aims at the nearest string of the tuning, whatever it is', () => {
    const standard = [64, 59, 55, 50, 45, 40];
    expect(stringTarget(midiOf(110.5), standard)).toMatchObject({ midi: 45, string: 4 });
    expect(stringTarget(midiOf(110.5), standard).cents).toBeCloseTo(7.85, 1);
    // Drop D: the low string is aimed at D2, even from an E.
    const dropD = [64, 59, 55, 50, 45, 38];
    expect(stringTarget(midiOf(82.4), dropD)).toMatchObject({ midi: 38, string: 5 });
    expect(stringTarget(midiOf(82.4), dropD).cents).toBeCloseTo(200, -1);
    expect(stringTarget(60, []).string).toBeNull();
  });
});

describe('steady readings', () => {
  const reading = (frequency: number, clarity = 0.97) => ({ frequency, clarity, level: 0.1 });

  it('take the median of the last clear readings, ignoring unclear ones', () => {
    const tracker = new PitchTracker();
    expect(tracker.push(reading(110), 0)).toBeCloseTo(45, 6);
    tracker.push(reading(110 * 2 ** (4 / 1200)), 50);
    tracker.push(reading(110 * 2 ** (-2 / 1200)), 100);
    // An outlier and an unclear frame move nothing.
    tracker.push(reading(110 * 2 ** (40 / 1200), 0.5), 150);
    const steady = tracker.push(reading(110 * 2 ** (1 / 1200)), 200) ?? 0;
    expect((steady - 45) * 100).toBeCloseTo(0.5, 1);
  });

  it('start afresh on another note and hold the last one a moment after the sound stops', () => {
    const tracker = new PitchTracker();
    tracker.push(reading(110), 0);
    tracker.push(reading(110), 50);
    expect(tracker.push(reading(146.832), 100)).toBeCloseTo(50, 3);
    expect(tracker.push(null, 500)).toBeCloseTo(50, 3);
    expect(tracker.push(null, 900)).toBeNull();
  });

  it('read against the reference pitch', () => {
    const tracker = new PitchTracker();
    expect(tracker.push(reading(442), 0, 442)).toBeCloseTo(69, 6);
  });
});
