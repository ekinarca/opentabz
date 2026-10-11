/**
 * Notes coloured to read the music by (REND-300…REND-303, REND-316): by the string they are
 * played on, by their interval above the key's tonic, by their degree in the key, or by the part
 * they play in the chord above them. Palettes come in standard colours and colour-blind safe ones
 * (Okabe and Ito's, then Paul Tol's), and string colours can be one's own.
 */
import { readChordName } from './chord-spelling.ts';

export const NOTE_COLOR_MODES = ['off', 'string', 'interval', 'degree', 'chordTone'] as const;
export type NoteColorMode = (typeof NOTE_COLOR_MODES)[number];

export const NOTE_PALETTES = ['standard', 'colorBlind', 'custom'] as const;
export type NotePalette = (typeof NOTE_PALETTES)[number];

/** What the engine colours: a mode, and the colour of each of its classes. */
export interface NoteColoring {
  readonly mode: Exclude<NoteColorMode, 'off'>;
  readonly colors: readonly string[];
}

/** Strings from the lowest up (the lowest E first on a guitar). */
export const STRING_COLORS: Readonly<Record<Exclude<NotePalette, 'custom'>, readonly string[]>> = {
  standard: ['#E53935', '#F9A825', '#1E88E5', '#FB8C00', '#43A047', '#8E24AA', '#00ACC1', '#D81B60'],
  colorBlind: ['#D55E00', '#E69F00', '#0072B2', '#F0E442', '#009E73', '#CC79A7', '#56B4E9', '#999999'],
};

/** Semitones above the tonic, from the unison to the major seventh. */
export const INTERVAL_COLORS: Readonly<Record<Exclude<NotePalette, 'custom'>, readonly string[]>> = {
  standard: [
    '#E53935',
    '#F4511E',
    '#FB8C00',
    '#F9A825',
    '#C0CA33',
    '#43A047',
    '#00897B',
    '#00ACC1',
    '#1E88E5',
    '#3949AB',
    '#8E24AA',
    '#D81B60',
  ],
  colorBlind: [
    '#D55E00',
    '#882255',
    '#E69F00',
    '#CC79A7',
    '#F0E442',
    '#009E73',
    '#999999',
    '#44AA99',
    '#56B4E9',
    '#DDCC77',
    '#0072B2',
    '#117733',
  ],
};

/** Degrees one to seven of the key, then the notes outside it. */
export const DEGREE_COLORS: Readonly<Record<Exclude<NotePalette, 'custom'>, readonly string[]>> = {
  standard: ['#E53935', '#FB8C00', '#F9A825', '#43A047', '#1E88E5', '#3949AB', '#8E24AA', '#9E9E9E'],
  colorBlind: ['#D55E00', '#E69F00', '#F0E442', '#009E73', '#56B4E9', '#0072B2', '#CC79A7', '#999999'],
};

export const CHORD_TONES = ['root', 'third', 'fifth', 'seventh', 'other'] as const;
export type ChordTone = (typeof CHORD_TONES)[number];

/** Root, third, fifth, seventh, and the chord's other notes. */
export const CHORD_TONE_COLORS: Readonly<Record<Exclude<NotePalette, 'custom'>, readonly string[]>> = {
  standard: ['#E53935', '#1E88E5', '#43A047', '#8E24AA', '#FB8C00'],
  colorBlind: ['#D55E00', '#0072B2', '#009E73', '#CC79A7', '#E69F00'],
};

export function sameColoring(a: NoteColoring | undefined, b: NoteColoring | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return (
    a.mode === b.mode &&
    a.colors.length === b.colors.length &&
    a.colors.every((color, index) => color === b.colors[index])
  );
}

/** The colours of a mode's classes in a palette; one's own colours are the strings'. */
export function noteColors(
  mode: Exclude<NoteColorMode, 'off'>,
  palette: NotePalette,
  ownStrings: readonly string[],
): readonly string[] {
  const named = palette === 'custom' ? 'standard' : palette;
  switch (mode) {
    case 'string':
      return palette === 'custom' && ownStrings.length > 0 ? ownStrings : STRING_COLORS[named];
    case 'interval':
      return INTERVAL_COLORS[named];
    case 'degree':
      return DEGREE_COLORS[named];
    case 'chordTone':
      return CHORD_TONE_COLORS[named];
  }
}

const mod12 = (value: number) => ((value % 12) + 12) % 12;

/** The tonic of a key from its sharps (positive) or flats (negative), as a pitch class. */
export function tonicOf(keySignature: number, minor: boolean): number {
  return mod12(keySignature * 7 + (minor ? 9 : 0));
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

/** A note's degree in the key, 0 for the tonic up to 6, or null outside the key. */
export function degreeOf(pitch: number, tonic: number, minor: boolean): number | null {
  const step = (minor ? MINOR : MAJOR).indexOf(mod12(pitch - tonic));
  return step < 0 ? null : step;
}

const LETTERS: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** The pitch class of a chord name's root, or null when the name cannot be read. */
export function rootPitchClass(name: string): number | null {
  const chord = readChordName(name);
  if (chord === null) return null;
  const letter = LETTERS[chord.root.charAt(0)];
  if (letter === undefined) return null;
  const accidental = chord.root.slice(1);
  return mod12(letter + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0));
}

/**
 * The part a note plays in a chord: its root, third, fifth or seventh, another of its notes, or
 * null when it is not in the chord (or the chord's notes are not known).
 */
export function chordToneOf(
  pitch: number,
  root: number,
  chordPitches: ReadonlySet<number>,
): ChordTone | null {
  const pitchClass = mod12(pitch);
  if (chordPitches.size > 0 && !chordPitches.has(pitchClass) && pitchClass !== root) return null;
  switch (mod12(pitchClass - root)) {
    case 0:
      return 'root';
    case 3:
    case 4:
      return 'third';
    case 6:
    case 7:
    case 8:
      return 'fifth';
    case 10:
    case 11:
      return 'seventh';
    default:
      return chordPitches.size > 0 ? 'other' : null;
  }
}
