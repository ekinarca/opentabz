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

export type TripletFeel =
  'none' | 'triplet-8th' | 'triplet-16th' | 'dotted-8th' | 'dotted-16th' | 'scottish-8th' | 'scottish-16th';

export const TRIPLET_FEELS: readonly TripletFeel[] = [
  'none',
  'triplet-8th',
  'triplet-16th',
  'dotted-8th',
  'dotted-16th',
  'scottish-8th',
  'scottish-16th',
];

export type BarLine =
  'automatic' | 'double' | 'final' | 'heavy' | 'dashed' | 'dotted' | 'short' | 'tick' | 'none';

export const BAR_LINES: readonly BarLine[] = [
  'automatic',
  'double',
  'final',
  'heavy',
  'dashed',
  'dotted',
  'short',
  'tick',
  'none',
];

/** The note values a time signature may count in. */
export const METER_DENOMINATORS: readonly number[] = [1, 2, 4, 8, 16, 32];

/** The slowest and fastest tempo written (quarter notes a minute). */
export const MIN_TEMPO = 10;
export const MAX_TEMPO = 999;

/** How many times a repeat may be played, and how many alternate endings a bar may belong to. */
export const MAX_REPEATS = 99;
export const MAX_ENDINGS = 8;

/** A bar's properties (EDIT-021 … EDIT-027), for every track: each one given is set. */
export interface BarProperties {
  /** The time signature, from this bar to the next one with a meter of its own. */
  readonly meter?: { readonly numerator: number; readonly denominator: number };
  /** The key (−7 seven flats … 7 seven sharps), major or minor, to the next change of key. */
  readonly key?: { readonly signature: number; readonly minor: boolean };
  /** A tempo from the start of the bar (quarter notes a minute), or none. */
  readonly tempo?: number | null;
  /** The tempo changes gradually from this bar's to the next one written (a ramp, accel. or rit.). */
  readonly tempoRamp?: boolean;
  readonly repeatStart?: boolean;
  /** How many times the repeat ending at this bar is played: 0 when none ends here, else 2 or more. */
  readonly repeatCount?: number;
  /** The passes through a repeat this bar is played on (an alternate ending): a bit per pass, 1 the first. */
  readonly alternateEndings?: number;
  /** A section starting at this bar ("A", "Verse"), or none. */
  readonly section?: { readonly marker: string; readonly text: string } | null;
  /** The bar line at its end, in every staff: automatic (single, or a repeat's), double, final… */
  readonly barLine?: BarLine;
  /** Played out of time, its meter in brackets. */
  readonly freeTime?: boolean;
  readonly tripletFeel?: TripletFeel;
  /** A pickup bar, as long as its notes (the first bar only). */
  readonly anacrusis?: boolean;
}

/** A bar's properties as they are (all of them). */
export type BarState = Required<BarProperties>;

/** The most strings a staff may have, and the frets a capo may sit on. */
export const MAX_STRINGS = 10;
export const MAX_CAPO = 24;

/** A track's instrument and how it is written (EDIT-030 … EDIT-036): each one given is set. */
export interface TrackProperties {
  readonly name?: string;
  readonly shortName?: string;
  /** A CSS colour, #rrggbb. */
  readonly color?: string;
  /** General MIDI program, 0–127. */
  readonly program?: number;
  /** Its first staff's strings, as MIDI note numbers from the highest; none for a staff without strings. */
  readonly tuning?: readonly number[];
  readonly capo?: number;
  /** Semitones the part is written above how it sounds (a transposing instrument: 12 for a guitar). */
  readonly transposition?: number;
}

/** A track put in (EDIT-030). */
export interface NewTrack {
  readonly name: string;
  readonly shortName: string;
  readonly program: number;
  /** MIDI note numbers from the highest string; none for an instrument without strings. */
  readonly tuning: readonly number[];
  readonly percussion: boolean;
  readonly color?: string;
}

/** A track's properties as they are. */
export type TrackState = Required<TrackProperties> & { readonly percussion: boolean };

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
  | { readonly kind: 'set-beat'; readonly at: BeatAddress; readonly techniques: BeatTechniques }
  /** A bar's properties set, in every track (EDIT-021 … EDIT-027). */
  | { readonly kind: 'set-bar'; readonly bar: number; readonly properties: BarProperties }
  /** A track put in at a place among the others (the end: the number of tracks), its bars empty. */
  | { readonly kind: 'add-track'; readonly at: number; readonly track: NewTrack }
  /** A track taken away; a score keeps at least one. */
  | { readonly kind: 'remove-track'; readonly track: number }
  /** A track moved to another place among the others. */
  | { readonly kind: 'move-track'; readonly track: number; readonly to: number }
  /** A track's properties set. */
  | { readonly kind: 'set-track'; readonly track: number; readonly properties: TrackProperties };

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
  /**
   * Where each track was before, when tracks were put in, taken away or moved: by track, its index
   * before (−1 for a track put in); null when the tracks are as they were.
   */
  readonly trackOrigins: readonly number[] | null;
}
