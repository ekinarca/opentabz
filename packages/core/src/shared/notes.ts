/**
 * The notes of one track as instrument views (the fretboard, the keyboard) show them, beat by
 * beat, from every staff with pitches (not drums). Built in the engine worker on request;
 * alphaTab-free.
 */
export interface TrackNotes {
  readonly trackIndex: number;
  /** The track's first staff with strings (the fretboard's), or null if none. */
  readonly staffIndex: number | null;
  /**
   * Per beat with notes: [beatId, firstNote, noteCount, keySignature (-7 flats to 7 sharps),
   * staff index].
   */
  readonly beats: Int32Array;
  /**
   * Per note: [string, fret, pitch, flags]. On the staff with strings, strings are numbered as
   * in tablature (1 is the highest) and frets count from the capo; elsewhere both are 0. The
   * pitch is the MIDI note that sounds.
   */
  readonly notes: Int32Array;
}

export const TRACK_BEAT_STRIDE = 5;
export const TRACK_NOTE_STRIDE = 4;

/** A dead (muted) note: struck, without a pitch. */
export const NOTE_DEAD = 1;
/** Tied to the note before: it keeps sounding, without a new attack. */
export const NOTE_TIED = 2;
export const NOTE_HARMONIC = 4;
export const NOTE_GHOST = 8;
