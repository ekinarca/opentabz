/** Options shared between the UI and the engine for one rendered view of a document. */
import type { NoteColoring } from './note-colors.ts';
import type { ReadingAids } from './reading-aids.ts';
import type { ScoreStyle } from './style.ts';

export const LAYOUT_KINDS = ['page', 'scroll', 'horizontal'] as const;
/** page: physical pages · scroll: endless vertical · horizontal: one endless system. */
export type LayoutKind = (typeof LAYOUT_KINDS)[number];

export const SYSTEMS_LAYOUTS = ['model', 'auto'] as const;
/** model: the file's own bars-per-system (when present) · auto: automatic line breaking. */
export type SystemsLayout = (typeof SYSTEMS_LAYOUTS)[number];

export const STAFF_DISPLAYS = ['default', 'score-tab', 'score', 'tab'] as const;
/**
 * Which staves to show. `default` follows each track's own configuration; the others apply to
 * stringed tracks (tablature cannot be shown for piano or drums, which keep standard notation).
 */
export type StaffDisplay = (typeof STAFF_DISPLAYS)[number];

/** Which kinds of staff a track shows (REND-031), in place of what the file and the view say. */
export interface TrackStaves {
  readonly trackIndex: number;
  readonly standard: boolean;
  readonly tablature: boolean;
  readonly slash: boolean;
  readonly numbered: boolean;
}

export function sameTrackStaves(a: readonly TrackStaves[], b: readonly TrackStaves[]): boolean {
  return (
    a.length === b.length &&
    a.every((entry, index) => {
      const other = b[index];
      return (
        entry.trackIndex === other?.trackIndex &&
        entry.standard === other.standard &&
        entry.tablature === other.tablature &&
        entry.slash === other.slash &&
        entry.numbered === other.numbered
      );
    })
  );
}

/** Whether two lists of track indexes are the same, in the same order. */
export function sameIndexes(a: readonly number[] = [], b: readonly number[] = []): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** A run of master bars, by index (inclusive). */
export interface BarRange {
  readonly first: number;
  readonly last: number;
}

export interface ViewOptions {
  readonly trackIndexes: readonly number[];
  /** Only these bars (an export of the selection); the whole score when absent. */
  readonly bars?: BarRange;
  readonly layout: LayoutKind;
  readonly systemsLayout: SystemsLayout;
  readonly staffDisplay: StaffDisplay;
  /** Tracks whose staves are chosen one by one, overriding `staffDisplay`. */
  readonly staves?: readonly TrackStaves[];
  /** Transposing instruments written at concert pitch rather than as their parts read (REND-032). */
  readonly concertPitch?: boolean;
  /** Notes coloured by string, interval, degree or chord tone (REND-300…REND-303). */
  readonly noteColors?: NoteColoring;
  /** Note names above the notes and beat counts under them (VIEW-009, REND-306, REND-317). */
  readonly readingAids?: ReadingAids;
  /** Tracks whose notes all ring on (their playing style), marked "let ring throughout" (REND-188). */
  readonly letRing?: readonly number[];
  /** A key to the drums of the drum tracks shown, under the title block (REND-318). */
  readonly drumKey?: boolean;
  /** Chord diagrams mirrored for left-handed players, the highest string on the left (REND-314). */
  readonly leftHanded?: boolean;
  /** The tablature's strings the other way up, the lowest on top (REND-315). */
  readonly invertedTab?: boolean;
  /** Width available to the score in layout units (CSS px at 100 % zoom). */
  readonly width: number;
  /** Size of the notation relative to alphaTab's default (stylesheet scale, 1 = 100 %). */
  readonly notationScale: number;
  /** How the score is engraved; as the file says when absent. */
  readonly style?: ScoreStyle;
}

/** What a laid-out partial contains. */
export type PartialKind = 'header' | 'system' | 'footer' | 'credit';

export interface PartialLayout {
  readonly id: string;
  readonly kind: PartialKind;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** First and last master bar index of a system partial; -1 for other kinds. */
  readonly firstBar: number;
  readonly lastBar: number;
}

export interface LayoutTimings {
  /** Milliseconds spent laying out the score in the engine. */
  readonly layoutMs: number;
}
