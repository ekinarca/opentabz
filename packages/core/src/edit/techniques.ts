/**
 * Techniques set on notes and beats (EDIT-014), as Guitar Pro's keys set them, from the editor's
 * plain-data names to alphaTab's model.
 */
import * as alphaTab from '@coderline/alphatab';
import type {
  Accent,
  BeatTechniques,
  Bend,
  Fade,
  Harmonic,
  NoteTechniques,
  SlideOut,
  Stroke,
  Tuplet,
  Vibrato,
} from '../shared/edit.ts';
import { EditError } from './error.ts';

const { AccentuationType, BendType, FadeType, HarmonicType, PickStroke, SlideOutType, VibratoType } =
  alphaTab.model;

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

/** Notes played in the time of how many: none (−1), or three in the time of two. */
const TUPLETS: Readonly<Record<Tuplet, readonly [number, number]>> = {
  none: [-1, -1],
  triplet: [3, 2],
};

/** Sets a note's techniques; a tie is joined to the note before it on the string by alphaTab. */
export function setNoteTechniques(note: alphaTab.model.Note, techniques: NoteTechniques): void {
  const { tie, hammer, slide, vibrato, palmMute, letRing, dead, ghost, harmonic, accent, staccato, bend } =
    techniques;
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
}

/** Sets a beat's techniques. */
export function setBeatTechniques(beat: alphaTab.model.Beat, techniques: BeatTechniques): void {
  const { tuplet, barVibrato, slap, pop, tap, fade, stroke, tremolo } = techniques;
  if (tuplet !== undefined) [beat.tupletNumerator, beat.tupletDenominator] = named(TUPLETS, tuplet, 'tuplet');
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
}
