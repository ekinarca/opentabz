/**
 * How a score is engraved: Guitar Pro's stylesheet (REND-218…), as the file has it or as changed
 * in the Stylesheet panel. Plain data for the UI and the engine.
 */

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
}

export const STYLE_SCALE = { min: 0.5, max: 2 } as const;
export const STYLE_SPACING = { min: 0.5, max: 2 } as const;

/** alphaTab's own defaults, for scores that bring no stylesheet. */
export const DEFAULT_SCORE_STYLE: ScoreStyle = {
  scale: 1,
  keepTextSize: false,
  spacing: 1,
  hideDynamics: false,
  brackets: 'staves',
  singleStaffBrackets: false,
  extendBarLines: false,
  systemSeparator: false,
  tuning: true,
  chordDiagramsOnTop: true,
  chordDiagramsInScore: false,
  singleTrackNames: 'first',
  multiTrackNames: 'first',
  firstSystemNames: 'short',
  otherSystemNames: 'short',
  firstSystemNamesOrientation: 'vertical',
  otherSystemNamesOrientation: 'vertical',
  multiBarRests: false,
  hideEmptyStaves: false,
  hideEmptyStavesInFirstSystem: false,
};

const STYLE_KEYS = Object.keys(DEFAULT_SCORE_STYLE) as (keyof ScoreStyle)[];

export function sameScoreStyle(a: ScoreStyle, b: ScoreStyle): boolean {
  return STYLE_KEYS.every(key => a[key] === b[key]);
}

/** The settings that differ between two styles. */
export function styleChanges(style: ScoreStyle, from: ScoreStyle): (keyof ScoreStyle)[] {
  return STYLE_KEYS.filter(key => style[key] !== from[key]);
}
