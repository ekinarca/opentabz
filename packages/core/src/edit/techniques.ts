/**
 * Techniques set on notes and beats (EDIT-014), as Guitar Pro's keys set them, from the editor's
 * plain-data names to alphaTab's model.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  BRUSH_LENGTHS,
  TRILL_SPEEDS,
  type Accent,
  type Beaming,
  type BeatState,
  type BeatTechniques,
  type Bend,
  type Brush,
  type BrushLength,
  type Dynamic,
  type Fade,
  type Fermata,
  type Finger,
  type Golpe,
  type Grace,
  type Hairpin,
  type Harmonic,
  type NoteState,
  type NoteTechniques,
  type Ornament,
  type Ottava,
  type Rasgueado,
  type SlideIn,
  type SlideOut,
  type Spelling,
  type Stem,
  type Stroke,
  type TrillSpeed,
  type Tuplet,
  type Vibrato,
  type Wah,
} from '../shared/edit.ts';
import { EditError } from './error.ts';

const {
  AccentuationType,
  BarreShape,
  BeatBeamingMode,
  BendType,
  BrushType,
  CrescendoType,
  Duration,
  DynamicValue,
  FadeType,
  FermataType,
  Fingers,
  GolpeType,
  GraceType,
  HarmonicType,
  NoteAccidentalMode,
  NoteOrnament,
  Ottavia,
  PickStroke,
  Rasgueado: Rasgueados,
  SlideInType,
  SlideOutType,
  VibratoType,
  WahPedal,
} = alphaTab.model;

export const DYNAMIC_VALUES: Readonly<Record<Dynamic, alphaTab.model.DynamicValue>> = {
  ppp: DynamicValue.PPP,
  pp: DynamicValue.PP,
  p: DynamicValue.P,
  mp: DynamicValue.MP,
  mf: DynamicValue.MF,
  f: DynamicValue.F,
  ff: DynamicValue.FF,
  fff: DynamicValue.FFF,
};

export const FINGER_VALUES: Readonly<Record<Finger, alphaTab.model.Fingers>> = {
  none: Fingers.Unknown,
  thumb: Fingers.Thumb,
  index: Fingers.IndexFinger,
  middle: Fingers.MiddleFinger,
  ring: Fingers.AnnularFinger,
  little: Fingers.LittleFinger,
};

export const BEAMINGS: Readonly<Record<Beaming, alphaTab.model.BeatBeamingMode>> = {
  auto: BeatBeamingMode.Auto,
  split: BeatBeamingMode.ForceSplitToNext,
  join: BeatBeamingMode.ForceMergeWithNext,
};

export const SPELLINGS: Readonly<Record<Spelling, alphaTab.model.NoteAccidentalMode>> = {
  auto: NoteAccidentalMode.Default,
  sharp: NoteAccidentalMode.ForceSharp,
  flat: NoteAccidentalMode.ForceFlat,
  natural: NoteAccidentalMode.ForceNatural,
  'double-sharp': NoteAccidentalMode.ForceDoubleSharp,
  'double-flat': NoteAccidentalMode.ForceDoubleFlat,
};

/** The longest text written above a beat. */
const MAX_TEXT = 200;

const SLIDES: Readonly<Record<SlideOut, alphaTab.model.SlideOutType>> = {
  none: SlideOutType.None,
  legato: SlideOutType.Legato,
  shift: SlideOutType.Shift,
  'out-down': SlideOutType.OutDown,
  'out-up': SlideOutType.OutUp,
};

const VIBRATOS: Readonly<Record<Vibrato, alphaTab.model.VibratoType>> = {
  none: VibratoType.None,
  slight: VibratoType.Slight,
  wide: VibratoType.Wide,
};

const HARMONICS: Readonly<Record<Harmonic, alphaTab.model.HarmonicType>> = {
  none: HarmonicType.None,
  natural: HarmonicType.Natural,
  artificial: HarmonicType.Artificial,
  pinch: HarmonicType.Pinch,
  tap: HarmonicType.Tap,
  semi: HarmonicType.Semi,
  feedback: HarmonicType.Feedback,
};

const ACCENTS: Readonly<Record<Accent, alphaTab.model.AccentuationType>> = {
  none: AccentuationType.None,
  normal: AccentuationType.Normal,
  heavy: AccentuationType.Heavy,
  tenuto: AccentuationType.Tenuto,
};

const FADES: Readonly<Record<Fade, alphaTab.model.FadeType>> = {
  none: FadeType.None,
  in: FadeType.FadeIn,
  out: FadeType.FadeOut,
  swell: FadeType.VolumeSwell,
};

const STROKES: Readonly<Record<Stroke, alphaTab.model.PickStroke>> = {
  none: PickStroke.None,
  up: PickStroke.Up,
  down: PickStroke.Down,
};

const SLIDE_INS: Readonly<Record<SlideIn, alphaTab.model.SlideInType>> = {
  none: SlideInType.None,
  'from-below': SlideInType.IntoFromBelow,
  'from-above': SlideInType.IntoFromAbove,
};

const ORNAMENT_VALUES: Readonly<Record<Ornament, alphaTab.model.NoteOrnament>> = {
  none: NoteOrnament.None,
  turn: NoteOrnament.Turn,
  'inverted-turn': NoteOrnament.InvertedTurn,
  'upper-mordent': NoteOrnament.UpperMordent,
  'lower-mordent': NoteOrnament.LowerMordent,
};

const BRUSH_TYPES: Readonly<Record<Brush, alphaTab.model.BrushType>> = {
  none: BrushType.None,
  down: BrushType.BrushDown,
  up: BrushType.BrushUp,
  'arpeggio-down': BrushType.ArpeggioDown,
  'arpeggio-up': BrushType.ArpeggioUp,
};

const GRACE_TYPES: Readonly<Record<Grace, alphaTab.model.GraceType>> = {
  none: GraceType.None,
  before: GraceType.BeforeBeat,
  'on-beat': GraceType.OnBeat,
  bend: GraceType.BendGrace,
};

const FERMATA_TYPES: Readonly<Record<Exclude<Fermata, 'none'>, alphaTab.model.FermataType>> = {
  short: FermataType.Short,
  medium: FermataType.Medium,
  long: FermataType.Long,
};

const HAIRPINS: Readonly<Record<Hairpin, alphaTab.model.CrescendoType>> = {
  none: CrescendoType.None,
  crescendo: CrescendoType.Crescendo,
  decrescendo: CrescendoType.Decrescendo,
};

const OTTAVAS: Readonly<Record<Ottava, alphaTab.model.Ottavia>> = {
  '15ma': Ottavia._15ma,
  '8va': Ottavia._8va,
  none: Ottavia.Regular,
  '8vb': Ottavia._8vb,
  '15mb': Ottavia._15mb,
};

const GOLPES: Readonly<Record<Golpe, alphaTab.model.GolpeType>> = {
  none: GolpeType.None,
  thumb: GolpeType.Thumb,
  finger: GolpeType.Finger,
};

const WAHS: Readonly<Record<Wah, alphaTab.model.WahPedal>> = {
  none: WahPedal.None,
  open: WahPedal.Open,
  closed: WahPedal.Closed,
};

const RASGUEADOS: Readonly<Record<Rasgueado, alphaTab.model.Rasgueado>> = {
  none: Rasgueados.None,
  ii: Rasgueados.Ii,
  mi: Rasgueados.Mi,
  'mii-triplet': Rasgueados.MiiTriplet,
  'mii-anapaest': Rasgueados.MiiAnapaest,
  'pmp-triplet': Rasgueados.PmpTriplet,
  'pmp-anapaest': Rasgueados.PmpAnapaest,
  'pei-triplet': Rasgueados.PeiTriplet,
  'pei-anapaest': Rasgueados.PeiAnapaest,
  'pai-triplet': Rasgueados.PaiTriplet,
  'pai-anapaest': Rasgueados.PaiAnapaest,
  'ami-triplet': Rasgueados.AmiTriplet,
  'ami-anapaest': Rasgueados.AmiAnapaest,
  ppp: Rasgueados.Ppp,
  amii: Rasgueados.Amii,
  amip: Rasgueados.Amip,
  eami: Rasgueados.Eami,
  eamii: Rasgueados.Eamii,
  peami: Rasgueados.Peami,
};

/** A note value's ticks: a quarter note, 960. */
function ticksOf(value: number): number {
  return 3840 / value;
}

/** How long a strum takes unless said: a sixty-fourth from string to string, an arpeggio's a sixteenth. */
function defaultBrushLength(brush: Brush): BrushLength {
  return brush === 'arpeggio-down' || brush === 'arpeggio-up' ? 16 : 64;
}

/** The note value a strum's ticks are nearest. */
function brushLengthOf(ticks: number): BrushLength {
  return BRUSH_LENGTHS.reduce((best, value) =>
    Math.abs(ticksOf(value) - ticks) < Math.abs(ticksOf(best) - ticks) ? value : best,
  );
}

/** The highest fret a barre is written at. */
const MAX_BARRE_FRET = 24;

/** The name a table gives a value, or the first name (as none) when it gives none. */
function nameIn<K extends string, V>(table: Readonly<Record<K, V>>, value: V): K {
  const names = Object.keys(table) as K[];
  const found = names.find(name => table[name] === value) ?? names[0];
  if (found === undefined) throw new EditError('A table without names.');
  return found;
}

/** How fast a trill goes, as alphaTab's note values. */
const TRILL_DURATIONS: Readonly<Record<TrillSpeed, alphaTab.model.Duration>> = {
  16: Duration.Sixteenth,
  32: Duration.ThirtySecond,
  64: Duration.SixtyFourth,
};

/** A value from a table of names, or an edit refused. */
function named<K extends string, V>(table: Readonly<Record<K, V>>, value: K, what: string): V {
  if (!Object.hasOwn(table, value)) throw new EditError(`No ${what} "${value}".`);
  return table[value];
}

function flag(value: unknown, what: string): boolean {
  if (typeof value !== 'boolean') throw new EditError(`${what} is on or off.`);
  return value;
}

/** A whole tone up and held, as Guitar Pro writes a bend by default (values in quarter tones). */
function bendFull(note: alphaTab.model.Note): void {
  note.bendPoints = null;
  note.maxBendPoint = null;
  note.bendType = BendType.Bend;
  note.addBendPoint(new alphaTab.model.BendPoint(0, 0));
  note.addBendPoint(new alphaTab.model.BendPoint(15, 4));
  note.addBendPoint(new alphaTab.model.BendPoint(alphaTab.model.BendPoint.MaxPosition, 4));
}

const BENDS: Readonly<Record<Bend, (note: alphaTab.model.Note) => void>> = {
  none: note => {
    note.bendType = BendType.None;
    note.bendPoints = null;
    note.maxBendPoint = null;
  },
  full: bendFull,
};

/** Notes played in the time of how many: none (−1), three in the time of two, five in four… */
export const TUPLET_RATIOS: Readonly<Record<Tuplet, readonly [number, number]>> = {
  none: [-1, -1],
  triplet: [3, 2],
  '5:4': [5, 4],
  '6:4': [6, 4],
  '7:4': [7, 4],
  '9:8': [9, 8],
  '10:8': [10, 8],
  '11:8': [11, 8],
  '12:8': [12, 8],
  '13:8': [13, 8],
};

/** Stems as the notes have them (no preference), up or down. */
export const STEM_DIRECTIONS: Readonly<Record<Stem, alphaTab.rendering.BeamDirection | null>> = {
  auto: null,
  up: alphaTab.rendering.BeamDirection.Up,
  down: alphaTab.rendering.BeamDirection.Down,
};

/** Sets a note's techniques; a tie is joined to the note before it on the string by alphaTab. */
export function setNoteTechniques(note: alphaTab.model.Note, techniques: NoteTechniques): void {
  const {
    tie,
    hammer,
    slide,
    vibrato,
    palmMute,
    letRing,
    dead,
    ghost,
    harmonic,
    accent,
    staccato,
    bend,
    leftFinger,
    rightFinger,
    spelling,
    slideIn,
    trill,
    ornament,
    leftTap,
  } = techniques;
  if (tie !== undefined) {
    note.isTieDestination = flag(tie, 'A tie');
    if (!tie) note.tieOrigin = null;
  }
  if (hammer !== undefined) note.isHammerPullOrigin = flag(hammer, 'A hammer-on');
  if (slide !== undefined) note.slideOutType = named(SLIDES, slide, 'slide');
  if (vibrato !== undefined) note.vibrato = named(VIBRATOS, vibrato, 'vibrato');
  if (palmMute !== undefined) note.isPalmMute = flag(palmMute, 'Palm muting');
  if (letRing !== undefined) note.isLetRing = flag(letRing, 'Let ring');
  if (dead !== undefined) note.isDead = flag(dead, 'A dead note');
  if (ghost !== undefined) note.isGhost = flag(ghost, 'A ghost note');
  if (harmonic !== undefined) {
    note.harmonicType = named(HARMONICS, harmonic, 'harmonic');
    // A natural harmonic sounds at its fret; the others an octave (12 frets) above it.
    note.harmonicValue = harmonic === 'none' || harmonic === 'natural' ? 0 : 12;
  }
  if (accent !== undefined) note.accentuated = named(ACCENTS, accent, 'accent');
  if (staccato !== undefined) note.isStaccato = flag(staccato, 'Staccato');
  if (bend !== undefined) named(BENDS, bend, 'bend')(note);
  if (leftFinger !== undefined) note.leftHandFinger = named(FINGER_VALUES, leftFinger, 'finger');
  if (rightFinger !== undefined) note.rightHandFinger = named(FINGER_VALUES, rightFinger, 'finger');
  if (spelling !== undefined) note.accidentalMode = named(SPELLINGS, spelling, 'spelling');
  if (slideIn !== undefined) note.slideInType = named(SLIDE_INS, slideIn, 'slide in');
  if (trill !== undefined) {
    if (trill === null) {
      note.trillValue = -1;
      note.trillSpeed = Duration.ThirtySecond;
    } else {
      if (!TRILL_SPEEDS.includes(trill.speed)) throw new EditError(`No trill in ${String(trill.speed)}ths.`);
      // On strings, the fret trilled with; else the pitch.
      const value = note.isStringed ? note.stringTuning + trill.fret : trill.fret;
      if (!Number.isInteger(trill.fret) || trill.fret < 0 || trill.fret > (note.isStringed ? 99 : 127))
        throw new EditError(`No trill with ${String(trill.fret)}.`);
      note.trillValue = value;
      note.trillSpeed = TRILL_DURATIONS[trill.speed];
    }
  }
  if (ornament !== undefined) note.ornament = named(ORNAMENT_VALUES, ornament, 'ornament');
  if (leftTap !== undefined) note.isLeftHandTapped = flag(leftTap, 'Left-hand tapping');
}

/** A note's techniques as they are. */
export function readNoteTechniques(note: alphaTab.model.Note): NoteState {
  return {
    tie: note.isTieDestination,
    hammer: note.isHammerPullOrigin,
    slide: nameIn(SLIDES, note.slideOutType),
    vibrato: nameIn(VIBRATOS, note.vibrato),
    palmMute: note.isPalmMute,
    letRing: note.isLetRing,
    dead: note.isDead,
    ghost: note.isGhost,
    harmonic: nameIn(HARMONICS, note.harmonicType),
    accent: nameIn(ACCENTS, note.accentuated),
    staccato: note.isStaccato,
    bend: note.hasBend ? 'full' : 'none',
    leftFinger: nameIn(FINGER_VALUES, note.leftHandFinger),
    rightFinger: nameIn(FINGER_VALUES, note.rightHandFinger),
    spelling: nameIn(SPELLINGS, note.accidentalMode),
    slideIn: nameIn(SLIDE_INS, note.slideInType),
    trill: note.isTrill
      ? {
          fret: note.isStringed ? note.trillFret : note.trillValue,
          speed: TRILL_SPEEDS.find(speed => TRILL_DURATIONS[speed] === note.trillSpeed) ?? 32,
        }
      : null,
    ornament: nameIn(ORNAMENT_VALUES, note.ornament),
    leftTap: note.isLeftHandTapped,
  };
}

/** Sets a beat's techniques. */
export function setBeatTechniques(beat: alphaTab.model.Beat, techniques: BeatTechniques): void {
  const { tuplet, barVibrato, slap, pop, tap, fade, stroke, tremolo, text, dynamics, beaming, stem } =
    techniques;
  if (techniques.fermata !== undefined) setFermata(beat, techniques.fermata);
  if (tuplet !== undefined)
    [beat.tupletNumerator, beat.tupletDenominator] = named(TUPLET_RATIOS, tuplet, 'tuplet');
  if (stem !== undefined) beat.preferredBeamDirection = named(STEM_DIRECTIONS, stem, 'stem direction');
  if (barVibrato !== undefined) beat.vibrato = named(VIBRATOS, barVibrato, 'vibrato');
  if (slap !== undefined) beat.slap = flag(slap, 'Slapping');
  if (pop !== undefined) beat.pop = flag(pop, 'Popping');
  if (tap !== undefined) beat.tap = flag(tap, 'Tapping');
  if (fade !== undefined) beat.fade = named(FADES, fade, 'fade');
  if (stroke !== undefined) beat.pickStroke = named(STROKES, stroke, 'stroke');
  if (tremolo !== undefined) {
    if (!Number.isInteger(tremolo) || tremolo < 0 || tremolo > alphaTab.model.TremoloPickingEffect.maxMarks)
      throw new EditError(`No tremolo picking with ${String(tremolo)} marks.`);
    if (tremolo === 0) delete beat.tremoloPicking;
    else {
      const effect = new alphaTab.model.TremoloPickingEffect();
      effect.marks = tremolo;
      beat.tremoloPicking = effect;
    }
  }
  if (text !== undefined) {
    if (text !== null && (typeof text !== 'string' || text.length > MAX_TEXT))
      throw new EditError('A beat’s text is too long.');
    beat.text = text === null || text.trim().length === 0 ? null : text.trim();
  }
  if (dynamics !== undefined) beat.dynamics = named(DYNAMIC_VALUES, dynamics, 'dynamic');
  if (beaming !== undefined) beat.beamingMode = named(BEAMINGS, beaming, 'beaming');
  const { brush, brushLength, grace, hairpin, ottava, golpe, wah, rasgueado } = techniques;
  if (brush !== undefined) {
    beat.brushType = named(BRUSH_TYPES, brush, 'strum');
    if (brush === 'none') beat.brushDuration = 0;
    else if (brushLength === undefined && beat.brushDuration <= 0)
      beat.brushDuration = ticksOf(defaultBrushLength(brush));
  }
  if (brushLength !== undefined) {
    if (!BRUSH_LENGTHS.includes(brushLength)) throw new EditError(`No strum of a ${String(brushLength)}th.`);
    if (beat.brushType === BrushType.None) throw new EditError('A strum’s length is a strum’s.');
    beat.brushDuration = ticksOf(brushLength);
  }
  if (grace !== undefined) {
    const type = named(GRACE_TYPES, grace, 'grace note');
    if (type !== GraceType.None && beat.notes.length === 0) throw new EditError('A grace note is a note.');
    beat.graceType = type;
  }
  if (hairpin !== undefined) beat.crescendo = named(HAIRPINS, hairpin, 'hairpin');
  if (ottava !== undefined) beat.ottava = named(OTTAVAS, ottava, 'ottava');
  if (golpe !== undefined) beat.golpe = named(GOLPES, golpe, 'golpe');
  if (wah !== undefined) beat.wahPedal = named(WAHS, wah, 'wah');
  if (rasgueado !== undefined) beat.rasgueado = named(RASGUEADOS, rasgueado, 'rasgueado');
  if (techniques.deadSlap !== undefined) beat.deadSlapped = flag(techniques.deadSlap, 'A dead slap');
  if (techniques.legato !== undefined) beat.isLegatoOrigin = flag(techniques.legato, 'Legato');
  if (techniques.timer !== undefined) beat.showTimer = flag(techniques.timer, 'A timer');
  const { barre } = techniques;
  if (barre !== undefined) {
    if (barre === null) {
      beat.barreFret = -1;
      beat.barreShape = BarreShape.None;
    } else {
      if (!Number.isInteger(barre.fret) || barre.fret < 1 || barre.fret > MAX_BARRE_FRET)
        throw new EditError(`No barre at fret ${String(barre.fret)}.`);
      beat.barreFret = barre.fret;
      beat.barreShape = flag(barre.half, 'A half barre') ? BarreShape.Half : BarreShape.Full;
    }
  }
}

/**
 * A fermata over a beat (EDIT-014): every track's beats at that moment of the bar have it, as
 * alphaTab keeps fermatas with the bar; none takes it away from all of them.
 */
export function setFermata(beat: alphaTab.model.Beat, fermata: Fermata): void {
  const masterBar = beat.voice.bar.masterBar;
  const at = beat.playbackStart;
  const kept = new Map(masterBar.fermata ?? []);
  if (fermata === 'none') kept.delete(at);
  else {
    const mark = new alphaTab.model.Fermata();
    mark.type = named(FERMATA_TYPES, fermata, 'fermata');
    kept.set(at, mark);
  }
  masterBar.fermata = kept.size === 0 ? null : kept;
  const mark = kept.get(at) ?? null;
  for (const track of masterBar.score.tracks)
    for (const staff of track.staves)
      for (const voice of staff.bars[masterBar.index]?.voices ?? [])
        for (const each of voice.beats) if (each.playbackStart === at) each.fermata = mark;
}

/** A beat's techniques as they are. */
export function readBeatTechniques(beat: alphaTab.model.Beat): BeatState {
  const tuplet = (Object.keys(TUPLET_RATIOS) as Tuplet[]).find(
    name =>
      TUPLET_RATIOS[name][0] === beat.tupletNumerator && TUPLET_RATIOS[name][1] === beat.tupletDenominator,
  );
  const brush = nameIn(BRUSH_TYPES, beat.brushType);
  return {
    tuplet: tuplet ?? 'none',
    stem: nameIn(STEM_DIRECTIONS, beat.preferredBeamDirection),
    barVibrato: nameIn(VIBRATOS, beat.vibrato),
    slap: beat.slap,
    pop: beat.pop,
    tap: beat.tap,
    fade: nameIn(FADES, beat.fade),
    stroke: nameIn(STROKES, beat.pickStroke),
    tremolo: beat.tremoloPicking?.marks ?? 0,
    text: beat.text,
    dynamics: nameIn(DYNAMIC_VALUES, beat.dynamics),
    beaming: nameIn(BEAMINGS, beat.beamingMode),
    brush,
    brushLength: brush === 'none' ? defaultBrushLength(brush) : brushLengthOf(beat.brushDuration),
    grace: nameIn(GRACE_TYPES, beat.graceType),
    fermata: beat.fermata === null ? 'none' : nameIn(FERMATA_TYPES, beat.fermata.type),
    hairpin: nameIn(HAIRPINS, beat.crescendo),
    ottava: nameIn(OTTAVAS, beat.ottava),
    golpe: nameIn(GOLPES, beat.golpe),
    wah: nameIn(WAHS, beat.wahPedal),
    rasgueado: nameIn(RASGUEADOS, beat.rasgueado),
    deadSlap: beat.deadSlapped,
    legato: beat.isLegatoOrigin,
    timer: beat.showTimer,
    barre:
      beat.barreFret > 0 && beat.barreShape !== BarreShape.None
        ? { fret: beat.barreFret, half: beat.barreShape === BarreShape.Half }
        : null,
  };
}
