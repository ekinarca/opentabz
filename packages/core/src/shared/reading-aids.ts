/**
 * Reading aids written into the score (VIEW-009, REND-306, REND-317): the letter names of the
 * notes above them, and the beat counts ("1 e & a") under them.
 */

export const NOTE_NAMES = ['off', 'letters', 'octaves'] as const;
export type NoteNames = (typeof NOTE_NAMES)[number];

export interface ReadingAids {
  readonly noteNames: NoteNames;
  readonly counts: boolean;
}

export function sameReadingAids(a: ReadingAids | undefined, b: ReadingAids | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.noteNames === b.noteNames && a.counts === b.counts;
}

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A pitch's letter name, spelled with flats in flat keys, with its octave if asked (C4 = 60). */
export function noteName(pitch: number, flats: boolean, octave: boolean): string {
  const pitchClass = ((pitch % 12) + 12) % 12;
  const name = (flats ? FLATS : SHARPS)[pitchClass] ?? '?';
  return octave ? `${name}${Math.floor(pitch / 12) - 1}` : name;
}

const NEAR = 0.01;

/**
 * How a beat starting `ticks` into its bar is counted, in beats of the meter (`unit` ticks each):
 * the beat's number on it, "&" half way, "e" and "a" on the sixteenths between, "trip" and "let"
 * on triplets; nothing finer.
 */
export function countAt(ticks: number, unit: number): string {
  const position = ticks / unit;
  const beat = Math.floor(position + NEAR);
  const fraction = position - beat;
  const near = (target: number) => Math.abs(fraction - target) < NEAR;
  if (near(0)) return String(beat + 1);
  if (near(1 / 2)) return '&';
  if (near(1 / 4)) return 'e';
  if (near(3 / 4)) return 'a';
  if (near(1 / 3)) return 'trip';
  if (near(2 / 3)) return 'let';
  return '';
}
