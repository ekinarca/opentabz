/**
 * A bar's properties (EDIT-021 … EDIT-027), set and read for every track: meter and key (to the
 * next bar with its own), tempo, repeats and alternate endings, section, the bar line at its end,
 * free time, triplet feel and a pickup bar.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  MAX_ENDINGS,
  MAX_REPEATS,
  MAX_TEMPO,
  METER_DENOMINATORS,
  MIN_TEMPO,
  type BarDirection,
  type BarLine,
  type BarProperties,
  type BarState,
  type TripletFeel,
} from '../shared/edit.ts';
import { EditError } from './error.ts';

const { TripletFeel: Feel, KeySignature, KeySignatureType, BarLineStyle, Direction } = alphaTab.model;

/** The directions a bar may have written, by name (EDIT-025). */
const DIRECTIONS: Readonly<Record<BarDirection, alphaTab.model.Direction>> = {
  fine: Direction.TargetFine,
  segno: Direction.TargetSegno,
  'segno-segno': Direction.TargetSegnoSegno,
  coda: Direction.TargetCoda,
  'double-coda': Direction.TargetDoubleCoda,
  'da-capo': Direction.JumpDaCapo,
  'da-capo-al-coda': Direction.JumpDaCapoAlCoda,
  'da-capo-al-double-coda': Direction.JumpDaCapoAlDoubleCoda,
  'da-capo-al-fine': Direction.JumpDaCapoAlFine,
  'dal-segno': Direction.JumpDalSegno,
  'dal-segno-al-coda': Direction.JumpDalSegnoAlCoda,
  'dal-segno-al-double-coda': Direction.JumpDalSegnoAlDoubleCoda,
  'dal-segno-al-fine': Direction.JumpDalSegnoAlFine,
  'dal-segno-segno': Direction.JumpDalSegnoSegno,
  'dal-segno-segno-al-coda': Direction.JumpDalSegnoSegnoAlCoda,
  'dal-segno-segno-al-double-coda': Direction.JumpDalSegnoSegnoAlDoubleCoda,
  'dal-segno-segno-al-fine': Direction.JumpDalSegnoSegnoAlFine,
  'da-coda': Direction.JumpDaCoda,
  'da-double-coda': Direction.JumpDaDoubleCoda,
};

/** Keys from seven flats to seven sharps. */
const KEYS: readonly alphaTab.model.KeySignature[] = [
  KeySignature.Cb,
  KeySignature.Gb,
  KeySignature.Db,
  KeySignature.Ab,
  KeySignature.Eb,
  KeySignature.Bb,
  KeySignature.F,
  KeySignature.C,
  KeySignature.G,
  KeySignature.D,
  KeySignature.A,
  KeySignature.E,
  KeySignature.B,
  KeySignature.FSharp,
  KeySignature.CSharp,
];

const BAR_LINE_STYLES: Readonly<Record<BarLine, alphaTab.model.BarLineStyle>> = {
  automatic: BarLineStyle.Automatic,
  double: BarLineStyle.LightLight,
  final: BarLineStyle.LightHeavy,
  heavy: BarLineStyle.Heavy,
  dashed: BarLineStyle.Dashed,
  dotted: BarLineStyle.Dotted,
  short: BarLineStyle.Short,
  tick: BarLineStyle.Tick,
  none: BarLineStyle.None,
};

const FEELS: Readonly<Record<TripletFeel, alphaTab.model.TripletFeel>> = {
  none: Feel.NoTripletFeel,
  'triplet-8th': Feel.Triplet8th,
  'triplet-16th': Feel.Triplet16th,
  'dotted-8th': Feel.Dotted8th,
  'dotted-16th': Feel.Dotted16th,
  'scottish-8th': Feel.Scottish8th,
  'scottish-16th': Feel.Scottish16th,
};

/** Guitar Pro's tempo reference for a quarter note. */
const QUARTER = 2;

/** Longest marker and section text kept. */
const MAX_TEXT = 200;

function masterBarAt(score: alphaTab.model.Score, bar: number): alphaTab.model.MasterBar {
  const masterBar = score.masterBars[bar];
  if (masterBar === undefined) throw new EditError(`No bar ${String(bar)}.`);
  return masterBar;
}

function integer(value: number, min: number, max: number, what: string): number {
  if (!Number.isInteger(value) || value < min || value > max)
    throw new EditError(`No ${what} ${String(value)}.`);
  return value;
}

/** Sets a bar's properties, in every track. */
export function setBarProperties(score: alphaTab.model.Score, bar: number, properties: BarProperties): void {
  const masterBar = masterBarAt(score, bar);
  const { meter, key, tempo, repeatStart, repeatCount, alternateEndings, section } = properties;
  const { barLine, freeTime, tripletFeel, anacrusis } = properties;
  if (meter !== undefined) {
    const numerator = integer(meter.numerator, 1, 32, 'time signature numerator');
    if (!METER_DENOMINATORS.includes(meter.denominator))
      throw new EditError(`No time signature over ${String(meter.denominator)}.`);
    const was = [masterBar.timeSignatureNumerator, masterBar.timeSignatureDenominator];
    // To the next bar with a meter of its own.
    for (const next of score.masterBars.slice(bar)) {
      if (
        next !== masterBar &&
        (next.timeSignatureNumerator !== was[0] || next.timeSignatureDenominator !== was[1])
      )
        break;
      next.timeSignatureNumerator = numerator;
      next.timeSignatureDenominator = meter.denominator;
      next.timeSignatureCommon = false;
    }
  }
  if (key !== undefined) {
    const signature = KEYS[integer(key.signature, -7, 7, 'key signature') + 7] ?? KeySignature.C;
    const type = key.minor ? KeySignatureType.Minor : KeySignatureType.Major;
    for (const track of score.tracks) {
      for (const staff of track.staves) {
        const first = staff.bars[bar];
        if (first === undefined) continue;
        const was = [first.keySignature, first.keySignatureType];
        // To the staff's next change of key.
        for (const next of staff.bars.slice(bar)) {
          if (next !== first && (next.keySignature !== was[0] || next.keySignatureType !== was[1])) break;
          next.keySignature = signature;
          next.keySignatureType = type;
        }
      }
    }
  }
  if (tempo !== undefined) {
    if (tempo === null) masterBar.tempoAutomations = [];
    else {
      if (!Number.isFinite(tempo) || tempo < MIN_TEMPO || tempo > MAX_TEMPO)
        throw new EditError(`No tempo ${String(tempo)}.`);
      const ramp = properties.tempoRamp ?? masterBar.tempoAutomations[0]?.isLinear ?? false;
      masterBar.tempoAutomations = [alphaTab.model.Automation.buildTempoAutomation(ramp, 0, tempo, QUARTER)];
    }
  } else if (properties.tempoRamp !== undefined) {
    const written = masterBar.tempoAutomations[0];
    if (written === undefined) throw new EditError('A ramp starts from a tempo written in the bar.');
    masterBar.tempoAutomations = [
      alphaTab.model.Automation.buildTempoAutomation(properties.tempoRamp, 0, written.value, QUARTER),
    ];
  }
  if (repeatStart !== undefined) masterBar.isRepeatStart = repeatStart;
  if (repeatCount !== undefined) {
    const count = integer(repeatCount, 0, MAX_REPEATS, 'repeat count');
    if (count === 1) throw new EditError('A repeat is played at least twice.');
    masterBar.repeatCount = count;
  }
  if (alternateEndings !== undefined)
    masterBar.alternateEndings = integer(alternateEndings, 0, 2 ** MAX_ENDINGS - 1, 'alternate ending');
  if (section !== undefined) {
    if (section === null) masterBar.section = null;
    else {
      if (section.marker.length > MAX_TEXT || section.text.length > MAX_TEXT)
        throw new EditError('A section name is too long.');
      const mark = new alphaTab.model.Section();
      mark.marker = section.marker;
      mark.text = section.text;
      masterBar.section = mark;
    }
  }
  if (barLine !== undefined) {
    if (!Object.hasOwn(BAR_LINE_STYLES, barLine)) throw new EditError(`No bar line "${barLine}".`);
    for (const track of score.tracks) {
      for (const staff of track.staves) {
        const staffBar = staff.bars[bar];
        if (staffBar !== undefined) staffBar.barLineRight = BAR_LINE_STYLES[barLine];
      }
    }
  }
  if (freeTime !== undefined) masterBar.isFreeTime = freeTime;
  if (tripletFeel !== undefined) {
    if (!Object.hasOwn(FEELS, tripletFeel)) throw new EditError(`No triplet feel "${tripletFeel}".`);
    masterBar.tripletFeel = FEELS[tripletFeel];
  }
  if (anacrusis !== undefined) {
    if (anacrusis && bar !== 0) throw new EditError('Only the first bar can be a pickup bar.');
    masterBar.isAnacrusis = anacrusis;
  }
  if (properties.systemBreak !== undefined) {
    for (const track of score.tracks) {
      const breaks = new Set(track.lineBreaks ?? []);
      if (properties.systemBreak) breaks.add(bar);
      else breaks.delete(bar);
      if (breaks.size === 0) delete track.lineBreaks;
      else track.lineBreaks = breaks;
    }
  }
  if (properties.directions !== undefined) {
    const directions = new Set(
      properties.directions.map(name => {
        if (!Object.hasOwn(DIRECTIONS, name)) throw new EditError(`No direction "${name}".`);
        return DIRECTIONS[name];
      }),
    );
    masterBar.directions = directions.size === 0 ? null : directions;
  }
}

/** A bar's properties as they are. */
export function readBarProperties(score: alphaTab.model.Score, bar: number): BarState {
  const masterBar = masterBarAt(score, bar);
  const first = score.tracks[0]?.staves[0]?.bars[bar];
  const tempo = masterBar.tempoAutomations[0];
  const feel =
    (Object.keys(FEELS) as TripletFeel[]).find(name => FEELS[name] === masterBar.tripletFeel) ?? 'none';
  return {
    meter: { numerator: masterBar.timeSignatureNumerator, denominator: masterBar.timeSignatureDenominator },
    key: {
      signature: first?.keySignature ?? 0,
      minor: first?.keySignatureType === KeySignatureType.Minor,
    },
    tempo: tempo === undefined ? null : tempo.value,
    tempoRamp: tempo?.isLinear ?? false,
    repeatStart: masterBar.isRepeatStart,
    repeatCount: masterBar.repeatCount,
    alternateEndings: masterBar.alternateEndings,
    section:
      masterBar.section === null ? null : { marker: masterBar.section.marker, text: masterBar.section.text },
    barLine:
      (Object.keys(BAR_LINE_STYLES) as BarLine[]).find(
        name => BAR_LINE_STYLES[name] === first?.barLineRight,
      ) ?? 'automatic',
    freeTime: masterBar.isFreeTime,
    tripletFeel: feel,
    anacrusis: masterBar.isAnacrusis,
    systemBreak: score.tracks.length > 0 && score.tracks.every(track => track.lineBreaks?.has(bar) === true),
    directions: (Object.keys(DIRECTIONS) as BarDirection[]).filter(
      name => masterBar.directions?.has(DIRECTIONS[name]) === true,
    ),
  };
}
