/**
 * A score's style in alphaTab's terms (engine worker): read from the stylesheet the file brought
 * (Guitar Pro's, REND-219), and applied around a layout. Only what differs from the file's style
 * is applied, so the per-track settings a file makes stay until the setting is changed for all.
 */
import * as alphaTab from '@coderline/alphatab';
import { spellChord, type ChordSpelling } from '../shared/chord-spelling.ts';
import { DEFAULT_PAGE_FURNITURE, DEFAULT_TEXT_BLOCKS } from '../shared/page-text.ts';
import { DEFAULT_TEXT_FONTS } from '../shared/text-fonts.ts';
import { DEFAULT_TECHNIQUE_LABELS, TECHNIQUE_LABELS } from '../shared/technique-labels.ts';
import { DEFAULT_MUSIC_FONT } from '../shared/music-font.ts';
import { engravingFor } from './music-fonts.ts';
import { applyCommonTime, applyExtraRests } from './notation-toggles.ts';
import { applyTextFonts } from './text-fonts.ts';
import {
  styleChanges,
  type BracketMode,
  type ScoreStyle,
  type TabRhythm,
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
    // alphaTab reads none of these from Guitar Pro's stylesheet: they start as usual.
    staffLineThickness: 1,
    systemSpacing: 1,
    firstSystemIndent: 0,
    chordDiagramsOnTopSize: 1,
    chordDiagramsOnTopSpacing: 1,
    chordDiagramsInScoreSize: 1,
    chordDiagramsInScoreSpacing: 1,
    hideDynamics: sheet.hideDynamics,
    // C and cut C as the file writes any; the others as alphaTab draws.
    commonTime: score.masterBars.some(bar => bar.timeSignatureCommon),
    bentPitch: true,
    hideExtraRests: false,
    tupletBrackets: true,
    arpeggioArrows: true,
    trillNote: true,
    slideLabel: true,
    tiedTabNotes: false,
    harmonicTouch: true,
    octaveHarmonicDot: false,
    // alphaTab reads none of Guitar Pro's rhythm-in-tablature choices: as alphaTab draws it.
    tabRhythm: 'auto',
    tabStemsInside: true,
    tabRhythmVoices: ['below', 'below', 'below', 'below'],
    tabBeamsOverRests: true,
    tabCircleLongNotes: false,
    slashStaffLines: true,
    slashBarLines: true,
    slashSingleNoteFrets: false,
    // Fingering as alphaTab engraves it: before the notes, t and p i m a c.
    leftHandFingerLabels: 't1234',
    rightHandFingerLabels: 'pimac',
    fingeringPosition: 'before',
    tabFingeringPosition: 'none',
    fingeringSize: 1,
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
    // Where alphaTab places them: between the staff and the tablature.
    lyricsPlace: 'between',
    brackets: keyOf(BRACKETS, sheet.bracketExtendMode, 'staves'),
    singleStaffBrackets: sheet.showSingleStaffBrackets,
    extendBarLines: sheet.extendBarLines,
    systemSeparator: sheet.useSystemSignSeparator,
    tuning: sheet.globalDisplayTuning && !noneOf(sheet.perTrackDisplayTuning, tracks),
    // As alphaTab writes them: as they sound.
    capoAndTuningInNotation: true,
    // How the legend looks is not among what alphaTab reads: as alphaTab draws it.
    tuningPlace: 'top',
    tuningDetail: 'auto',
    tuningLayout: 'columns',
    tuningFrame: false,
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
    // Nor does it read whether Guitar Pro shows the instructions and notice: they start hidden.
    textBlocks: DEFAULT_TEXT_BLOCKS,
    // alphaTab reads no fonts from Guitar Pro files: the texts start in its own, the music in
    // Bravura.
    fonts: DEFAULT_TEXT_FONTS,
    musicFont: DEFAULT_MUSIC_FONT,
    // Nor the words a Guitar Pro 8 stylesheet prints for techniques: the usual ones.
    techniqueLabels: DEFAULT_TECHNIQUE_LABELS,
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
      // Settings of the renderer rather than the score (see applyStyleSettings), the title block,
      // C and cut C and the rests of the lower voices (applied whole below), the text blocks
      // (written by the session) and the pages' lines (drawn by the paged view, not the engine).
      case 'scale':
      case 'keepTextSize':
      case 'spacing':
      case 'staffLineThickness':
      case 'systemSpacing':
      case 'firstSystemIndent':
      case 'capoAndTuningInNotation':
      case 'tuningPlace':
      case 'tuningDetail':
      case 'tuningLayout':
      case 'tuningFrame':
      case 'chordDiagramsOnTopSize':
      case 'chordDiagramsOnTopSpacing':
      case 'chordDiagramsInScoreSize':
      case 'chordDiagramsInScoreSpacing':
      case 'titleBlock':
      case 'textBlocks':
      case 'pages':
      case 'chordSpelling':
      case 'tempoMarks':
      case 'tempoDecimals':
      case 'bentPitch':
      case 'tupletBrackets':
      case 'commonTime':
      case 'hideExtraRests':
      case 'arpeggioArrows':
      case 'trillNote':
      case 'slideLabel':
      case 'tiedTabNotes':
      case 'harmonicTouch':
      case 'octaveHarmonicDot':
      case 'tabRhythm':
      case 'tabStemsInside':
      case 'tabRhythmVoices':
      case 'tabBeamsOverRests':
      case 'tabCircleLongNotes':
      case 'slashStaffLines':
      case 'slashBarLines':
      case 'slashSingleNoteFrets':
      case 'leftHandFingerLabels':
      case 'rightHandFingerLabels':
      case 'fingeringPosition':
      case 'tabFingeringPosition':
      case 'fingeringSize':
      case 'dashQuarterRests':
      case 'voiceColors':
      case 'flatBeams':
      case 'flatDrumBeams':
      case 'clefOnEverySystem':
      case 'timeSignatureOnEverySystem':
      case 'timeSignatureAtSections':
      case 'linesOverRests':
      case 'lyrics':
      case 'lyricsPlace':
      case 'fonts':
      case 'musicFont':
      case 'techniqueLabels':
        break;
    }
  }
  const changes = styleChanges(style, original);
  // The time signatures as the file writes them, unless C and cut C were switched.
  const restoreCommonTime = changes.includes('commonTime')
    ? applyCommonTime(score, style.commonTime)
    : () => undefined;
  const restoreRests = applyExtraRests(score, style.hideExtraRests);
  const restoreTitleBlock = applyTitleBlock(score, style.titleBlock);
  const restoreChords = respellChords(score, style.chordSpelling);
  return () => {
    restoreChords();
    restoreTitleBlock();
    restoreRests();
    restoreCommonTime();
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
/** alphaTab's space above and below each system, which the system spacing multiplies. */
const SYSTEM_PADDING = 10;
const PX_PER_MM = 96 / 25.4;

/** alphaTab's rhythm modes for the tablature: the rhythm without a staff above, always, never. */
const TAB_RHYTHM_MODES: Readonly<Record<TabRhythm, alphaTab.TabRhythmMode>> = {
  auto: alphaTab.TabRhythmMode.Automatic,
  always: alphaTab.TabRhythmMode.ShowWithBars,
  never: alphaTab.TabRhythmMode.Hidden,
};

export function applyStyleSettings(settings: alphaTab.Settings, style: ScoreStyle): void {
  const display = settings.display;
  display.scale *= style.scale;
  display.stretchForce = style.spacing;
  display.systemPaddingTop = SYSTEM_PADDING * style.systemSpacing;
  display.systemPaddingBottom = SYSTEM_PADDING * style.systemSpacing;
  display.firstSystemIndent = style.firstSystemIndent * PX_PER_MM;
  // The music font's engraving (REND-241), its staff lines as thick as asked (REND-228).
  const engraving = engravingFor(style.musicFont, style.staffLineThickness);
  if (engraving !== null) display.resources.engravingSettings = engraving;
  const { elements } = settings.notation;
  elements.set(alphaTab.NotationElement.GuitarTuning, style.tuning);
  // The tuning where, as much and as laid out as asked (REND-225).
  settings.notation.tuningInTab = style.tuningPlace === 'tab';
  settings.notation.tuningDetail = style.tuningDetail;
  settings.notation.tuningLayout = style.tuningLayout;
  settings.notation.tuningFrame = style.tuningFrame;
  elements.set(alphaTab.NotationElement.EffectTempo, style.tempoMarks);
  settings.notation.showTempoDecimals = style.tempoDecimals;
  settings.notation.showBentPitch = style.bentPitch;
  settings.notation.showTupletBrackets = style.tupletBrackets;
  settings.notation.showArpeggioArrows = style.arpeggioArrows;
  settings.notation.showTrillNote = style.trillNote;
  elements.set(alphaTab.NotationElement.EffectSlideText, style.slideLabel);
  settings.notation.showTiedTabNotes = style.tiedTabNotes;
  settings.notation.showHarmonicTouch = style.harmonicTouch;
  settings.notation.octaveHarmonicDot = style.octaveHarmonicDot;
  // The rhythm in the tablature: when, its stems, and each voice's place (REND-244).
  settings.notation.rhythmMode = TAB_RHYTHM_MODES[style.tabRhythm];
  settings.notation.tabStemsInside = style.tabStemsInside;
  settings.notation.tabRhythmVoices = [...style.tabRhythmVoices];
  // Beams over rests and circled long notes in the tablature (REND-245).
  settings.notation.tabBeamsOverRests = style.tabBeamsOverRests;
  settings.notation.tabCircleLongNotes = style.tabCircleLongNotes;
  // Slash notation's line, barlines and single notes' frets (REND-229).
  settings.notation.slashStaffLines = style.slashStaffLines;
  settings.notation.slashBarLines = style.slashBarLines;
  settings.notation.slashSingleNoteFrets = style.slashSingleNoteFrets;
  // Fingering's labels, places and size (REND-252).
  settings.notation.leftHandFingerLabels = style.leftHandFingerLabels;
  settings.notation.rightHandFingerLabels = style.rightHandFingerLabels;
  settings.notation.fingeringPosition = style.fingeringPosition;
  settings.notation.tabFingeringPosition = style.tabFingeringPosition;
  settings.notation.fingeringScale = style.fingeringSize;
  settings.notation.dashQuarterRests = style.dashQuarterRests;
  settings.notation.flatBeams = style.flatBeams;
  settings.notation.flatDrumBeams = style.flatDrumBeams;
  settings.notation.clefOnEverySystem = style.clefOnEverySystem;
  settings.notation.timeSignatureOnEverySystem = style.timeSignatureOnEverySystem;
  settings.notation.timeSignatureAtSections = style.timeSignatureAtSections;
  settings.notation.linesOverRests = style.linesOverRests;
  // Chord diagrams at the size and spacing asked (REND-227), keeping their size when the score is
  // scaled and text keeps its own (REND-223).
  const kept = style.keepTextSize ? 1 / style.scale : 1;
  settings.notation.chordDiagramScale = style.chordDiagramsOnTopSize * kept;
  settings.notation.chordDiagramSpacing = style.chordDiagramsOnTopSpacing * kept;
  settings.notation.inScoreChordDiagramScale = style.chordDiagramsInScoreSize * kept;
  settings.notation.inScoreChordDiagramSpacing = style.chordDiagramsInScoreSpacing;
  // The printed words of techniques, as asked (REND-242); the usual ones where left empty.
  for (const key of TECHNIQUE_LABELS) {
    const label = style.techniqueLabels[key].trim();
    if (label.length > 0) settings.notation.techniqueLabels.set(key, label);
  }
  elements.set(alphaTab.NotationElement.EffectLyrics, style.lyrics);
  settings.notation.lyricsPlace = style.lyricsPlace;
  applyTitleBlockSettings(settings, style.titleBlock);
  applyTextFonts(display.resources, style.fonts);
  if (style.keepTextSize && style.scale !== 1) {
    // The renderer scales text with the score: text drawn at its size divided by the scale stays put.
    // The chord diagrams' numbers go with the diagrams, kept above.
    const fonts = display.resources.elementFonts;
    for (const [element, font] of fonts) {
      if (element !== alphaTab.NotationElement.ChordDiagramFretboardNumbers)
        fonts.set(element, font.withSize(font.size / style.scale));
    }
  }
}
