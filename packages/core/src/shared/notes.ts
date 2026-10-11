/**
 * The notes of one track as instrument views (the fretboard) show them, beat by beat. Built in
 * the engine worker on request; alphaTab-free.
 */
export interface TrackNotes {
  readonly trackIndex: number;
  /** The staff the notes come from (the track's first staff with strings), or null if none. */
  readonly staffIndex: number | null;
  /** Per beat with notes: [beatId, firstNote, noteCount, keySignature (-7 flats to 7 sharps)]. */
  readonly beats: Int32Array;
  /**
   * Per note: [string, fret, pitch, flags]. Strings are numbered as in tablature: 1 is the
   * highest; frets count from the capo; the pitch is the MIDI note that sounds.
   */
  readonly notes: Int32Array;
}

export const TRACK_BEAT_STRIDE = 4;
export const TRACK_NOTE_STRIDE = 4;

/** A dead (muted) note: struck, without a pitch. */
export const NOTE_DEAD = 1;
/** Tied to the note before: it keeps sounding, without a new attack. */
export const NOTE_TIED = 2;
export const NOTE_HARMONIC = 4;
export const NOTE_GHOST = 8;
