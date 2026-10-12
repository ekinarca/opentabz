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
  | { readonly kind: 'remove-beat'; readonly at: BeatAddress };

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
