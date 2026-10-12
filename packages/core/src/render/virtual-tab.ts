/**
 * Tablature for any instrument (REND-190, REND-191): a keyboard, a voice or an orchestral part
 * shown as tablature on a guitar's strings, or a bass's for a low part, as Guitar Pro can; a drum
 * kit as a drum tablature, a line for each sound it plays (cymbals on top, the kick at the bottom)
 * and each hit written as its MIDI number. Set around a layout or paint: the staff takes the
 * tuning, each note a string and fret (fretting.ts) and each beat its strings' notes; notes no
 * string reaches are left out of the tablature. All comes back afterwards: what is heard and the
 * standard notation stay as they are.
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

/**
 * Puts notes on strings for a render, a beat's notes in its lookups as alphaTab keeps them, the
 * staff tuned to the strings; notes without a place are left out of the tablature. Returns what
 * puts it all back.
 */
function placeNotes(
  staff: alphaTab.model.Staff,
  tuning: alphaTab.model.Tuning,
  beats: readonly alphaTab.model.Beat[],
  places: ReadonlyMap<alphaTab.model.Note, Fret>,
): () => void {
  const savedTuning = staff.stringTuning;
  const savedNotes = [...places.keys()].map(note => [note, note.string, note.fret] as const);
  const savedBeats = beats.map(
    beat => [beat, beat.minStringNote, beat.maxStringNote, new Map(beat.noteStringLookup)] as const,
  );
  staff.stringTuning = tuning;
  for (const [note, place] of places) {
    note.string = place.string;
    note.fret = place.fret;
  }
  for (const beat of beats) {
    beat.noteStringLookup.clear();
    beat.minStringNote = null;
    beat.maxStringNote = null;
    for (const note of beat.notes) {
      if (!places.has(note)) continue;
      beat.noteStringLookup.set(note.string, note);
      if (beat.minStringNote === null || note.string < beat.minStringNote.string) beat.minStringNote = note;
      if (beat.maxStringNote === null || note.string > beat.maxStringNote.string) beat.maxStringNote = note;
    }
  }
  return () => {
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
  };
}

/** A pitched part on a guitar's strings, or a bass's (REND-190). */
function pitchedTablature(staff: alphaTab.model.Staff, beats: readonly alphaTab.model.Beat[]): () => void {
  const sounding = new Map(
    beats.flatMap(beat => beat.notes.map(note => [note, note.calculateRealValue(false, false)] as const)),
  );
  if (sounding.size === 0) return () => undefined;
  const tuning = tuningFor([...sounding.values()]);
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
    notes.forEach((note, index) => {
      const place = places[index] ?? null;
      if (place !== null) placed.set(note, place);
    });
  }
  return placeNotes(staff, tuning, beats, placed);
}

/**
 * A drum kit as a drum tablature (REND-191): a line for each sound it plays, from the top of the
 * staff down (cymbals on top, the kick at the bottom), each hit on its sound's line written as its
 * MIDI number: a "fret" over strings tuned to 0.
 */
function drumTablature(staff: alphaTab.model.Staff, beats: readonly alphaTab.model.Beat[]): () => void {
  const sounds = new Map<alphaTab.model.Note, alphaTab.model.InstrumentArticulation>();
  for (const beat of beats) {
    for (const note of beat.notes) {
      const articulation = alphaTab.model.PercussionMapper.getArticulation(note);
      if (articulation !== null) sounds.set(note, articulation);
    }
  }
  if (sounds.size === 0) return () => undefined;
  // One line per sound; on the same staff line, the higher sound above.
  const lines = [...new Map([...sounds.values()].map(sound => [sound.uniqueId, sound])).values()]
    .sort((a, b) => a.staffLine - b.staffLine || b.outputMidiNumber - a.outputMidiNumber)
    .map(sound => sound.uniqueId);
  const places = new Map<alphaTab.model.Note, Fret>();
  for (const [note, sound] of sounds)
    places.set(note, { string: lines.length - lines.indexOf(sound.uniqueId), fret: sound.outputMidiNumber });
  const tuning = new alphaTab.model.Tuning(
    '',
    lines.map(() => 0),
    false,
  );
  return placeNotes(staff, tuning, beats, places);
}

export function applyVirtualTablature(
  tracks: readonly alphaTab.model.Track[],
  staves: readonly TrackStaves[] = [],
): () => void {
  const restores: (() => void)[] = [];
  for (const track of tracks) {
    if (staves.find(entry => entry.trackIndex === track.index)?.tablature !== true) continue;
    for (const staff of track.staves) {
      const beats = staff.bars.flatMap(bar => bar.voices.flatMap(voice => voice.beats));
      // A drum kit's strings, when it has any, are not where its hits are (Guitar Pro 5's).
      if (staff.isPercussion) restores.push(drumTablature(staff, beats));
      else if (!staff.isStringed) restores.push(pitchedTablature(staff, beats));
    }
  }
  return () => {
    for (const restore of restores.reverse()) restore();
  };
}
