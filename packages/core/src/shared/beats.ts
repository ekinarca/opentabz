/**
 * Every beat of one track, for the editor (EDIT-004): where each beat is, as edits address it
 * (EDIT-001), and what it holds. Staff by staff, bar by bar, voice by voice, beat by beat, in
 * score order. Built in the engine worker on request; alphaTab-free.
 */
export interface TrackBeats {
  readonly trackIndex: number;
  /**
   * Per beat: [beatId, staff, bar (master bar), voice, beat, duration, dots, flags, firstNote,
   * noteCount, end, barLength]. The duration is alphaTab's: 1 a whole note, 2 a half … 256, −2 a
   * double whole note. `end` is where the beat ends in its bar, as written, and `barLength` how
   * long the bar is, in ticks (960 a quarter note): a voice whose last beat ends before its bar
   * does has room for more.
   */
  readonly beats: Int32Array;
  /**
   * Per note: [string (1 the lowest, as alphaTab numbers them; 0 without strings), fret, flags
   * (TECHNIQUE_…)].
   */
  readonly notes: Int32Array;
  /**
   * Per beat, as `beats` lists them: [dynamics (its index in DYNAMICS, −1 another), beaming (0
   * automatic, 1 split, 2 joined, −1 another)].
   */
  readonly beatMarks: Int32Array;
  /**
   * Per note, as `notes` lists them: [fretting finger, picking finger (their index in FINGERS),
   * spelling (0 automatic, 1 sharp, 2 flat, 3 natural, −1 another)].
   */
  readonly noteMarks: Int32Array;
  /** The text written above beats: [beatId, text]. */
  readonly texts: readonly (readonly [number, string])[];
}

export const TRACK_BEATS_STRIDE = 12;
export const TRACK_BEAT_NOTE_STRIDE = 3;
export const TRACK_BEAT_MARK_STRIDE = 2;
export const TRACK_NOTE_MARK_STRIDE = 3;

/** Beaming as `beatMarks` numbers it. */
export const BEAMING_ORDER = ['auto', 'split', 'join'] as const;

/** Spelling as `noteMarks` numbers it. */
export const SPELLING_ORDER = ['auto', 'sharp', 'flat', 'natural'] as const;

/** The beat of an empty bar, which holds its place until something is written. */
export const BEAT_EMPTY = 1;
/** A rest (a beat without notes). */
export const BEAT_REST = 2;
/** A grace note's beat. */
export const BEAT_GRACE = 4;
/** A beat in a tuplet. */
export const BEAT_TUPLET = 8;
/** A beat of a triplet (three in the time of two). */
export const BEAT_TRIPLET = 16;
/** Vibrato with the tremolo bar. */
export const BEAT_BAR_VIBRATO = 32;
export const BEAT_SLAP = 64;
export const BEAT_POP = 128;
export const BEAT_TAP = 256;
export const BEAT_FADE_IN = 512;
export const BEAT_FADE_OUT = 1024;
export const BEAT_STROKE_UP = 2048;
export const BEAT_STROKE_DOWN = 4096;
export const BEAT_TREMOLO = 8192;

/** A note's techniques (EDIT-014), as flags. */
export const TECHNIQUE_TIE = 1;
export const TECHNIQUE_HAMMER = 2;
/** A legato slide to the next note. */
export const TECHNIQUE_SLIDE = 4;
export const TECHNIQUE_VIBRATO = 8;
export const TECHNIQUE_PALM_MUTE = 16;
export const TECHNIQUE_LET_RING = 32;
export const TECHNIQUE_DEAD = 64;
export const TECHNIQUE_GHOST = 128;
export const TECHNIQUE_NATURAL_HARMONIC = 256;
export const TECHNIQUE_ACCENT = 512;
export const TECHNIQUE_HEAVY_ACCENT = 1024;
export const TECHNIQUE_STACCATO = 2048;
export const TECHNIQUE_BEND = 4096;
