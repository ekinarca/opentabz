/**
 * The notes of one track for instrument views (engine worker): string, fret, sounding pitch and
 * flags of every note, per beat, from the track's first staff with strings.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  NOTE_DEAD,
  NOTE_GHOST,
  NOTE_HARMONIC,
  NOTE_TIED,
  TRACK_NOTE_STRIDE,
  type TrackNotes,
} from '../shared/notes.ts';

export function collectTrackNotes(score: alphaTab.model.Score, trackIndex: number): TrackNotes {
  const track = score.tracks[trackIndex];
  const staff = track?.staves.find(candidate => candidate.isStringed && !candidate.isPercussion);
  if (staff === undefined) {
    return { trackIndex, staffIndex: null, beats: new Int32Array(0), notes: new Int32Array(0) };
  }
  const strings = staff.tuning.length;
  const beats: number[] = [];
  const notes: number[] = [];
  for (const bar of staff.bars) {
    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        if (beat.isRest || beat.notes.length === 0) continue;
        beats.push(beat.id, notes.length / TRACK_NOTE_STRIDE, beat.notes.length, bar.keySignature);
        for (const note of beat.notes) {
          const flags =
            (note.isDead ? NOTE_DEAD : 0) |
            (note.isTieDestination ? NOTE_TIED : 0) |
            (note.harmonicType === alphaTab.model.HarmonicType.None ? 0 : NOTE_HARMONIC) |
            (note.isGhost ? NOTE_GHOST : 0);
          // alphaTab counts strings from the lowest; tablature (and players) from the highest.
          notes.push(strings - note.string + 1, note.fret, note.realValue, flags);
        }
      }
    }
  }
  return {
    trackIndex,
    staffIndex: staff.index,
    beats: Int32Array.from(beats),
    notes: Int32Array.from(notes),
  };
}
