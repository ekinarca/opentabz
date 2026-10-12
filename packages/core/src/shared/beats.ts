/**
 * Every beat of one track, for the editor (EDIT-004): where each beat is, as edits address it
 * (EDIT-001), and what it holds. Staff by staff, bar by bar, voice by voice, beat by beat, in
 * score order. Built in the engine worker on request; alphaTab-free.
 */
export interface TrackBeats {
  readonly trackIndex: number;
  /**
   * Per beat: [beatId, staff, bar (master bar), voice, beat, duration, dots, flags, firstNote,
   * noteCount]. The duration is alphaTab's: 1 a whole note, 2 a half … 256, −2 a double whole note.
   */
  readonly beats: Int32Array;
  /** Per note: [string (1 the lowest, as alphaTab numbers them; 0 without strings), fret]. */
  readonly notes: Int32Array;
}

export const TRACK_BEATS_STRIDE = 10;
export const TRACK_BEAT_NOTE_STRIDE = 2;

/** The beat of an empty bar, which holds its place until something is written. */
export const BEAT_EMPTY = 1;
/** A rest (a beat without notes). */
export const BEAT_REST = 2;
/** A grace note's beat. */
export const BEAT_GRACE = 4;
/** A beat in a tuplet. */
export const BEAT_TUPLET = 8;
