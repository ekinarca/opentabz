/**
 * Pitch detection for the tuner (PRAC-100): YIN (de Cheveigné and Kawahara, 2002) on a frame of
 * microphone samples, its difference function computed through an FFT cross-correlation, so a
 * 4096-sample frame takes a fraction of a millisecond. Parabolic interpolation around the dip
 * gives the period to a hundredth of a sample, a cent or better across a guitar's range.
 *
 * Also the arithmetic of notes and cents, against a reference pitch (PRAC-113), a chromatic
 * scale or the strings of a tuning (PRAC-102).
 */

export interface PitchOptions {
  /** Lowest and highest frequencies looked for, in hertz. */
  readonly minFrequency?: number;
  readonly maxFrequency?: number;
  /** Dips of the normalized difference below this count as periodic (YIN's threshold). */
  readonly threshold?: number;
  /** Frames quieter than this (RMS, full scale 1) are silence. */
  readonly minLevel?: number;
}

export interface PitchReading {
  /** Hertz. */
  readonly frequency: number;
  /** How periodic the frame is, from 0 to 1 (1 minus YIN's dip). */
  readonly clarity: number;
  /** RMS level of the frame. */
  readonly level: number;
}

/** Guitar, bass and voice: from a five-string bass's low B (31 Hz) to the 24th fret of high E. */
export const DEFAULT_MIN_FREQUENCY = 27;
export const DEFAULT_MAX_FREQUENCY = 1600;
const DEFAULT_THRESHOLD = 0.15;
const DEFAULT_MIN_LEVEL = 0.002;

/** In-place radix-2 FFT of `re` + i·`im` (length a power of two); `inverse` without scaling. */
function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i] ?? 0;
      re[i] = re[j] ?? 0;
      re[j] = tr;
      const ti = im[i] ?? 0;
      im[i] = im[j] ?? 0;
      im[j] = ti;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / size;
    const stepRe = Math.cos(angle);
    const stepIm = Math.sin(angle);
    const half = size >> 1;
    for (let start = 0; start < n; start += size) {
      let wRe = 1;
      let wIm = 0;
      for (let k = 0; k < half; k++) {
        const a = start + k;
        const b = a + half;
        const bRe = re[b] ?? 0;
        const bIm = im[b] ?? 0;
        const tRe = bRe * wRe - bIm * wIm;
        const tIm = bRe * wIm + bIm * wRe;
        const aRe = re[a] ?? 0;
        const aIm = im[a] ?? 0;
        re[a] = aRe + tRe;
        im[a] = aIm + tIm;
        re[b] = aRe - tRe;
        im[b] = aIm - tIm;
        const nextRe = wRe * stepRe - wIm * stepIm;
        wIm = wRe * stepIm + wIm * stepRe;
        wRe = nextRe;
      }
    }
  }
}

/**
 * The fundamental frequency of a frame, or null for silence and sounds without a clear pitch.
 * The frame should hold at least two periods of the lowest frequency looked for.
 */
export function detectPitch(
  samples: Float32Array,
  sampleRate: number,
  options: PitchOptions = {},
): PitchReading | null {
  const length = samples.length;
  const window = length >> 1;
  if (window < 2) return null;
  let energy = 0;
  for (const sample of samples) energy += sample * sample;
  const level = Math.sqrt(energy / length);
  if (level < (options.minLevel ?? DEFAULT_MIN_LEVEL)) return null;

  // Cross-correlation of the first half with the whole frame, through the FFT.
  let size = 1;
  while (size < length + window) size <<= 1;
  const aRe = new Float64Array(size);
  const aIm = new Float64Array(size);
  const bRe = new Float64Array(size);
  const bIm = new Float64Array(size);
  for (let index = 0; index < length; index++) {
    const value = samples[index] ?? 0;
    bRe[index] = value;
    if (index < window) aRe[index] = value;
  }
  fft(aRe, aIm, false);
  fft(bRe, bIm, false);
  for (let index = 0; index < size; index++) {
    // conj(A) · B
    const re = (aRe[index] ?? 0) * (bRe[index] ?? 0) + (aIm[index] ?? 0) * (bIm[index] ?? 0);
    const im = (aRe[index] ?? 0) * (bIm[index] ?? 0) - (aIm[index] ?? 0) * (bRe[index] ?? 0);
    aRe[index] = re;
    aIm[index] = im;
  }
  fft(aRe, aIm, true);

  // YIN's difference d(τ) = Σ x_j² + Σ x_{j+τ}² − 2 Σ x_j·x_{j+τ}, then its cumulative mean
  // normalized form d'(τ).
  const squares = new Float64Array(length + 1);
  for (let index = 0; index < length; index++) {
    const value = samples[index] ?? 0;
    squares[index + 1] = (squares[index] ?? 0) + value * value;
  }
  const first = squares[window] ?? 0;
  const maxLag = Math.min(
    window - 1,
    Math.ceil(sampleRate / (options.minFrequency ?? DEFAULT_MIN_FREQUENCY)),
  );
  const minLag = Math.max(2, Math.floor(sampleRate / (options.maxFrequency ?? DEFAULT_MAX_FREQUENCY)));
  const normalized = new Float64Array(maxLag + 2);
  normalized[0] = 1;
  let running = 0;
  for (let lag = 1; lag <= maxLag + 1 && lag < window; lag++) {
    const shifted = (squares[lag + window] ?? 0) - (squares[lag] ?? 0);
    const difference = Math.max(0, first + shifted - (2 * (aRe[lag] ?? 0)) / size);
    running += difference;
    normalized[lag] = running > 0 ? (difference * lag) / running : 1;
  }

  // The first dip below the threshold, followed to its bottom; else the deepest dip.
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  let lag = -1;
  for (let candidate = minLag; candidate <= maxLag; candidate++) {
    if ((normalized[candidate] ?? 1) < threshold) {
      while (candidate + 1 <= maxLag && (normalized[candidate + 1] ?? 1) < (normalized[candidate] ?? 1)) {
        candidate++;
      }
      lag = candidate;
      break;
    }
  }
  if (lag < 0) return null;

  // The bottom of the parabola through the dip and its neighbours.
  const before = normalized[lag - 1] ?? 1;
  const at = normalized[lag] ?? 1;
  const after = normalized[lag + 1] ?? 1;
  const curvature = before - 2 * at + after;
  const shift = curvature > 0 ? (before - after) / (2 * curvature) : 0;
  const period = lag + Math.max(-1, Math.min(1, shift));
  return { frequency: sampleRate / period, clarity: Math.max(0, Math.min(1, 1 - at)), level };
}

export const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;

/** A frequency as a (fractional) MIDI note number, against the pitch of A4. */
export function midiOf(frequency: number, a4 = 440): number {
  return 69 + 12 * Math.log2(frequency / a4);
}

/** The frequency of a (fractional) MIDI note number. */
export function frequencyOf(midi: number, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

/** A note's name and octave in scientific pitch notation (middle C is C4). */
export function noteLabel(midi: number): { readonly name: string; readonly octave: number } {
  const note = Math.round(midi);
  return { name: NOTE_NAMES[((note % 12) + 12) % 12] ?? 'C', octave: Math.floor(note / 12) - 1 };
}

export interface TuningTarget {
  /** The MIDI note aimed at. */
  readonly midi: number;
  /** How far the sound is from it, in cents (positive: sharp). */
  readonly cents: number;
  /** The string aimed at, as an index into the tuning, or null on the chromatic scale. */
  readonly string: number | null;
}

/** The nearest note of the chromatic scale. */
export function chromaticTarget(midi: number): TuningTarget {
  const note = Math.round(midi);
  return { midi: note, cents: (midi - note) * 100, string: null };
}

/** The open string nearest in pitch (strings as MIDI notes, in any order). */
export function stringTarget(midi: number, strings: readonly number[]): TuningTarget {
  let best: TuningTarget | null = null;
  for (const [index, string] of strings.entries()) {
    const cents = (midi - string) * 100;
    if (best === null || Math.abs(cents) < Math.abs(best.cents))
      best = { midi: string, cents, string: index };
  }
  return best ?? chromaticTarget(midi);
}

/** Readings clearer than this are trusted. */
const MIN_CLARITY = 0.85;
/** Readings kept for the median. */
const HISTORY = 7;
/** How long the last note stays shown after the sound stops, in milliseconds. */
const HOLD_MS = 700;

/**
 * A steady reading from frame-by-frame estimates: the median of the last few clear ones, starting
 * afresh when another note is played, and held a moment after the sound dies away.
 */
export class PitchTracker {
  private history: number[] = [];
  private lastHeard = Number.NEGATIVE_INFINITY;

  /** Takes a frame's reading (null: no pitch) at `time` (ms); returns the note as a MIDI number, or null. */
  public push(reading: PitchReading | null, time: number, a4 = 440): number | null {
    if (reading !== null && reading.clarity >= MIN_CLARITY) {
      const midi = midiOf(reading.frequency, a4);
      const current = this.median();
      // Another note: the old readings no longer count.
      if (current !== null && Math.abs(midi - current) > 0.6) this.history = [];
      this.history.push(midi);
      if (this.history.length > HISTORY) this.history.shift();
      this.lastHeard = time;
    } else if (time - this.lastHeard > HOLD_MS) {
      this.history = [];
    }
    return this.median();
  }

  public reset(): void {
    this.history = [];
    this.lastHeard = Number.NEGATIVE_INFINITY;
  }

  private median(): number | null {
    if (this.history.length === 0) return null;
    const sorted = [...this.history].sort((a, b) => a - b);
    const middle = sorted.length >> 1;
    return sorted.length % 2 === 1
      ? (sorted[middle] ?? 0)
      : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  }
}
