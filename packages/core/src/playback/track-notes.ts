/**
 * The notes of one track for instrument views (engine worker): sounding pitch and flags of every
 * note, per beat, from each staff with pitches; on the first staff with strings also its string
 * and fret.
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
  const stringed = track?.staves.find(candidate => candidate.isStringed && !candidate.isPercussion);
  const beats: number[] = [];
  const notes: number[] = [];
  for (const staff of track?.staves ?? []) {
    if (staff.isPercussion) continue;
    const strings = staff === stringed ? staff.tuning.length : 0;
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          if (beat.isRest || beat.notes.length === 0) continue;
          beats.push(
            beat.id,
            notes.length / TRACK_NOTE_STRIDE,
            beat.notes.length,
            bar.keySignature,
            staff.index,
          );
          for (const note of beat.notes) {
            const flags =
              (note.isDead ? NOTE_DEAD : 0) |
              (note.isTieDestination ? NOTE_TIED : 0) |
              (note.harmonicType === alphaTab.model.HarmonicType.None ? 0 : NOTE_HARMONIC) |
              (note.isGhost ? NOTE_GHOST : 0);
            // alphaTab counts strings from the lowest; tablature (and players) from the highest.
            if (strings > 0) notes.push(strings - note.string + 1, note.fret, note.realValue, flags);
            else notes.push(0, 0, note.realValue, flags);
          }
        }
      }
    }
  }
  return {
    trackIndex,
    staffIndex: stringed?.index ?? null,
    beats: Int32Array.from(beats),
    notes: Int32Array.from(notes),
  };
}
