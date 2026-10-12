/**
 * How a score is engraved: Guitar Pro's stylesheet (REND-218…), as the file has it or as changed
 * in the Stylesheet panel. Plain data for the UI and the engine.
 */
import type { ChordSpelling } from './chord-spelling.ts';
import { DEFAULT_MUSIC_FONT } from './music-font.ts';
import { DEFAULT_TEXT_FONTS, sameTextFonts, type TextFonts } from './text-fonts.ts';
import {
  DEFAULT_PAGE_FURNITURE,
  DEFAULT_TEXT_BLOCKS,
  DEFAULT_TITLE_BLOCK,
  samePageFurniture,
  sameTextBlocks,
  sameTitleBlock,
  type PageFurniture,
  type TextBlocks,
  type TitleBlock,
} from './page-text.ts';

/** Brackets and braces: none, a track's own staves, or tracks of similar instruments too. */
export const BRACKET_MODES = ['none', 'staves', 'similar'] as const;
export type BracketMode = (typeof BRACKET_MODES)[number];

/** Where track names are written: nowhere, on the first system, or on every system. */
export const TRACK_NAME_PLACES = ['hidden', 'first', 'all'] as const;
export type TrackNamePlace = (typeof TRACK_NAME_PLACES)[number];

export const TRACK_NAME_TEXTS = ['full', 'short'] as const;
export type TrackNameText = (typeof TRACK_NAME_TEXTS)[number];

export const TEXT_ORIENTATIONS = ['horizontal', 'vertical'] as const;
export type TextOrientation = (typeof TEXT_ORIENTATIONS)[number];

export interface ScoreStyle {
  /** The size of the whole score (Guitar Pro's overall scale), 1 = 100 %. */
  readonly scale: number;
  /** Text and chord diagrams keep their size when the score is scaled (REND-223). */
  readonly keepTextSize: boolean;
  /** How much room the durations take across the page (rhythmic spacing), 1 = as usual. */
  readonly spacing: number;
  /** How thick the staff lines are drawn, 1 = as usual (REND-228). */
  readonly staffLineThickness: number;
  /** The space between systems, 1 = as usual, 0 = none (REND-228). */
  readonly systemSpacing: number;
  /** How far the first system is indented, in millimetres (REND-228). */
  readonly firstSystemIndent: number;
  readonly hideDynamics: boolean;
  /** 4/4 and 2/2 written as C and cut C (REND-248). */
  readonly commonTime: boolean;
  /** Standard notation writes the pitch a bend reaches (REND-248). */
  readonly bentPitch: boolean;
  /** The rests of voices 2 to 4 left out of the notation (REND-248). */
  readonly hideExtraRests: boolean;
  /** Tuplets bracketed, besides their numbers (REND-248). */
  readonly tupletBrackets: boolean;
  /** Arpeggios (rolled chords) with arrowheads (REND-249). */
  readonly arpeggioArrows: boolean;
  /** A trill's second note written in the tablature (REND-249). */
  readonly trillNote: boolean;
  /** "sl." written over slides (REND-249). */
  readonly slideLabel: boolean;
  /** Every tied note's fret written in the tablature, not only at the start of a bar (REND-250). */
  readonly tiedTabNotes: boolean;
  /** Quarter rests in the tablature written as a dash (REND-250). */
  readonly dashQuarterRests: boolean;
  /** Tablature frets of voices 2 to 4 in green, pink and purple (REND-250). */
  readonly voiceColors: boolean;
  /** Beams drawn level in standard notation, and in drum notation (REND-246). */
  readonly flatBeams: boolean;
  readonly flatDrumBeams: boolean;
  /** The clef on every system, or the first only (REND-231). */
  readonly clefOnEverySystem: boolean;
  /** The time signature on every system, and at every section (REND-231). */
  readonly timeSignatureOnEverySystem: boolean;
  readonly timeSignatureAtSections: boolean;
  /** Palm mute, let ring, harmonics and pick slides carry their lines over rests (REND-243). */
  readonly linesOverRests: boolean;
  /** Tempo marks where the tempo is set or changes (REND-210). */
  readonly tempoMarks: boolean;
  /** Tempo marks with their decimals (120.5), or rounded to whole beats per minute (REND-240). */
  readonly tempoDecimals: boolean;
  /** Lyrics under the staves. */
  readonly lyrics: boolean;
  readonly brackets: BracketMode;
  /** Brackets and braces even around a single staff. */
  readonly singleStaffBrackets: boolean;
  /** Barlines run through all the staves of a system. */
  readonly extendBarLines: boolean;
  /** The // sign between systems. */
  readonly systemSeparator: boolean;
  /** The tuning legend at the start of the score. */
  readonly tuning: boolean;
  /** Chord diagrams in a grid above the music. */
  readonly chordDiagramsOnTop: boolean;
  /** Chord diagrams above the beats that carry them. */
  readonly chordDiagramsInScore: boolean;
  /** The size of the chord diagrams above the music, 1 = as usual (REND-227). */
  readonly chordDiagramsOnTopSize: number;
  /** The space between the chord diagrams above the music, 1 = as usual (REND-227). */
  readonly chordDiagramsOnTopSpacing: number;
  /** The size of the chord diagrams above their beats, 1 = as usual (REND-227). */
  readonly chordDiagramsInScoreSize: number;
  /**
   * The room each chord diagram above its beat takes along the staff, as a share of its width
   * (REND-227): at 1 the diagrams of beats close together just keep apart, at 0 they may overlap.
   */
  readonly chordDiagramsInScoreSpacing: number;
  /** How chord names are spelled: as written, or in a classic, jazz or rock style (REND-226). */
  readonly chordSpelling: ChordSpelling;
  /** Track names when one track is shown, and when several are. */
  readonly singleTrackNames: TrackNamePlace;
  readonly multiTrackNames: TrackNamePlace;
  /** Full or short track names, on the first system and on the others. */
  readonly firstSystemNames: TrackNameText;
  readonly otherSystemNames: TrackNameText;
  readonly firstSystemNamesOrientation: TextOrientation;
  readonly otherSystemNamesOrientation: TextOrientation;
  /** Bars of rest in a row drawn as one multi-bar rest. */
  readonly multiBarRests: boolean;
  /** Staves that rest for a whole system are left out, on the first system too if asked. */
  readonly hideEmptyStaves: boolean;
  readonly hideEmptyStavesInFirstSystem: boolean;
  /** The lines of the title block on the first page (REND-236, REND-237). */
  readonly titleBlock: TitleBlock;
  /** The instructions and the notice under the title block, if shown (REND-041). */
  readonly textBlocks: TextBlocks;
  /** The pages' running header and footer, the first page's and the later ones' (REND-237). */
  readonly pages: PageFurniture;
  /** The font of each kind of text (REND-238). */
  readonly fonts: TextFonts;
  /** The music font the notation is set in: Bravura, Petaluma or one's own (REND-241). */
  readonly musicFont: string;
}

export const STYLE_SCALE = { min: 0.5, max: 2 } as const;
export const STYLE_SPACING = { min: 0.5, max: 2 } as const;
export const STYLE_LINE_THICKNESS = { min: 0.5, max: 3 } as const;
export const STYLE_SYSTEM_SPACING = { min: 0, max: 4 } as const;
export const STYLE_INDENT_MM = { min: 0, max: 50 } as const;
export const STYLE_DIAGRAM_SIZE = { min: 0.5, max: 2 } as const;
export const STYLE_DIAGRAM_SPACING = { min: 0, max: 3 } as const;

/** alphaTab's own defaults, for scores that bring no stylesheet. */
export const DEFAULT_SCORE_STYLE: ScoreStyle = {
  scale: 1,
  keepTextSize: false,
  spacing: 1,
  staffLineThickness: 1,
  systemSpacing: 1,
  firstSystemIndent: 0,
  hideDynamics: false,
  commonTime: false,
  bentPitch: true,
  hideExtraRests: false,
  tupletBrackets: true,
  arpeggioArrows: true,
  trillNote: true,
  slideLabel: true,
  tiedTabNotes: false,
  dashQuarterRests: false,
  voiceColors: false,
  flatBeams: false,
  flatDrumBeams: false,
  clefOnEverySystem: true,
  timeSignatureOnEverySystem: false,
  timeSignatureAtSections: false,
  linesOverRests: false,
  tempoMarks: true,
  tempoDecimals: true,
  lyrics: true,
  brackets: 'staves',
  singleStaffBrackets: false,
  extendBarLines: false,
  systemSeparator: false,
  tuning: true,
  chordDiagramsOnTop: true,
  chordDiagramsInScore: false,
  chordDiagramsOnTopSize: 1,
  chordDiagramsOnTopSpacing: 1,
  chordDiagramsInScoreSize: 1,
  chordDiagramsInScoreSpacing: 1,
  chordSpelling: 'written',
  singleTrackNames: 'first',
  multiTrackNames: 'first',
  firstSystemNames: 'short',
  otherSystemNames: 'short',
  firstSystemNamesOrientation: 'vertical',
  otherSystemNamesOrientation: 'vertical',
  multiBarRests: false,
  hideEmptyStaves: false,
  hideEmptyStavesInFirstSystem: false,
  titleBlock: DEFAULT_TITLE_BLOCK,
  textBlocks: DEFAULT_TEXT_BLOCKS,
  pages: DEFAULT_PAGE_FURNITURE,
  fonts: DEFAULT_TEXT_FONTS,
  musicFont: DEFAULT_MUSIC_FONT,
};

const STYLE_KEYS = Object.keys(DEFAULT_SCORE_STYLE) as (keyof ScoreStyle)[];

function sameSetting(a: ScoreStyle, b: ScoreStyle, key: keyof ScoreStyle): boolean {
  switch (key) {
    case 'titleBlock':
      return sameTitleBlock(a.titleBlock, b.titleBlock);
    case 'textBlocks':
      return sameTextBlocks(a.textBlocks, b.textBlocks);
    case 'pages':
      return samePageFurniture(a.pages, b.pages);
    case 'fonts':
      return sameTextFonts(a.fonts, b.fonts);
    default:
      return a[key] === b[key];
  }
}

export function sameScoreStyle(a: ScoreStyle, b: ScoreStyle): boolean {
  return STYLE_KEYS.every(key => sameSetting(a, b, key));
}

/** The settings that differ between two styles. */
export function styleChanges(style: ScoreStyle, from: ScoreStyle): (keyof ScoreStyle)[] {
  return STYLE_KEYS.filter(key => !sameSetting(style, from, key));
}
