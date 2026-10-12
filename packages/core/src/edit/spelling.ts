/**
 * Notes as they are written (EDIT-107, EDIT-116, EDIT-117): a letter on the staff and its accidental,
 * spelled as alphaTab spells them in a key — with the key's accidental for a letter the key alters,
 * else with sharps (flats in a key with flats), or as a note's spelling asks — and written pitches
 * moved a number of letters, by a scale's steps keeping the accidentals written, or by an interval.
 */
import * as alphaTab from '@coderline/alphatab';

const { NoteAccidentalMode: Mode } = alphaTab.model;

/** The semitones of each letter (C … B) above C. */
const LETTERS = [0, 2, 4, 5, 7, 9, 11] as const;

/** The letters keys sharpen (F C G D A E B) and flatten (B E A D G C F), in order. */
const SHARPENED = [3, 0, 4, 1, 5, 2, 6];
const FLATTENED = [6, 2, 5, 1, 4, 0, 3];

/** A semitone's letter and accidental when the key has none for it: sharps, or flats. */
const SHARP_SPELLINGS: readonly Letter[] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
  [2, 0],
  [3, 0],
  [3, 1],
  [4, 0],
  [4, 1],
  [5, 0],
  [5, 1],
  [6, 0],
];
const FLAT_SPELLINGS: readonly Letter[] = [
  [0, 0],
  [1, -1],
  [1, 0],
  [2, -1],
  [2, 0],
  [3, 0],
  [4, -1],
  [4, 0],
  [5, -1],
  [5, 0],
  [6, -1],
  [6, 0],
];

/** A letter (0 C … 6 B) and an accidental (−2 a double flat … 2 a double sharp). */
type Letter = readonly [letter: number, accidental: number];

/** The accidental a spelling asks for. */
const FORCED: ReadonlyMap<alphaTab.model.NoteAccidentalMode, number> = new Map([
  [Mode.ForceDoubleFlat, -2],
  [Mode.ForceFlat, -1],
  [Mode.ForceNatural, 0],
  [Mode.ForceNone, 0],
  [Mode.ForceSharp, 1],
  [Mode.ForceDoubleSharp, 2],
]);

/** The spelling that asks for an accidental. */
const SPELLING_OF: ReadonlyMap<number, alphaTab.model.NoteAccidentalMode> = new Map([
  [-2, Mode.ForceDoubleFlat],
  [-1, Mode.ForceFlat],
  [0, Mode.ForceNatural],
  [1, Mode.ForceSharp],
  [2, Mode.ForceDoubleSharp],
]);

function modulo(value: number, by: number): number {
  return value - by * Math.floor(value / by);
}

/** A pitch as written: its letter's place, counted in letters from the C of MIDI 0, and its accidental. */
export interface Spelled {
  readonly step: number;
  readonly accidental: number;
}

/** The accidental a key (sharps, or flats below 0) writes on a letter (0 C … 6 B). */
export function keyAccidental(key: number, letter: number): number {
  if (key > 0) return SHARPENED.indexOf(letter) < key ? 1 : 0;
  if (key < 0) return FLATTENED.indexOf(letter) < -key ? -1 : 0;
  return 0;
}

/** The letters a semitone (0 C … 11 B) is written with, up to two accidentals. */
function lettersOf(chroma: number): Letter[] {
  return LETTERS.flatMap((semitone, letter): Letter[] => {
    const accidental = modulo(chroma - semitone + 6, 12) - 6;
    return Math.abs(accidental) <= 2 ? [[letter, accidental]] : [];
  });
}

/** A written pitch as alphaTab spells it in a key, with a note's spelling. */
export function spell(value: number, key: number, mode: alphaTab.model.NoteAccidentalMode): Spelled {
  const chroma = modulo(value, 12);
  const letters = lettersOf(chroma);
  const forced = FORCED.get(mode);
  const chosen =
    (forced === undefined ? undefined : letters.find(([, accidental]) => accidental === forced)) ??
    letters.find(([letter, accidental]) => keyAccidental(key, letter) === accidental) ??
    (key < 0 ? FLAT_SPELLINGS : SHARP_SPELLINGS)[chroma] ??
    ([0, 0] as const);
  const [letter, accidental] = chosen;
  const octave = Math.floor((value - (LETTERS[letter] ?? 0) - accidental) / 12);
  return { step: octave * 7 + letter, accidental };
}

/** The pitch a letter's place with an accidental is. */
function valueOf(step: number, accidental: number): number {
  return Math.floor(step / 7) * 12 + (LETTERS[modulo(step, 7)] ?? 0) + accidental;
}

/** A written pitch moved, and the spelling that writes it as meant. */
export interface Moved {
  readonly value: number;
  readonly mode: alphaTab.model.NoteAccidentalMode;
}

/** The spelling writing `value` at a letter's place: the note's own when it does, else none, else forced. */
function spellingFor(
  value: number,
  step: number,
  key: number,
  mode: alphaTab.model.NoteAccidentalMode,
): alphaTab.model.NoteAccidentalMode {
  const writes = (candidate: alphaTab.model.NoteAccidentalMode) => spell(value, key, candidate).step === step;
  if (mode !== Mode.Default && writes(mode)) return mode;
  if (writes(Mode.Default)) return Mode.Default;
  return SPELLING_OF.get(value - valueOf(step, 0)) ?? Mode.Default;
}

/**
 * A written pitch `steps` letters higher (lower below 0) in a key, keeping the accidental written: a
 * note the key alters takes the key's accidental at its new place, a sharp written stays a sharp (in
 * C major, D up two steps is F; C♯, E♯). As far as a double sharp or flat goes.
 */
export function byDegrees(
  value: number,
  key: number,
  mode: alphaTab.model.NoteAccidentalMode,
  steps: number,
): Moved {
  const from = spell(value, key, mode);
  const written = from.accidental - keyAccidental(key, modulo(from.step, 7));
  const step = from.step + steps;
  const accidental = Math.max(-2, Math.min(2, keyAccidental(key, modulo(step, 7)) + written));
  const moved = valueOf(step, accidental);
  return { value: moved, mode: spellingFor(moved, step, key, mode) };
}

/**
 * A written pitch moved by an interval: `semitones` higher and spelled `letters` letters higher (a
 * major third up from C♯ is E♯, a diminished fourth F), in the key it is then written in.
 */
export function byInterval(
  value: number,
  key: number,
  mode: alphaTab.model.NoteAccidentalMode,
  semitones: number,
  letters: number,
  newKey: number,
): Moved {
  const from = spell(value, key, mode);
  const step = from.step + letters;
  const moved = value + semitones;
  // An interval spelled past a double sharp or flat is spelled as the key would.
  if (Math.abs(moved - valueOf(step, 0)) > 2) return { value: moved, mode: Mode.Default };
  return { value: moved, mode: spellingFor(moved, step, newKey, mode) };
}

/** The fifths an interval spans, up (a major second: 2, a minor third: −3), the nearer when either. */
export function fifthsOf(semitones: number, letters: number): number {
  let best: number | null = null;
  for (let fifths = -20; fifths <= 20; fifths++) {
    if (modulo(fifths * 4, 7) !== modulo(letters, 7) || modulo(fifths * 7, 12) !== modulo(semitones, 12))
      continue;
    if (best === null || Math.abs(fifths) < Math.abs(best)) best = fifths;
  }
  return best ?? 0;
}

/** A key moved by fifths, written with seven sharps or flats at most (eight sharps are four flats). */
export function movedKey(key: number, fifths: number): number {
  let moved = key + fifths;
  while (moved > 7) moved -= 12;
  while (moved < -7) moved += 12;
  return moved;
}
