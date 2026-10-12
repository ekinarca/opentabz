/**
 * Tablature for any pitched instrument (REND-190): a keyboard, a voice or an orchestral part
 * shown as tablature on a guitar's strings, or a bass's for a low part, as Guitar Pro can. Set
 * around a layout or paint: the staff takes the tuning, each note a string and fret (fretting.ts)
 * and each beat its strings' notes; notes no string reaches are left out of the tablature. All
 * comes back afterwards: what is heard and the standard notation stay as they are.
 */
import * as alphaTab from '@coderline/alphatab';
import type { TrackStaves } from '../shared/view.ts';
import { fretChord, handPosition, MAX_FRET, type Fret } from './fretting.ts';

/** Strings to choose from, the more usual first: a guitar's, a seven-string's, a bass's. */
const STRING_COUNTS = [6, 7, 4, 5];

/** The tuning whose strings reach the most of a part's pitches (24 frets up). */
function tuningFor(pitches: readonly number[]): alphaTab.model.Tuning {
  let best: alphaTab.model.Tuning | null = null;
  let reached = -1;
  for (const strings of STRING_COUNTS) {
    const tuning = alphaTab.model.Tuning.getDefaultTuningFor(strings);
    if (tuning === null) continue;
    const lowest = Math.min(...tuning.tunings);
    const highest = Math.max(...tuning.tunings) + MAX_FRET;
    const count = pitches.filter(pitch => pitch >= lowest && pitch <= highest).length;
    if (count > reached) {
      best = tuning;
      reached = count;
    }
  }
  return best ?? new alphaTab.model.Tuning('', [64, 59, 55, 50, 45, 40], true);
}

/** Where the hand starts: near the open strings. */
const START = 2;

export function applyVirtualTablature(
  tracks: readonly alphaTab.model.Track[],
  staves: readonly TrackStaves[] = [],
): () => void {
  const restores: (() => void)[] = [];
  for (const track of tracks) {
    if (staves.find(entry => entry.trackIndex === track.index)?.tablature !== true) continue;
    for (const staff of track.staves) {
      if (staff.isPercussion || staff.isStringed) continue;
      const beats = staff.bars.flatMap(bar => bar.voices.flatMap(voice => voice.beats));
      const sounding = new Map(
        beats.flatMap(beat => beat.notes.map(note => [note, note.calculateRealValue(false, false)] as const)),
      );
      if (sounding.size === 0) continue;
      const tuning = tuningFor([...sounding.values()]);
      const savedTuning = staff.stringTuning;
      const savedNotes = [...sounding.keys()].map(note => [note, note.string, note.fret] as const);
      const savedBeats = beats.map(
        beat => [beat, beat.minStringNote, beat.maxStringNote, new Map(beat.noteStringLookup)] as const,
      );
      staff.stringTuning = tuning;
      const placed = new Map<alphaTab.model.Note, Fret>();
      let position = START;
      for (const beat of beats) {
        const notes = beat.notes;
        // A tied note stays on its origin's string and fret.
        const fixed = new Map<number, Fret>();
        notes.forEach((note, index) => {
          const origin = note.isTieDestination ? note.tieOrigin : null;
          const place = origin === null ? undefined : placed.get(origin);
          if (place !== undefined) fixed.set(index, place);
        });
        const places = fretChord(
          notes.map(note => sounding.get(note) ?? 0),
          tuning.tunings,
          position,
          fixed,
        );
        position = handPosition(places, position);
        beat.noteStringLookup.clear();
        beat.minStringNote = null;
        beat.maxStringNote = null;
        notes.forEach((note, index) => {
          const place = places[index] ?? null;
          if (place === null) return;
          note.string = place.string;
          note.fret = place.fret;
          placed.set(note, place);
          beat.noteStringLookup.set(place.string, note);
          if (beat.minStringNote === null || place.string < beat.minStringNote.string)
            beat.minStringNote = note;
          if (beat.maxStringNote === null || place.string > beat.maxStringNote.string)
            beat.maxStringNote = note;
        });
      }
      restores.push(() => {
        staff.stringTuning = savedTuning;
        for (const [note, string, fret] of savedNotes) {
          note.string = string;
          note.fret = fret;
        }
        for (const [beat, min, max, lookup] of savedBeats) {
          beat.minStringNote = min;
          beat.maxStringNote = max;
          beat.noteStringLookup.clear();
          for (const [string, note] of lookup) beat.noteStringLookup.set(string, note);
        }
      });
    }
  }
  return () => {
    for (const restore of restores.reverse()) restore();
  };
}
