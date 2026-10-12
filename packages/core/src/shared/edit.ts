/**
 * The editor's commands (EDIT-001), as the page sends them to the engine, and what an edit answers.
 * Commands are plain data. Places are counted from 0 (track, staff, master bar, voice, beat) as
 * alphaTab counts them; a string from 1, the lowest, as alphaTab numbers strings.
 */
import type { DocSummary } from './summary.ts';

/** Where a beat is. */
export interface BeatAddress {
  readonly track: number;
  readonly staff: number;
  /** The master bar. */
  readonly bar: number;
  readonly voice: number;
  readonly beat: number;
}

/** Where a note is: its beat, and its string (1 the lowest). */
export interface NoteAddress extends BeatAddress {
  readonly string: number;
}

/** A written duration: 1 a whole note, 2 a half … 64 a sixty-fourth. */
export type DurationValue = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export const DURATION_VALUES: readonly DurationValue[] = [1, 2, 4, 8, 16, 32, 64];

/** The highest fret a note may be written on. */
export const MAX_FRET = 99;

export type SlideOut = 'none' | 'legato' | 'shift' | 'out-down' | 'out-up';
export type Vibrato = 'none' | 'slight' | 'wide';
export type Harmonic = 'none' | 'natural' | 'artificial' | 'pinch' | 'tap' | 'semi' | 'feedback';
export type Accent = 'none' | 'normal' | 'heavy' | 'tenuto';
/** A bend: none, or a whole tone up (Guitar Pro's default bend). */
export type Bend = 'none' | 'full';

/** A note's techniques (EDIT-014), as Guitar Pro's keys set them: each one given is set. */
export interface NoteTechniques {
  /** Held on from the note before it on the string (L); written on a string without a note, it adds one. */
  readonly tie?: boolean;
  /** Hammered on or pulled off to the next note on the string (H). */
  readonly hammer?: boolean;
  /** Slid to the next note (S), or out of the note. */
  readonly slide?: SlideOut;
  /** Left-hand vibrato (V). */
  readonly vibrato?: Vibrato;
  readonly palmMute?: boolean;
  readonly letRing?: boolean;
  readonly dead?: boolean;
  readonly ghost?: boolean;
  readonly harmonic?: Harmonic;
  readonly accent?: Accent;
  readonly staccato?: boolean;
  readonly bend?: Bend;
}

export type Tuplet = 'none' | 'triplet';
export type Fade = 'none' | 'in' | 'out' | 'swell';
export type Stroke = 'none' | 'up' | 'down';

/** A beat's techniques (EDIT-014): each one given is set. */
export interface BeatTechniques {
  /** Three in the time of two (/), or none. */
  readonly tuplet?: Tuplet;
  /** Vibrato with the tremolo bar (W). */
  readonly barVibrato?: Vibrato;
  readonly slap?: boolean;
  readonly pop?: boolean;
  readonly tap?: boolean;
  readonly fade?: Fade;
  readonly stroke?: Stroke;
  /** Tremolo picking: the marks across the stem (3: thirty-second notes, Guitar Pro's "), or 0. */
  readonly tremolo?: number;
}

export type EditCommand =
  /** The note on a string of a beat, written on a fret (added, or moved there and no longer tied). */
  | { readonly kind: 'set-fret'; readonly at: NoteAddress; readonly fret: number }
  /** The note on a string of a beat taken away; a beat without notes is a rest. */
  | { readonly kind: 'remove-note'; readonly at: NoteAddress }
  /** A beat's duration and dots. */
  | {
      readonly kind: 'set-duration';
      readonly at: BeatAddress;
      readonly duration: DurationValue;
      readonly dots: number;
    }
  /**
   * A rest put in before a beat (or after the last, at the voice's length), as long as the beat it
   * is put in before (or the last); in an empty bar, the first beat written.
   */
  | { readonly kind: 'insert-beat'; readonly at: BeatAddress }
  /** A beat taken away; the only beat of a voice leaves the bar empty. */
  | { readonly kind: 'remove-beat'; readonly at: BeatAddress }
  /**
   * An empty bar put in before a master bar (or after the last, at the score's length), in every
   * track, in the meter of the bar it is put in before (or of the last) and each staff's clef and key.
   */
  | { readonly kind: 'insert-bar'; readonly bar: number }
  /** A bar taken away from every track; a score keeps at least one. */
  | { readonly kind: 'remove-bar'; readonly bar: number }
  /** A note's techniques set (EDIT-014). */
  | { readonly kind: 'set-note'; readonly at: NoteAddress; readonly techniques: NoteTechniques }
  /** A beat's techniques set (EDIT-014). */
  | { readonly kind: 'set-beat'; readonly at: BeatAddress; readonly techniques: BeatTechniques };

/** What an edit, an undo or a redo did to a document. */
export interface EditOutcome {
  /** Whether the score changed: undoing with nothing to undo, or an empty edit, leaves it as it was. */
  readonly changed: boolean;
  /** The first master bar whose engraving may have changed. */
  readonly firstChangedMasterBar: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /**
   * The score's version: the same number for the same content, reached by editing, undoing or
   * redoing (0 as opened), to tell a saved version from changes.
   */
  readonly revision: number;
  /** The document as it is now. */
  readonly summary: DocSummary;
}
