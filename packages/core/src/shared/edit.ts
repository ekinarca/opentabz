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

/** The most steps of a scale a diatonic transposition moves notes, and letters an interval spans (four octaves). */
export const MAX_DEGREES = 28;

export type SlideOut = 'none' | 'legato' | 'shift' | 'out-down' | 'out-up';
export type Vibrato = 'none' | 'slight' | 'wide';
export type Harmonic = 'none' | 'natural' | 'artificial' | 'pinch' | 'tap' | 'semi' | 'feedback';
export const HARMONIC_TYPES: readonly Harmonic[] = [
  'none',
  'natural',
  'artificial',
  'pinch',
  'tap',
  'semi',
  'feedback',
];
export type Accent = 'none' | 'normal' | 'heavy' | 'tenuto';
/** A bend: none, or a whole tone up (Guitar Pro's default bend). */
export type Bend = 'none' | 'full';

/** A slide into a note: from below or from above (EDIT-014). */
export type SlideIn = 'none' | 'from-below' | 'from-above';
export const SLIDE_INS: readonly SlideIn[] = ['none', 'from-below', 'from-above'];

/** An ornament on a note (EDIT-014): a turn, an inverted turn, an upper or a lower mordent. */
export type Ornament = 'none' | 'turn' | 'inverted-turn' | 'upper-mordent' | 'lower-mordent';
export const ORNAMENTS: readonly Ornament[] = [
  'none',
  'turn',
  'inverted-turn',
  'upper-mordent',
  'lower-mordent',
];

/** How fast a trill goes, as the note value of each of its notes. */
export type TrillSpeed = 16 | 32 | 64;
export const TRILL_SPEEDS: readonly TrillSpeed[] = [16, 32, 64];

/** A trill (EDIT-014): the fret it trills with on the note's string (without strings, the pitch), how fast. */
export interface Trill {
  readonly fret: number;
  readonly speed: TrillSpeed;
}

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
  readonly slideIn?: SlideIn;
  /** A trill with another fret, or none. */
  readonly trill?: Trill | null;
  readonly ornament?: Ornament;
  /** Tapped with the fretting hand. */
  readonly leftTap?: boolean;
  /**
   * Where a harmonic is touched (EDIT-113), one of HARMONIC_NODES: a natural harmonic's node (its
   * fret follows), else the frets above the note held.
   */
  readonly harmonicAt?: number;
}

/** A note's techniques as they are. */
export type NoteState = Required<NoteTechniques>;

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
  /**
   * How beams group the bar's notes from this bar on (EDIT-105): the groups' lengths in a note
   * value (7/8 as 2+2+3 eighths), filling the bar; or none, as the meter groups them.
   */
  readonly beamGroups?: BeamGroups | null;
}

/** A note value beams are grouped in. */
export type BeamUnit = 4 | 8 | 16 | 32;
export const BEAM_UNITS: readonly BeamUnit[] = [4, 8, 16, 32];

/** Beam groups: how many of a note value each group holds. */
export interface BeamGroups {
  readonly unit: BeamUnit;
  readonly groups: readonly number[];
}

/** A bar's properties as they are (all of them). */
export type BarState = Required<BarProperties>;

/**
 * A clef (EDIT-107): treble (G on the second line), bass (F on the fourth), alto and tenor (C on
 * the third and the fourth), or neutral, for drums.
 */
export type Clef = 'treble' | 'bass' | 'alto' | 'tenor' | 'neutral';
export const CLEFS: readonly Clef[] = ['treble', 'bass', 'alto', 'tenor', 'neutral'];

/** Octaves a clef sounds above (15ma, 8va) or below (8vb, 15mb) what it writes: a guitar's sounds 8vb. */
export type ClefOttava = '15ma' | '8va' | 'none' | '8vb' | '15mb';
export const CLEF_OTTAVAS: readonly ClefOttava[] = ['15ma', '8va', 'none', '8vb', '15mb'];

/** A simile mark (EDIT-108): a bar played as the one before it, or two bars as the two before them. */
export type Simile = 'none' | 'one-bar' | 'two-bar';
export const SIMILES: readonly Simile[] = ['none', 'one-bar', 'two-bar'];

/** A staff's own properties at a bar (EDIT-107, EDIT-108): each one given is set. */
export interface StaffBarProperties {
  /** The clef, from the bar to the staff's next change of clef. */
  readonly clef?: Clef;
  readonly clefOttava?: ClefOttava;
  /** With a new clef, the notes keep their places on the staff, their pitches changing; else their pitches. */
  readonly keepPlaces?: boolean;
  /** A simile mark at the bar (a two-bar one over it and the next), the bars' notes taken away. */
  readonly simile?: Simile;
}

/** A staff's own properties at a bar, as they are. */
export type StaffBarState = Required<Omit<StaffBarProperties, 'keepPlaces'>>;

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
  /** The tuning's name, shown with it in the score ("Drop D"); empty for none (EDIT-073). */
  readonly tuningName?: string;
  /** With strings, how its first staff is written (EDIT-066). */
  readonly notation?: TrackNotation;
  readonly capo?: number;
  /** Semitones the part is written above how it sounds (a transposing instrument: 12 for a guitar). */
  readonly transposition?: number;
  /**
   * With a new tuning, the notes keep their pitches (EDIT-054): their frets change, and a note
   * goes to another string where its own has no fret for it. Without, they keep their frets.
   */
  readonly keepPitches?: boolean;
}

/** A score's information (EDIT-089), as its title block and credits show it: each one given is set. */
export interface ScoreInfo {
  readonly title?: string;
  readonly subtitle?: string;
  readonly artist?: string;
  readonly album?: string;
  readonly words?: string;
  readonly music?: string;
  readonly copyright?: string;
  /** Who wrote the tablature. */
  readonly tab?: string;
  readonly instructions?: string;
  readonly notices?: string;
}

export const SCORE_INFO_FIELDS = [
  'title',
  'subtitle',
  'artist',
  'album',
  'words',
  'music',
  'copyright',
  'tab',
  'instructions',
  'notices',
] as const satisfies readonly (keyof ScoreInfo)[];

/** The longest a field of a score's information may be (instructions and notices: several lines). */
export const MAX_INFO = 200;
export const MAX_INFO_TEXT = 4000;

/** How a track with strings is written: standard notation and tablature, or one of them (EDIT-066). */
export type TrackNotation = 'both' | 'standard' | 'tablature';
export const TRACK_NOTATIONS: readonly TrackNotation[] = ['both', 'standard', 'tablature'];

/** The clef an instrument without strings is written in (EDIT-067). */
export type TrackClef = 'treble' | 'bass' | 'alto';

/** A track put in (EDIT-030). */
export interface NewTrack {
  readonly name: string;
  readonly shortName: string;
  readonly program: number;
  /** MIDI note numbers from the highest string; none for an instrument without strings. */
  readonly tuning: readonly number[];
  readonly percussion: boolean;
  readonly color?: string;
  /** Its clef; by default a staff with strings is written as a guitar's or a bass's, others in treble. */
  readonly clef?: TrackClef;
  /** Semitones it is written above how it sounds (a B♭ clarinet: 2; a piccolo: −12). */
  readonly transposition?: number;
  /** With strings, how it is written; both by default. */
  readonly notation?: TrackNotation;
}

/** A track's properties as they are. */
export type TrackState = Required<Omit<TrackProperties, 'keepPitches'>> & { readonly percussion: boolean };

/** A strum across the strings, or an arpeggio, down (from the lowest string) or up (EDIT-114). */
export type Brush = 'none' | 'down' | 'up' | 'arpeggio-down' | 'arpeggio-up';
export const BRUSHES: readonly Brush[] = ['none', 'down', 'up', 'arpeggio-down', 'arpeggio-up'];

/** How long a strum or an arpeggio takes from its first string to its last, as a note value. */
export type BrushLength = 4 | 8 | 16 | 32 | 64 | 128;
export const BRUSH_LENGTHS: readonly BrushLength[] = [4, 8, 16, 32, 64, 128];

/** A grace note's beat: played before the beat, on it, or as a bend's grace; none, a beat of its own. */
export type Grace = 'none' | 'before' | 'on-beat' | 'bend';
export const GRACES: readonly Grace[] = ['none', 'before', 'on-beat', 'bend'];

/** A fermata over a beat, every track's at that moment: short, as usual, or long. */
export type Fermata = 'none' | 'short' | 'medium' | 'long';
export const FERMATAS: readonly Fermata[] = ['none', 'short', 'medium', 'long'];

/** A hairpin from a beat: getting louder or softer. */
export type Hairpin = 'none' | 'crescendo' | 'decrescendo';
export const HAIRPINS: readonly Hairpin[] = ['none', 'crescendo', 'decrescendo'];

/** Octaves a beat is played above (8va, 15ma) or below (8vb, 15mb) where it is written. */
export type Ottava = '15ma' | '8va' | 'none' | '8vb' | '15mb';
export const OTTAVAS: readonly Ottava[] = ['15ma', '8va', 'none', '8vb', '15mb'];

/** A golpe: the guitar's top tapped with the thumb or a finger. */
export type Golpe = 'none' | 'thumb' | 'finger';
export const GOLPES: readonly Golpe[] = ['none', 'thumb', 'finger'];

/** A wah pedal open or closed at a beat. */
export type Wah = 'none' | 'open' | 'closed';
export const WAHS: readonly Wah[] = ['none', 'open', 'closed'];

/** A rasgueado: the fingers that strum (i, m, a, e, p), in triplets or anapaests. */
export type Rasgueado =
  | 'none'
  | 'ii'
  | 'mi'
  | 'mii-triplet'
  | 'mii-anapaest'
  | 'pmp-triplet'
  | 'pmp-anapaest'
  | 'pei-triplet'
  | 'pei-anapaest'
  | 'pai-triplet'
  | 'pai-anapaest'
  | 'ami-triplet'
  | 'ami-anapaest'
  | 'ppp'
  | 'amii'
  | 'amip'
  | 'eami'
  | 'eamii'
  | 'peami';
export const RASGUEADOS: readonly Rasgueado[] = [
  'none',
  'ii',
  'mi',
  'mii-triplet',
  'mii-anapaest',
  'pmp-triplet',
  'pmp-anapaest',
  'pei-triplet',
  'pei-anapaest',
  'pai-triplet',
  'pai-anapaest',
  'ami-triplet',
  'ami-anapaest',
  'ppp',
  'amii',
  'amip',
  'eami',
  'eamii',
  'peami',
];

/** A barre over a beat: the fret, across all the strings or half of them. */
export interface Barre {
  readonly fret: number;
  readonly half: boolean;
}

/** A chord over a beat (EDIT-040): its name, as built or typed (EDIT-140), and its diagram. */
export interface ChordDiagram {
  readonly name: string;
  /** Frets from the highest string to the lowest: 0 open, −1 not played. None for a name alone. */
  readonly strings: readonly number[];
  /** The fret at the diagram's top (1: the nut). */
  readonly firstFret: number;
  /** Frets a barre holds. */
  readonly barres: readonly number[];
}

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
  /** A strum or an arpeggio (EDIT-114), and how long it takes. */
  readonly brush?: Brush;
  readonly brushLength?: BrushLength;
  /** A grace note's beat, taking no time of the bar's: its notes played before or on the next beat. */
  readonly grace?: Grace;
  readonly fermata?: Fermata;
  readonly hairpin?: Hairpin;
  readonly ottava?: Ottava;
  readonly golpe?: Golpe;
  readonly wah?: Wah;
  readonly rasgueado?: Rasgueado;
  /** Slapped with its strings muted. */
  readonly deadSlap?: boolean;
  /** Slurred to the next beat. */
  readonly legato?: boolean;
  /** The time it is played at shown over it. */
  readonly timer?: boolean;
  readonly barre?: Barre | null;
}

/** A beat's techniques as they are. */
export type BeatState = Required<BeatTechniques>;

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
  /** A score's information set: title, artist, credits, instructions and notices (EDIT-089). */
  | { readonly kind: 'set-score'; readonly info: ScoreInfo }
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
  | {
      readonly kind: 'paste';
      readonly at: BeatAddress;
      readonly clip: Clip;
      /** How many times, one after another (EDIT-101); once unless said. */
      readonly times?: number;
    }
  /**
   * The notes of a selection a number of semitones higher or lower (EDIT-050, EDIT-051): a note on
   * strings keeps its string while the frets allow, else goes to the nearest string that has room;
   * drums stay as they are. With `letters`, the interval's (a major third: 2, down: −2), the notes
   * are spelled by it (EDIT-116): C♯ a major third up is E♯. With `degrees` instead of semitones,
   * they move by steps of each bar's scale, keeping the accidentals written (EDIT-117). With `keys`,
   * a selection of bars has its keys moved too; with `chords`, the chord diagrams and names of its
   * beats (EDIT-144).
   */
  | {
      readonly kind: 'transpose';
      readonly selection: Selection;
      readonly semitones: number;
      readonly letters?: number;
      readonly degrees?: number;
      readonly keys?: boolean;
      readonly chords?: boolean;
    }
  /** A staff's own properties at a bar set: its clef, a simile mark (EDIT-107, EDIT-108). */
  | {
      readonly kind: 'set-staff-bar';
      readonly track: number;
      readonly staff: number;
      readonly bar: number;
      readonly properties: StaffBarProperties;
    }
  /**
   * A drum sound on a beat of a drum staff (EDIT-034, EDIT-115), or taken off: the sound by its
   * id ("Snare.38") or, as Guitar Pro 5 has them typed, by its General MIDI key (38).
   */
  | {
      readonly kind: 'set-drum';
      readonly at: BeatAddress;
      readonly sound: string | number;
      readonly on: boolean;
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
  /**
   * Palm muting or let ring set (or taken off) on the notes of a selection on chosen strings
   * (EDIT-125, EDIT-126), strings as alphaTab numbers them (1 the lowest).
   */
  | {
      readonly kind: 'mark-strings';
      readonly selection: Selection;
      readonly strings: readonly number[];
      readonly technique: 'palm-mute' | 'let-ring';
      readonly on: boolean;
    }
  /**
   * A chord diagram written over a beat, or taken away (EDIT-040): the staff keeps it; with
   * `writeNotes`, its notes are written into the beat, which has none (EDIT-143).
   */
  | {
      readonly kind: 'set-chord';
      readonly at: BeatAddress;
      readonly chord: ChordDiagram | null;
      readonly writeNotes?: boolean;
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
