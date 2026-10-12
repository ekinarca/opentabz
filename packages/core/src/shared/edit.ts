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

/** A beat's place in a voice of a staff: its master bar, and its index in the bar. */
export interface BeatPlace {
  readonly bar: number;
  readonly beat: number;
}

/**
 * A selection (EDIT-020): the beats of one voice from one to another, both included, across bars;
 * or whole bars of a run of tracks, every staff and voice of theirs.
 */
export type Selection =
  | {
      readonly kind: 'beats';
      readonly track: number;
      readonly staff: number;
      readonly voice: number;
      readonly from: BeatPlace;
      readonly to: BeatPlace;
    }
  | {
      readonly kind: 'bars';
      readonly fromTrack: number;
      readonly toTrack: number;
      readonly fromBar: number;
      readonly toBar: number;
    };

/**
 * What was copied (EDIT-020): beats of a voice, or bars of tracks. Plain data, which the page keeps
 * and hands back with each paste — in the score it came from or another — so that an edit pasting it
 * can be made again, after a reload too.
 */
export interface Clip {
  readonly kind: Selection['kind'];
  /** How many beats were copied (none when bars were). */
  readonly beats: number;
  readonly bars: number;
  readonly tracks: number;
  /** The beats or bars, as a small score in alphaTab's JSON form. */
  readonly score: unknown;
}

/** A written duration: 1 a whole note, 2 a half … 64 a sixty-fourth. */
export type DurationValue = 1 | 2 | 4 | 8 | 16 | 32 | 64;

export const DURATION_VALUES: readonly DurationValue[] = [1, 2, 4, 8, 16, 32, 64];

/** The highest fret a note may be written on. */
export const MAX_FRET = 99;

/** The most voices a staff has, as in Guitar Pro (EDIT-011). */
export const MAX_VOICES = 4;

/** The most semitones a transposition moves notes (four octaves). */
export const MAX_TRANSPOSE = 48;

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
  /** The fretting hand's finger (EDIT-043). */
  readonly leftFinger?: Finger;
  /** The picking hand's finger. */
  readonly rightFinger?: Finger;
  /** Its spelling in standard notation (EDIT-013). */
  readonly spelling?: Spelling;
}

/** A dynamic, from ppp to fff (EDIT-043). */
export type Dynamic = 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff';
export const DYNAMICS: readonly Dynamic[] = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'];

/** A finger of the fretting or the picking hand, or none (EDIT-043). */
export type Finger = 'none' | 'thumb' | 'index' | 'middle' | 'ring' | 'little';
export const FINGERS: readonly Finger[] = ['none', 'thumb', 'index', 'middle', 'ring', 'little'];

/** How a beat's beam goes on to the next beat: as the meter groups it, broken, or joined (EDIT-012). */
export type Beaming = 'auto' | 'split' | 'join';

/** How a note is spelled in standard notation: as the key has it, or with a sharp, a flat, a natural (EDIT-013). */
export type Spelling = 'auto' | 'sharp' | 'flat' | 'natural' | 'double-sharp' | 'double-flat';

/** A direction written at a bar (EDIT-025): a place jumped to, or a jump. */
export type BarDirection =
  | 'fine'
  | 'segno'
  | 'segno-segno'
  | 'coda'
  | 'double-coda'
  | 'da-capo'
  | 'da-capo-al-coda'
  | 'da-capo-al-double-coda'
  | 'da-capo-al-fine'
  | 'dal-segno'
  | 'dal-segno-al-coda'
  | 'dal-segno-al-double-coda'
  | 'dal-segno-al-fine'
  | 'dal-segno-segno'
  | 'dal-segno-segno-al-coda'
  | 'dal-segno-segno-al-double-coda'
  | 'dal-segno-segno-al-fine'
  | 'da-coda'
  | 'da-double-coda';

export const BAR_DIRECTIONS: readonly BarDirection[] = [
  'fine',
  'segno',
  'segno-segno',
  'coda',
  'double-coda',
  'da-capo',
  'da-capo-al-coda',
  'da-capo-al-double-coda',
  'da-capo-al-fine',
  'dal-segno',
  'dal-segno-al-coda',
  'dal-segno-al-double-coda',
  'dal-segno-al-fine',
  'dal-segno-segno',
  'dal-segno-segno-al-coda',
  'dal-segno-segno-al-double-coda',
  'dal-segno-segno-al-fine',
  'da-coda',
  'da-double-coda',
];

/** Notes played in the time of others (EDIT-010): three in the time of two, five in four… */
export type Tuplet = 'none' | 'triplet' | '5:4' | '6:4' | '7:4' | '9:8' | '10:8' | '11:8' | '12:8' | '13:8';
export const TUPLETS: readonly Tuplet[] = [
  'none',
  'triplet',
  '5:4',
  '6:4',
  '7:4',
  '9:8',
  '10:8',
  '11:8',
  '12:8',
  '13:8',
];

/** A harmony a note is given (EDIT-055): a third, a sixth or an octave, in the key. */
export type Harmony = 'third' | 'sixth' | 'octave';
export const HARMONIES: readonly Harmony[] = ['third', 'sixth', 'octave'];

/** Which way a beat's stems point (EDIT-106): as the notes have it, up or down. */
export type Stem = 'auto' | 'up' | 'down';
export const STEMS: readonly Stem[] = ['auto', 'up', 'down'];
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
  /** The directions written at it: Segno, Coda, Fine, D.C., D.S. and their kinds (EDIT-025). */
  readonly directions?: readonly BarDirection[];
  /** A new system starts at the bar (EDIT-109). */
  readonly systemBreak?: boolean;
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
  /**
   * With a new tuning, the notes keep their pitches (EDIT-054): their frets change, and a note
   * goes to another string where its own has no fret for it. Without, they keep their frets.
   */
  readonly keepPitches?: boolean;
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
export type TrackState = Required<Omit<TrackProperties, 'keepPitches'>> & { readonly percussion: boolean };

/** A beat's techniques (EDIT-014): each one given is set. */
export interface BeatTechniques {
  /** Three in the time of two (/), five in four…, or none. */
  readonly tuplet?: Tuplet;
  /** Which way its stems point. */
  readonly stem?: Stem;
  /** Vibrato with the tremolo bar (W). */
  readonly barVibrato?: Vibrato;
  readonly slap?: boolean;
  readonly pop?: boolean;
  readonly tap?: boolean;
  readonly fade?: Fade;
  readonly stroke?: Stroke;
  /** Tremolo picking: the marks across the stem (3: thirty-second notes, Guitar Pro's "), or 0. */
  readonly tremolo?: number;
  /** Text above the beat, or none (EDIT-043). */
  readonly text?: string | null;
  /** How loud the beat's notes are played and marked (EDIT-043). */
  readonly dynamics?: Dynamic;
  /** How its beam goes on to the next beat (EDIT-012). */
  readonly beaming?: Beaming;
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
  | { readonly kind: 'set-track'; readonly track: number; readonly properties: TrackProperties }
  /** A copy of a track put in after it, its notes and all, on MIDI channels of its own. */
  | { readonly kind: 'duplicate-track'; readonly track: number }
  /** A selection's notes taken away: its beats are rests, its bars empty. */
  | { readonly kind: 'clear'; readonly selection: Selection }
  /**
   * A selection taken away: its beats; its bars, from the score when every track is selected,
   * else emptied (every bar of a score selected, they are emptied).
   */
  | { readonly kind: 'remove'; readonly selection: Selection }
  /**
   * What was copied written from a beat on (EDIT-020): beats over the beats there, as long as they
   * are, across bar lines; bars over the bars from the beat's on, in its track and the next ones.
   * Bars are put in at the end when the score is too short.
   */
  | { readonly kind: 'paste'; readonly at: BeatAddress; readonly clip: Clip }
  /**
   * The notes of a selection a number of semitones higher or lower (EDIT-050, EDIT-051): a note on
   * strings keeps its string while the frets allow, else goes to the nearest string that has room;
   * drums stay as they are. With `chords`, the chord diagrams and names of its beats move too
   * (EDIT-144).
   */
  | {
      readonly kind: 'transpose';
      readonly selection: Selection;
      readonly semitones: number;
      readonly chords?: boolean;
    }
  /**
   * The beat before a beat (in its voice, across the bar line) written again over it, as Guitar
   * Pro's C key repeats it (EDIT-094).
   */
  | { readonly kind: 'repeat-beat'; readonly at: BeatAddress }
  /**
   * A voice's contents moved, copied or swapped with another's, in a staff's bars (EDIT-102), as
   * Guitar Pro's voice tool does: moved, the voice left is empty; copied, both have them.
   */
  | {
      readonly kind: 'voice-contents';
      readonly track: number;
      readonly staff: number;
      readonly fromBar: number;
      readonly toBar: number;
      readonly from: number;
      readonly to: number;
      readonly mode: 'move' | 'copy' | 'swap';
    }
  /**
   * Voices put in a staff (EDIT-011): every bar gets as many as `count`, those put in (or left
   * without a beat) empty, to be written in.
   */
  | { readonly kind: 'add-voices'; readonly track: number; readonly staff: number; readonly count: number }
  /**
   * Each note of a selection given another a third, a sixth or an octave above (or below) it, in
   * its bar's key, on the nearest string with room (EDIT-055).
   */
  | {
      readonly kind: 'harmonize';
      readonly selection: Selection;
      readonly harmony: Harmony;
      readonly below: boolean;
    }
  /** A note moved to the next string higher or lower in pitch it can be played on, at its pitch (EDIT-052). */
  | { readonly kind: 'move-string'; readonly at: NoteAddress; readonly higher: boolean };

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
