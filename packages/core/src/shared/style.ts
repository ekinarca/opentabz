/**
 * How a score is engraved: Guitar Pro's stylesheet (REND-218…), as the file has it or as changed
 * in the Stylesheet panel. Plain data for the UI and the engine.
 */
import type { ChordSpelling } from './chord-spelling.ts';
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
  /** Text keeps its size when the score is scaled. */
  readonly keepTextSize: boolean;
  /** How much room the durations take across the page (rhythmic spacing), 1 = as usual. */
  readonly spacing: number;
  readonly hideDynamics: boolean;
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
}

export const STYLE_SCALE = { min: 0.5, max: 2 } as const;
export const STYLE_SPACING = { min: 0.5, max: 2 } as const;

/** alphaTab's own defaults, for scores that bring no stylesheet. */
export const DEFAULT_SCORE_STYLE: ScoreStyle = {
  scale: 1,
  keepTextSize: false,
  spacing: 1,
  hideDynamics: false,
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
