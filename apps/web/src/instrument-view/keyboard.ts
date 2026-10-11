/**
 * The keyboard view's model, free of the DOM: the keys an instrument can play (VIEW-019), a
 * track's notes by hand (VIEW-023) and where the keys sit.
 */
import {
  TRACK_NOTE_STRIDE,
  type PlaybackTimeline,
  type TrackNotes,
  type TrackSummary,
} from '@opentabz/core/shared';
import { instrumentNotes, type FretboardNotes, type FretboardShow } from './fretboard.ts';

/** Both hands, or one: the right hand is a piano's upper staff, the left hand the others. */
export const HANDS = ['both', 'right', 'left'] as const;
export type Hand = (typeof HANDS)[number];

export interface KeyRange {
  /** Lowest and highest MIDI notes, inclusive. */
  readonly low: number;
  readonly high: number;
}

/** The 88 keys of a piano, A0 to C8. */
export const PIANO_RANGE: KeyRange = { low: 21, high: 108 };

/** Frets of a string instrument's neck, for its range. */
const NECK_FRETS = 24;

/**
 * Usual ranges of the General MIDI instruments narrower than a piano, by program: from standard
 * orchestration tables, rounded to whole notes. Programs not listed (pianos, synthesizers,
 * percussive sounds and effects) take the piano's range.
 */
const PROGRAM_RANGES: ReadonlyMap<number, readonly [number, number]> = new Map<
  number,
  readonly [number, number]
>([
  [6, [29, 89]], // harpsichord
  [7, [29, 89]], // clavinet
  [8, [60, 108]], // celesta
  [9, [79, 108]], // glockenspiel
  [10, [60, 96]], // music box
  [11, [53, 89]], // vibraphone
  [12, [36, 96]], // marimba
  [13, [65, 108]], // xylophone
  [14, [60, 77]], // tubular bells
  [15, [50, 88]], // dulcimer
  [16, [24, 96]], // organs
  [17, [24, 96]],
  [18, [24, 96]],
  [19, [24, 96]],
  [20, [36, 96]],
  [21, [41, 89]], // accordion
  [22, [60, 96]], // harmonica
  [23, [41, 89]],
  ...Array.from({ length: 8 }, (_, index): [number, readonly [number, number]] => [24 + index, [40, 88]]), // guitars
  ...Array.from({ length: 8 }, (_, index): [number, readonly [number, number]] => [32 + index, [28, 67]]), // basses
  [40, [55, 103]], // violin
  [41, [48, 91]], // viola
  [42, [36, 81]], // cello
  [43, [28, 67]], // contrabass
  [44, [28, 103]], // tremolo strings
  [45, [28, 103]], // pizzicato strings
  [46, [24, 103]], // harp
  [47, [38, 60]], // timpani
  [48, [28, 103]], // string ensembles
  [49, [28, 103]],
  [50, [28, 103]],
  [51, [28, 103]],
  [52, [40, 84]], // choir and voices
  [53, [40, 84]],
  [54, [40, 84]],
  [56, [54, 86]], // trumpet
  [57, [40, 77]], // trombone
  [58, [26, 65]], // tuba
  [59, [54, 82]], // muted trumpet
  [60, [34, 77]], // French horn
  [61, [34, 86]], // brass section
  [64, [56, 88]], // soprano sax
  [65, [49, 81]], // alto sax
  [66, [44, 76]], // tenor sax
  [67, [36, 69]], // baritone sax
  [68, [58, 93]], // oboe
  [69, [52, 81]], // English horn
  [70, [34, 75]], // bassoon
  [71, [50, 94]], // clarinet
  [72, [74, 108]], // piccolo
  [73, [60, 96]], // flute
  [74, [72, 98]], // recorder
  [75, [60, 96]], // pan flute
  [76, [60, 96]], // blown bottle
  [77, [55, 88]], // shakuhachi
  [78, [72, 96]], // whistle
  [79, [60, 84]], // ocarina
  [104, [48, 77]], // sitar
  [105, [48, 84]], // banjo
  [106, [50, 79]], // shamisen
  [107, [55, 91]], // koto
  [108, [59, 89]], // kalimba
  [109, [55, 81]], // bagpipe
  [110, [55, 103]], // fiddle
  [111, [60, 88]], // shanai
]);

/** The keys a track's instrument can play: a stringed staff's open strings and frets, else its sound's usual range. */
export function instrumentRange(track: TrackSummary): KeyRange {
  const staff = track.staves.find(candidate => candidate.tuning.length > 0 && !candidate.isPercussion);
  if (staff !== undefined) {
    return { low: Math.min(...staff.tuning), high: Math.max(...staff.tuning) + NECK_FRETS };
  }
  const range = PROGRAM_RANGES.get(track.program);
  return range === undefined ? PIANO_RANGE : { low: range[0], high: range[1] };
}

/** The highest and lowest notes a track plays, or null for none. */
export function playedRange(notes: TrackNotes | null): KeyRange | null {
  if (notes === null || notes.notes.length === 0) return null;
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (let base = 2; base < notes.notes.length; base += TRACK_NOTE_STRIDE) {
    const pitch = notes.notes[base] ?? 0;
    low = Math.min(low, pitch);
    high = Math.max(high, pitch);
  }
  return { low, high };
}

/**
 * The keys drawn: the instrument's range and every note played, a few keys beyond on each side
 * to show where the range ends, rounded out to whole octaves and at most a piano's 88 keys.
 */
export function keyboardSpan(range: KeyRange, played: KeyRange | null): KeyRange {
  const low = Math.min(range.low, played?.low ?? range.low) - 5;
  const high = Math.max(range.high, played?.high ?? range.high) + 5;
  return {
    low: Math.max(PIANO_RANGE.low, low - (((low % 12) + 12) % 12)),
    high: Math.min(PIANO_RANGE.high, high + (11 - (((high % 12) + 12) % 12))),
  };
}

/** The staves a track's notes come from with pitches, in order (a piano's upper staff first). */
export function pitchedStaves(track: TrackSummary): number[] {
  return track.staves.filter(staff => !staff.isPercussion).map(staff => staff.index);
}

/** The notes of the track to show on the keyboard at `tick`, of both hands or one. */
export function keyboardNotes(
  timeline: PlaybackTimeline,
  notes: TrackNotes,
  rows: Map<number, number>,
  tick: number,
  show: FretboardShow,
  hand: Hand,
  rightStaff: number,
): FretboardNotes {
  return instrumentNotes(timeline, notes, rows, tick, show, {
    capo: 0,
    accepts: note => hand === 'both' || (hand === 'right') === (note.staff === rightStaff),
    place: note => String(note.pitch),
  });
}

const BLACK = new Set([1, 3, 6, 8, 10]);

export function isBlackKey(pitch: number): boolean {
  return BLACK.has(((pitch % 12) + 12) % 12);
}

/** Where a black key's middle sits from the line before it, in white keys (as on a piano, not evenly). */
const BLACK_OFFSETS: Readonly<Record<number, number>> = { 1: -0.1, 3: 0.1, 6: -0.13, 8: 0, 10: 0.13 };

export interface KeyPlace {
  readonly pitch: number;
  readonly black: boolean;
  /** Left edge and width, in white-key widths from the first key. */
  readonly x: number;
  readonly width: number;
}

/** Width of a black key, in white-key widths. */
export const BLACK_WIDTH = 0.6;

/** The keys from `low` to `high`: white keys side by side, black keys between them. */
export function keyPlaces(span: KeyRange): { readonly keys: readonly KeyPlace[]; readonly whites: number } {
  const keys: KeyPlace[] = [];
  let whites = 0;
  for (let pitch = span.low; pitch <= span.high; pitch++) {
    if (isBlackKey(pitch)) {
      const offset = BLACK_OFFSETS[((pitch % 12) + 12) % 12] ?? 0;
      keys.push({ pitch, black: true, x: whites + offset - BLACK_WIDTH / 2, width: BLACK_WIDTH });
    } else {
      keys.push({ pitch, black: false, x: whites, width: 1 });
      whites += 1;
    }
  }
  return { keys, whites };
}
