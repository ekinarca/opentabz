/**
 * Every beat of one track for the editor (EDIT-004), in score order (engine worker): where each
 * beat is and what it holds.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  BEAT_EMPTY,
  BEAT_GRACE,
  BEAT_REST,
  BEAT_TUPLET,
  TRACK_BEAT_NOTE_STRIDE,
  type TrackBeats,
} from '../shared/beats.ts';

export function collectTrackBeats(score: alphaTab.model.Score, trackIndex: number): TrackBeats {
  const track = score.tracks[trackIndex];
  const beats: number[] = [];
  const notes: number[] = [];
  for (const staff of track?.staves ?? []) {
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          const flags =
            (beat.isEmpty ? BEAT_EMPTY : 0) |
            (beat.isRest ? BEAT_REST : 0) |
            (beat.graceType === alphaTab.model.GraceType.None ? 0 : BEAT_GRACE) |
            (beat.hasTuplet ? BEAT_TUPLET : 0);
          beats.push(
            beat.id,
            staff.index,
            bar.index,
            voice.index,
            beat.index,
            beat.duration,
            beat.dots,
            flags,
            notes.length / TRACK_BEAT_NOTE_STRIDE,
            beat.notes.length,
          );
          for (const note of beat.notes) notes.push(note.isStringed ? note.string : 0, note.fret);
        }
      }
    }
  }
  return { trackIndex, beats: Int32Array.from(beats), notes: Int32Array.from(notes) };
}
