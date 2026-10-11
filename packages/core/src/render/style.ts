/**
 * A score's style in alphaTab's terms (engine worker): read from the stylesheet the file brought
 * (Guitar Pro's, REND-219), and applied around a layout. Only what differs from the file's style
 * is applied, so the per-track settings a file makes stay until the setting is changed for all.
 */
import * as alphaTab from '@coderline/alphatab';
import { spellChord, type ChordSpelling } from '../shared/chord-spelling.ts';
import { DEFAULT_PAGE_FURNITURE } from '../shared/page-text.ts';
import { DEFAULT_TEXT_FONTS } from '../shared/text-fonts.ts';
import { applyTextFonts } from './text-fonts.ts';
import {
  styleChanges,
  type BracketMode,
  type ScoreStyle,
  type TextOrientation,
  type TrackNamePlace,
  type TrackNameText,
} from '../shared/style.ts';
import { applyTitleBlock, applyTitleBlockSettings, readTitleBlock } from './title-block.ts';

const { BracketExtendMode, TrackNameMode, TrackNameOrientation, TrackNamePolicy } = alphaTab.model;

const BRACKETS: Readonly<Record<BracketMode, alphaTab.model.BracketExtendMode>> = {
  none: BracketExtendMode.NoBrackets,
  staves: BracketExtendMode.GroupStaves,
  similar: BracketExtendMode.GroupSimilarInstruments,
};
const PLACES: Readonly<Record<TrackNamePlace, alphaTab.model.TrackNamePolicy>> = {
  hidden: TrackNamePolicy.Hidden,
  first: TrackNamePolicy.FirstSystem,
  all: TrackNamePolicy.AllSystems,
};
const TEXTS: Readonly<Record<TrackNameText, alphaTab.model.TrackNameMode>> = {
  full: TrackNameMode.FullName,
  short: TrackNameMode.ShortName,
};
const ORIENTATIONS: Readonly<Record<TextOrientation, alphaTab.model.TrackNameOrientation>> = {
  horizontal: TrackNameOrientation.Horizontal,
  vertical: TrackNameOrientation.Vertical,
};

function keyOf<K extends string, V>(table: Readonly<Record<K, V>>, value: V, fallback: K): K {
  return (Object.keys(table) as K[]).find(key => table[key] === value) ?? fallback;
}

/** Whether a per-track setting says no for every track. */
function noneOf(map: Map<number, boolean> | null, tracks: readonly alphaTab.model.Track[]): boolean {
  return tracks.length > 0 && map !== null && tracks.every(track => map.get(track.index) === false);
}

/** The style the file brought. */
export function readScoreStyle(score: alphaTab.model.Score): ScoreStyle {
  const sheet = score.stylesheet;
  const { tracks } = score;
  const restsPerTrack = sheet.perTrackMultiBarRest;
  return {
    scale: 1,
    keepTextSize: false,
    spacing: 1,
    hideDynamics: sheet.hideDynamics,
    tempoMarks: true,
    lyrics: true,
    brackets: keyOf(BRACKETS, sheet.bracketExtendMode, 'staves'),
    singleStaffBrackets: sheet.showSingleStaffBrackets,
    extendBarLines: sheet.extendBarLines,
    systemSeparator: sheet.useSystemSignSeparator,
    tuning: sheet.globalDisplayTuning && !noneOf(sheet.perTrackDisplayTuning, tracks),
    chordDiagramsOnTop:
      sheet.globalDisplayChordDiagramsOnTop && !noneOf(sheet.perTrackChordDiagramsOnTop, tracks),
    chordDiagramsInScore: sheet.globalDisplayChordDiagramsInScore,
    chordSpelling: 'written',
    singleTrackNames: keyOf(PLACES, sheet.singleTrackTrackNamePolicy, 'first'),
    multiTrackNames: keyOf(PLACES, sheet.multiTrackTrackNamePolicy, 'first'),
    firstSystemNames: keyOf(TEXTS, sheet.firstSystemTrackNameMode, 'short'),
    otherSystemNames: keyOf(TEXTS, sheet.otherSystemsTrackNameMode, 'short'),
    firstSystemNamesOrientation: keyOf(ORIENTATIONS, sheet.firstSystemTrackNameOrientation, 'vertical'),
    otherSystemNamesOrientation: keyOf(ORIENTATIONS, sheet.otherSystemsTrackNameOrientation, 'vertical'),
    multiBarRests:
      sheet.multiTrackMultiBarRest ||
      (tracks.length > 0 && restsPerTrack !== null && tracks.every(track => restsPerTrack.has(track.index))),
    hideEmptyStaves: sheet.hideEmptyStaves,
    hideEmptyStavesInFirstSystem: sheet.hideEmptyStavesInFirstSystem,
    titleBlock: readTitleBlock(score),
    // alphaTab reads no fonts from Guitar Pro files: the texts start in its own.
    fonts: DEFAULT_TEXT_FONTS,
    // Guitar Pro's page numbers are not among what alphaTab reads: the pages start as ours.
    pages: DEFAULT_PAGE_FURNITURE,
  };
}

/**
 * Applies `style` to the score's stylesheet where it differs from `original` (the file's), and
 * returns what puts the stylesheet back.
 */
export function applyScoreStyle(
  score: alphaTab.model.Score,
  style: ScoreStyle,
  original: ScoreStyle,
): () => void {
  const sheet = score.stylesheet;
  const saved = {
    hideDynamics: sheet.hideDynamics,
    bracketExtendMode: sheet.bracketExtendMode,
    showSingleStaffBrackets: sheet.showSingleStaffBrackets,
    extendBarLines: sheet.extendBarLines,
    useSystemSignSeparator: sheet.useSystemSignSeparator,
    globalDisplayTuning: sheet.globalDisplayTuning,
    perTrackDisplayTuning: sheet.perTrackDisplayTuning,
    globalDisplayChordDiagramsOnTop: sheet.globalDisplayChordDiagramsOnTop,
    perTrackChordDiagramsOnTop: sheet.perTrackChordDiagramsOnTop,
    globalDisplayChordDiagramsInScore: sheet.globalDisplayChordDiagramsInScore,
    singleTrackTrackNamePolicy: sheet.singleTrackTrackNamePolicy,
    multiTrackTrackNamePolicy: sheet.multiTrackTrackNamePolicy,
    firstSystemTrackNameMode: sheet.firstSystemTrackNameMode,
    otherSystemsTrackNameMode: sheet.otherSystemsTrackNameMode,
    firstSystemTrackNameOrientation: sheet.firstSystemTrackNameOrientation,
    otherSystemsTrackNameOrientation: sheet.otherSystemsTrackNameOrientation,
    multiTrackMultiBarRest: sheet.multiTrackMultiBarRest,
    perTrackMultiBarRest: sheet.perTrackMultiBarRest,
    hideEmptyStaves: sheet.hideEmptyStaves,
    hideEmptyStavesInFirstSystem: sheet.hideEmptyStavesInFirstSystem,
  };
  for (const key of styleChanges(style, original)) {
    switch (key) {
      case 'hideDynamics':
        sheet.hideDynamics = style.hideDynamics;
        break;
      case 'brackets':
        sheet.bracketExtendMode = BRACKETS[style.brackets];
        break;
      case 'singleStaffBrackets':
        sheet.showSingleStaffBrackets = style.singleStaffBrackets;
        break;
      case 'extendBarLines':
        sheet.extendBarLines = style.extendBarLines;
        break;
      case 'systemSeparator':
        sheet.useSystemSignSeparator = style.systemSeparator;
        break;
      case 'tuning':
        // Changed for the whole score: the file's per-track choices give way.
        sheet.globalDisplayTuning = style.tuning;
        sheet.perTrackDisplayTuning = null;
        break;
      case 'chordDiagramsOnTop':
        sheet.globalDisplayChordDiagramsOnTop = style.chordDiagramsOnTop;
        sheet.perTrackChordDiagramsOnTop = null;
        break;
      case 'chordDiagramsInScore':
        sheet.globalDisplayChordDiagramsInScore = style.chordDiagramsInScore;
        break;
      case 'singleTrackNames':
        sheet.singleTrackTrackNamePolicy = PLACES[style.singleTrackNames];
        break;
      case 'multiTrackNames':
        sheet.multiTrackTrackNamePolicy = PLACES[style.multiTrackNames];
        break;
      case 'firstSystemNames':
        sheet.firstSystemTrackNameMode = TEXTS[style.firstSystemNames];
        break;
      case 'otherSystemNames':
        sheet.otherSystemsTrackNameMode = TEXTS[style.otherSystemNames];
        break;
      case 'firstSystemNamesOrientation':
        sheet.firstSystemTrackNameOrientation = ORIENTATIONS[style.firstSystemNamesOrientation];
        break;
      case 'otherSystemNamesOrientation':
        sheet.otherSystemsTrackNameOrientation = ORIENTATIONS[style.otherSystemNamesOrientation];
        break;
      case 'multiBarRests':
        sheet.multiTrackMultiBarRest = style.multiBarRests;
        sheet.perTrackMultiBarRest = style.multiBarRests
          ? new Set(score.tracks.map(track => track.index))
          : null;
        break;
      case 'hideEmptyStaves':
        sheet.hideEmptyStaves = style.hideEmptyStaves;
        break;
      case 'hideEmptyStavesInFirstSystem':
        sheet.hideEmptyStavesInFirstSystem = style.hideEmptyStavesInFirstSystem;
        break;
      // Settings of the renderer rather than the score (see applyStyleSettings), the title block
      // (applied whole below) and the pages' lines (drawn by the paged view, not the engine).
      case 'scale':
      case 'keepTextSize':
      case 'spacing':
      case 'titleBlock':
      case 'pages':
      case 'chordSpelling':
      case 'tempoMarks':
      case 'lyrics':
      case 'fonts':
        break;
    }
  }
  const restoreTitleBlock = applyTitleBlock(score, style.titleBlock);
  const restoreChords = respellChords(score, style.chordSpelling);
  return () => {
    restoreChords();
    restoreTitleBlock();
    Object.assign(sheet, saved);
  };
}

/** Writes every chord's name in a style, returning what writes them back as they were. */
function respellChords(score: alphaTab.model.Score, spelling: ChordSpelling): () => void {
  if (spelling === 'written') return () => undefined;
  const written: [alphaTab.model.Chord, string][] = [];
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      for (const chord of staff.chords?.values() ?? []) {
        written.push([chord, chord.name]);
        chord.name = spellChord(chord.name, spelling);
      }
    }
  }
  return () => {
    for (const [chord, name] of written) chord.name = name;
  };
}

/** What the style asks of the renderer's settings: size, spacing, and the tuning legend. */
export function applyStyleSettings(settings: alphaTab.Settings, style: ScoreStyle): void {
  const display = settings.display;
  display.scale *= style.scale;
  display.stretchForce = style.spacing;
  const { elements } = settings.notation;
  elements.set(alphaTab.NotationElement.GuitarTuning, style.tuning);
  elements.set(alphaTab.NotationElement.EffectTempo, style.tempoMarks);
  elements.set(alphaTab.NotationElement.EffectLyrics, style.lyrics);
  applyTitleBlockSettings(settings, style.titleBlock);
  applyTextFonts(display.resources, style.fonts);
  if (style.keepTextSize && style.scale !== 1) {
    // The renderer scales text with the score: text drawn at its size divided by the scale stays put.
    const fonts = display.resources.elementFonts;
    for (const [element, font] of fonts) fonts.set(element, font.withSize(font.size / style.scale));
  }
}
