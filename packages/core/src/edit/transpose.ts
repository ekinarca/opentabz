/**
 * Notes moved in pitch (EDIT-050, EDIT-051) and from string to string at their pitch (EDIT-052),
 * as Guitar Pro's transpose tool and its Ctrl Alt ↑ ↓ move them. A note on strings keeps its string
 * while the frets allow, else goes to the nearest string with room for it; a tied note follows the
 * note it holds on, to its string.
 */
import type * as alphaTab from '@coderline/alphatab';
import { MAX_DEGREES, MAX_FRET, MAX_TRANSPOSE, type NoteAddress, type Selection } from '../shared/edit.ts';
import { keySignatureOf } from './bar-properties.ts';
import { beatsOf, copyChord } from './clip.ts';
import type { Transaction } from './commands.ts';
import { EditError } from './error.ts';
import { byDegrees, byInterval, fifthsOf, movedKey } from './spelling.ts';

/** The highest fret a transposed note keeps its string to; past it, a string with room is looked for. */
const PLAYABLE_FRET = 24;

/** The highest MIDI note. */
const TOP = 127;

/** The pitch of a staff's open string (1 the lowest), as tuned. */
function openPitch(staff: alphaTab.model.Staff, string: number): number {
  return staff.tuning[staff.tuning.length - string] ?? 0;
}

/** A note moved to another string of its beat. */
function restring(note: alphaTab.model.Note, string: number): void {
  const { beat } = note;
  beat.removeNote(note);
  note.string = string;
  beat.addNote(note);
  beat.notes.forEach((each, index) => {
    each.index = index;
  });
}

/**
 * Where a note of a staff goes once `semitones` higher: its string while a fret up to the 24th
 * allows, else the nearest string free in its beat whose fret does, else its string as far as the
 * frets go; null when no fret can play it.
 */
function placeOf(
  staff: alphaTab.model.Staff,
  note: alphaTab.model.Note,
  semitones: number,
): { string: number; fret: number } | null {
  const pitch = openPitch(staff, note.string) + note.fret + semitones;
  const fret = pitch - openPitch(staff, note.string);
  if (fret >= 0 && fret <= PLAYABLE_FRET) return { string: note.string, fret };
  const strings = Array.from({ length: staff.tuning.length }, (_, index) => index + 1)
    .filter(string => string !== note.string)
    .sort((a, b) => Math.abs(a - note.string) - Math.abs(b - note.string));
  for (const string of strings) {
    const other = pitch - openPitch(staff, string);
    if (other >= 0 && other <= PLAYABLE_FRET && note.beat.getNoteOnString(string) === null)
      return { string, fret: other };
  }
  return fret >= 0 && fret <= MAX_FRET ? { string: note.string, fret } : null;
}

/** The notes' names, by semitone from C: sharps going up, flats going down. */
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NATURALS: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A note name (a letter, then ♯ or ♭ as #, ♯, b or ♭) `semitones` away; null when not one. */
function moveName(name: string, semitones: number): string | null {
  const match = /^([A-G])([#♯b♭]?)$/.exec(name);
  if (match === null) return null;
  const accidental = match[2] === '#' || match[2] === '♯' ? 1 : match[2] === 'b' || match[2] === '♭' ? -1 : 0;
  const value = ((((NATURALS[match[1] ?? 'C'] ?? 0) + accidental + semitones) % 12) + 12) % 12;
  return (semitones > 0 ? SHARPS : FLATS)[value] ?? null;
}

/**
 * A chord's name `semitones` away: its root and the bass after a slash ("A7" → "B7", "D/F#" →
 * "E/G#"). A name that does not start with a note (a name of one's own) is left as it is.
 */
export function moveChordName(name: string, semitones: number): string {
  const match = /^([A-G][#♯b♭]?)(.*?)(?:\/([A-G][#♯b♭]?))?$/.exec(name);
  const root = match === null ? null : moveName(match[1] ?? '', semitones);
  if (match === null || root === null) return name;
  const bass = match[3] === undefined ? null : moveName(match[3], semitones);
  return `${root}${match[2] ?? ''}${bass === null ? '' : `/${bass}`}`;
}

/**
 * A chord diagram `semitones` away: each fret played moved, by an octave the other way when the
 * shape would leave the neck; its name moved too. The fingers no longer hold: they are left out.
 */
function movedChord(chord: alphaTab.model.Chord, semitones: number): alphaTab.model.Chord {
  const moved = copyChord(chord);
  moved.name = moveChordName(chord.name, semitones);
  const played = chord.strings.filter(fret => fret >= 0);
  let shift = semitones;
  while (played.some(fret => fret + shift < 0)) shift += 12;
  while (played.some(fret => fret + shift > PLAYABLE_FRET) && played.every(fret => fret + shift - 12 >= 0))
    shift -= 12;
  moved.strings = chord.strings.map(fret => (fret >= 0 ? fret + shift : fret));
  moved.barreFrets = chord.barreFrets.map(fret => fret + shift);
  const frets = moved.strings.filter(fret => fret > 0);
  moved.firstFret = frets.length > 0 && Math.max(...frets) > 5 ? Math.min(...frets) : 1;
  if (shift !== 0) moved.fingers = [];
  return moved;
}

/**
 * The chord diagrams the selected beats name, moved with their notes (EDIT-144): a chord only those
 * beats name is moved where it is; one other beats name too is copied, and the selected beats name
 * the copy.
 */
function transposeChords(
  transaction: Transaction,
  beats: readonly alphaTab.model.Beat[],
  semitones: number,
): void {
  const selected = new Set(beats);
  const byStaff = new Map<alphaTab.model.Staff, Map<string, alphaTab.model.Beat[]>>();
  for (const beat of beats) {
    if (beat.chordId === null) continue;
    const staff = beat.voice.bar.staff;
    if (!staff.hasChord(beat.chordId)) continue;
    const chords = byStaff.get(staff) ?? new Map<string, alphaTab.model.Beat[]>();
    byStaff.set(staff, chords);
    chords.set(beat.chordId, [...(chords.get(beat.chordId) ?? []), beat]);
  }
  for (const [staff, chords] of byStaff) {
    const named = new Set(
      staff.bars.flatMap(bar =>
        bar.voices.flatMap(voice =>
          voice.beats.filter(beat => beat.chordId !== null && !selected.has(beat)).map(beat => beat.chordId),
        ),
      ),
    );
    transaction.journal.keep(staff);
    for (const users of chords.values())
      for (const beat of users) transaction.touch(staff, beat.voice.bar.index);
    for (const [id, users] of chords) {
      const chord = staff.getChord(id);
      if (chord === null) continue;
      const moved = movedChord(chord, semitones);
      if (!named.has(id)) {
        staff.addChord(id, moved);
        continue;
      }
      let copyId = `${id} ${semitones > 0 ? '+' : ''}${String(semitones)}`;
      while (staff.hasChord(copyId)) copyId = `${copyId}'`;
      staff.addChord(copyId, moved);
      for (const beat of users) beat.chordId = copyId;
    }
  }
}

/** How a note moves: semitones, and the spelling it is then written with (as it was, when none). */
interface Shift {
  readonly semitones: number;
  readonly mode?: alphaTab.model.NoteAccidentalMode;
}

/**
 * Moves the notes of `beats` as `shift` says of each; a note held on by a tie follows the note it
 * holds on, to its string and spelling. Drums stay as they are.
 */
export function shiftNotes(
  transaction: Transaction,
  beats: readonly alphaTab.model.Beat[],
  shift: (note: alphaTab.model.Note) => Shift,
): void {
  // Where each note moved to (its string, or 0 without one), for the notes tied to it.
  const moved = new Map<alphaTab.model.Note, number>();
  for (const beat of beats) {
    const staff = beat.voice.bar.staff;
    if (staff.isPercussion || beat.notes.length === 0) continue;
    transaction.touch(staff, beat.voice.bar.index);
    for (const note of [...beat.notes]) {
      if (note.isPercussion) continue;
      if (note.isTieDestination && note.tieOrigin !== null) {
        // It sounds the note it holds on: moved with it, else as it is.
        const string = moved.get(note.tieOrigin);
        if (string === undefined) continue;
        if (note.isStringed && string !== note.string) {
          if (beat.getNoteOnString(string) !== null)
            throw new EditError('A tied note cannot follow its note to a string already played.');
          restring(note, string);
        }
        note.accidentalMode = note.tieOrigin.accidentalMode;
        moved.set(note, string);
        continue;
      }
      const { semitones, mode } = shift(note);
      if (note.isStringed && staff.tuning.length > 0) {
        const place = placeOf(staff, note, semitones);
        if (place === null)
          throw new EditError(
            semitones > 0
              ? 'A note would go past the highest fret: transpose less.'
              : 'A note would go below the lowest string: transpose less.',
          );
        if (place.string !== note.string) restring(note, place.string);
        note.fret = place.fret;
        moved.set(note, place.string);
      } else if (note.isPiano) {
        const value = note.octave * 12 + note.tone + semitones;
        if (value < 0 || value > TOP) throw new EditError('A note would go past the notes MIDI plays.');
        note.octave = Math.floor(value / 12);
        note.tone = value % 12;
        moved.set(note, 0);
      } else continue;
      if (mode !== undefined) note.accidentalMode = mode;
    }
  }
}

/** How a transposition moves a selection's notes (EDIT-050, EDIT-051, EDIT-116, EDIT-117). */
export interface Transposition {
  /** Semitones higher (lower below 0). */
  readonly semitones: number;
  /** The interval's letters (a major third up: 2), the notes spelled by it. */
  readonly letters?: number;
  /** Steps of each bar's scale instead of semitones. */
  readonly degrees?: number;
  /** The selected bars' keys moved too. */
  readonly keys?: boolean;
  /** The chord diagrams the beats name moved too (EDIT-144). */
  readonly chords?: boolean;
}

/**
 * The key a bar's moves to with its notes: by the interval, with `letters`; else to the one of its
 * two spellings with fewer accidentals (C major up a semitone: D♭ major, not C♯).
 */
function keyMoved(key: number, semitones: number, letters: number | undefined): number {
  if (letters !== undefined) return movedKey(key, fifthsOf(semitones, letters));
  const fifths = (((semitones * 7) % 12) + 12) % 12;
  if (fifths === 0) return key;
  const sharper = key + fifths;
  const flatter = sharper - 12;
  return Math.abs(flatter) < Math.abs(sharper) ? flatter : sharper;
}

/**
 * Moves the notes of a selection: `semitones` higher (lower when negative), spelled by the interval
 * with `letters`; or by `degrees` of each bar's scale, keeping the accidentals written. With `keys`,
 * the keys of a selection of bars move with them; with `chords`, the chord diagrams its beats name.
 */
export function transpose(transaction: Transaction, selection: Selection, how: Transposition): void {
  const { semitones, letters, degrees = 0, keys = false, chords = false } = how;
  if (!Number.isInteger(semitones) || Math.abs(semitones) > MAX_TRANSPOSE)
    throw new EditError(`No transposition of ${String(semitones)} semitones.`);
  if (!Number.isInteger(degrees) || Math.abs(degrees) > MAX_DEGREES)
    throw new EditError(`No transposition of ${String(degrees)} steps.`);
  if (letters !== undefined && (!Number.isInteger(letters) || Math.abs(letters) > MAX_DEGREES))
    throw new EditError(`No interval of ${String(letters)} letters.`);
  if (degrees !== 0 && (semitones !== 0 || letters !== undefined || keys || chords))
    throw new EditError('Notes move by steps of their scale alone, in their keys.');
  if (keys && selection.kind !== 'bars') throw new EditError('Keys move with whole bars.');
  if (semitones === 0 && degrees === 0) return;
  const { score } = transaction;
  const beats = beatsOf(score, selection);
  // Each bar's key after the edit.
  const newKeys = new Map<alphaTab.model.Bar, number>();
  if (keys && selection.kind === 'bars') {
    for (const track of score.tracks.slice(selection.fromTrack, selection.toTrack + 1)) {
      for (const staff of track.staves) {
        if (staff.isPercussion) continue;
        for (const bar of staff.bars.slice(selection.fromBar, selection.toBar + 1)) {
          transaction.touch(staff, bar.index);
          newKeys.set(bar, keyMoved(bar.keySignature, semitones, letters));
        }
      }
    }
  }
  shiftNotes(transaction, beats, note => {
    const bar = note.beat.voice.bar;
    const key: number = bar.keySignature;
    const written = note.displayValueWithoutBend;
    if (degrees !== 0) {
      const moved = byDegrees(written, key, note.accidentalMode, degrees);
      return { semitones: moved.value - written, mode: moved.mode };
    }
    if (letters === undefined) return { semitones };
    const moved = byInterval(written, key, note.accidentalMode, semitones, letters, newKeys.get(bar) ?? key);
    return { semitones, mode: moved.mode };
  });
  for (const [bar, key] of newKeys) bar.keySignature = keySignatureOf(key);
  if (chords) transposeChords(transaction, beats, semitones);
}

/**
 * A staff retuned with its notes keeping their pitches (EDIT-054): each beat's notes, highest
 * first, on their strings (counted from the lowest) while a fret up to the 24th plays them there,
 * else on the nearest string left free with such a fret, else as far up the neck as the frets go;
 * a tied note on the string of the note it holds on. Refused when a note has no string at all.
 */
export function retune(
  transaction: Transaction,
  staff: alphaTab.model.Staff,
  tuning: readonly number[],
): void {
  const old = [...staff.tuning];
  // Frets count from the capo, which stays: pitches with it, for notes on no string.
  const capo = staff.capo;
  const openOld = (string: number): number => (old[old.length - string] ?? 0) + capo;
  const openNew = (string: number): number => (tuning[tuning.length - string] ?? 0) + capo;
  const strings = tuning.length;
  const moved = new Map<alphaTab.model.Note, number>();
  for (const bar of staff.bars) {
    let touched = false;
    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        const notes = beat.notes.filter(note => (note.isStringed && old.length > 0) || note.isPiano);
        if (notes.length === 0) continue;
        if (!touched) {
          transaction.touch(staff, bar.index);
          touched = true;
        }
        const pitches = new Map(
          notes.map(note => [
            note,
            note.isStringed ? openOld(note.string) + note.fret : note.octave * 12 + note.tone,
          ]),
        );
        notes.sort((a, b) => (pitches.get(b) ?? 0) - (pitches.get(a) ?? 0));
        for (const note of notes) beat.removeNote(note);
        // No strings (EDIT-076): the notes are written by their pitches alone.
        if (strings === 0) {
          for (const note of notes) {
            const pitch = pitches.get(note) ?? 0;
            note.string = -1;
            note.fret = -1;
            note.octave = Math.floor(pitch / 12);
            note.tone = pitch % 12;
            beat.addNote(note);
          }
          beat.notes.forEach((each, index) => {
            each.index = index;
          });
          continue;
        }
        const taken = new Set<number>();
        const placed: [alphaTab.model.Note, number, number][] = [];
        for (const note of notes) {
          const pitch = pitches.get(note) ?? 0;
          const origin =
            note.isTieDestination && note.tieOrigin !== null ? moved.get(note.tieOrigin) : undefined;
          // A note on no string goes on the highest that plays it.
          const preferred = origin ?? (note.isStringed ? Math.min(note.string, strings) : strings);
          const order = Array.from({ length: strings }, (_, index) => index + 1)
            .filter(string => !taken.has(string))
            .sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred));
          const fits = (string: number, highest: number): boolean => {
            const fret = pitch - openNew(string);
            return fret >= 0 && fret <= highest;
          };
          const string =
            (origin !== undefined && !taken.has(origin) ? origin : undefined) ??
            order.find(candidate => fits(candidate, PLAYABLE_FRET)) ??
            order.find(candidate => fits(candidate, MAX_FRET));
          if (string === undefined)
            throw new EditError('A note has no string to be played on in the new tuning.');
          taken.add(string);
          placed.push([note, string, pitch - openNew(string)]);
          moved.set(note, string);
        }
        for (const [note, string, fret] of placed) {
          note.string = string;
          note.fret = fret;
          note.octave = -1;
          note.tone = -1;
          beat.addNote(note);
        }
        beat.notes.forEach((each, index) => {
          each.index = index;
        });
      }
    }
  }
}

/**
 * Moves a note to the next string higher or lower in pitch it can be played on, at its pitch, and
 * the notes tied to it along with it; strings with a note of their own in the beat are passed.
 */
export function moveString(transaction: Transaction, at: NoteAddress, higher: boolean): void {
  const staff = transaction.score.tracks[at.track]?.staves[at.staff];
  const beat = staff?.bars[at.bar]?.voices[at.voice]?.beats[at.beat];
  if (staff === undefined || beat === undefined) throw new EditError(`No beat at ${JSON.stringify(at)}.`);
  const note = beat.getNoteOnString(at.string);
  if (note === null) throw new EditError(`No note on string ${String(at.string)}.`);
  // The note it holds on decides: the tie is moved from its start.
  let first = note;
  while (first.isTieDestination && first.tieOrigin !== null) first = first.tieOrigin;
  const chain: alphaTab.model.Note[] = [];
  for (let each: alphaTab.model.Note | null = first; each !== null; each = each.tieDestination)
    chain.push(each);
  const pitch = openPitch(staff, first.string) + first.fret;
  const step = higher ? 1 : -1;
  for (let string = first.string + step; string >= 1 && string <= staff.tuning.length; string += step) {
    const fret = pitch - openPitch(staff, string);
    if (fret < 0 || fret > MAX_FRET) break;
    if (chain.some(each => each.beat.getNoteOnString(string) !== null)) continue;
    for (const each of chain) transaction.touch(staff, each.beat.voice.bar.index);
    for (const each of chain) {
      restring(each, string);
      each.fret = fret;
    }
    return;
  }
  throw new EditError(
    higher ? 'No higher string to play the note on.' : 'No lower string to play the note on.',
  );
}
