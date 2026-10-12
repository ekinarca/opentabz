/**
 * Notes harmonized (EDIT-055): each note of a selection given another a third, a sixth or an
 * octave above or below it, in the key of its bar (a third of C in G major is E; of F♯, A), put on
 * the nearest string its beat leaves free with a fret for it. A note held on by a tie gets its
 * harmony held on too; drums are left as they are.
 */
import * as alphaTab from '@coderline/alphatab';
import type { Harmony, Selection } from '../shared/edit.ts';
import { beatsOf } from './clip.ts';
import type { Transaction } from './commands.ts';
import { EditError } from './error.ts';

/** The highest fret a harmony is put on. */
const PLAYABLE_FRET = 24;

/** The steps of a major scale, from its tonic. */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** The scale degrees an interval spans. */
const DEGREES: Readonly<Record<Harmony, number>> = { third: 2, sixth: 5, octave: 7 };

/** The pitches of a key (as many sharps as `sharps`, flats below 0) from MIDI 0 to 127. */
function keyPitches(sharps: number): number[] {
  const tonic = (((sharps * 7) % 12) + 12) % 12;
  const classes = new Set(MAJOR.map(step => (tonic + step) % 12));
  return Array.from({ length: 128 }, (_, pitch) => pitch).filter(pitch => classes.has(pitch % 12));
}

/** The pitch `degrees` scale steps from `pitch` in a key; a note out of the key keeps its distance. */
function stepped(pitches: readonly number[], pitch: number, degrees: number): number | null {
  const below = pitches.findLastIndex(candidate => candidate <= pitch);
  const reference = pitches[below];
  const target = pitches[below + degrees];
  if (reference === undefined || target === undefined) return null;
  return target + (pitch - reference);
}

/** The pitch a harmony of `pitch` sounds at, or null outside MIDI's notes. */
export function harmonyOf(pitch: number, sharps: number, harmony: Harmony, below: boolean): number | null {
  const result = stepped(keyPitches(sharps), pitch, (below ? -1 : 1) * DEGREES[harmony]);
  return result === null || result < 0 || result > 127 ? null : result;
}

/** The open strings' pitches of a staff, by string (1 the lowest). */
function openPitch(staff: alphaTab.model.Staff, string: number): number {
  return staff.tuning[staff.tuning.length - string] ?? 0;
}

/** A new note copying a note's techniques that sound alike in a harmony. */
function partnerOf(note: alphaTab.model.Note): alphaTab.model.Note {
  const partner = new alphaTab.model.Note();
  partner.isPalmMute = note.isPalmMute;
  partner.isLetRing = note.isLetRing;
  partner.isStaccato = note.isStaccato;
  partner.isGhost = note.isGhost;
  partner.isDead = note.isDead;
  partner.accentuated = note.accentuated;
  partner.vibrato = note.vibrato;
  return partner;
}

/** Harmonizes the notes of a selection; refused when no harmony finds a place. */
export function harmonize(
  transaction: Transaction,
  selection: Selection,
  harmony: Harmony,
  below: boolean,
): void {
  if (!Object.hasOwn(DEGREES, harmony)) throw new EditError(`No harmony "${harmony}".`);
  // Each note's harmony, for the notes tied to it.
  const harmonies = new Map<alphaTab.model.Note, alphaTab.model.Note>();
  let added = 0;
  for (const beat of beatsOf(transaction.score, selection)) {
    const staff = beat.voice.bar.staff;
    if (staff.isPercussion || beat.notes.length === 0) continue;
    const sharps: number = beat.voice.bar.keySignature;
    const originals = [...beat.notes];
    let touched = false;
    const touch = () => {
      if (!touched) transaction.touch(staff, beat.voice.bar.index);
      touched = true;
    };
    for (const note of originals) {
      if (note.isPercussion) continue;
      const origin = note.isTieDestination ? note.tieOrigin : null;
      const held = origin === null ? undefined : harmonies.get(origin);
      if (note.isStringed && staff.tuning.length > 0) {
        if (origin !== null && held === undefined) continue;
        const pitch = openPitch(staff, note.string) + note.fret;
        const target =
          held === undefined
            ? harmonyOf(pitch, sharps, harmony, below)
            : openPitch(staff, held.string) + held.fret;
        if (target === null) continue;
        const step = below ? -1 : 1;
        const strings = Array.from({ length: staff.tuning.length }, (_, index) => index + 1)
          .filter(string => beat.getNoteOnString(string) === null)
          .sort(
            (a, b) =>
              Math.abs(a - note.string) - Math.abs(b - note.string) ||
              Math.sign(b - note.string) * step - Math.sign(a - note.string) * step,
          );
        const string =
          held !== undefined && beat.getNoteOnString(held.string) === null
            ? held.string
            : strings.find(candidate => {
                const fret = target - openPitch(staff, candidate);
                return fret >= 0 && fret <= PLAYABLE_FRET;
              });
        if (string === undefined) continue;
        touch();
        const partner = partnerOf(note);
        partner.string = string;
        partner.fret = target - openPitch(staff, string);
        partner.isTieDestination = held !== undefined;
        beat.isEmpty = false;
        beat.addNote(partner);
        harmonies.set(note, partner);
        added++;
      } else if (note.isPiano) {
        const pitch = note.octave * 12 + note.tone;
        const target =
          held === undefined ? harmonyOf(pitch, sharps, harmony, below) : held.octave * 12 + held.tone;
        if (
          target === null ||
          beat.notes.some(other => other.isPiano && other.octave * 12 + other.tone === target)
        )
          continue;
        touch();
        const partner = partnerOf(note);
        partner.octave = Math.floor(target / 12);
        partner.tone = target % 12;
        partner.isTieDestination = held !== undefined;
        beat.addNote(partner);
        harmonies.set(note, partner);
        added++;
      }
    }
  }
  if (added === 0) throw new EditError('No string has room for the notes’ harmonies.');
}
