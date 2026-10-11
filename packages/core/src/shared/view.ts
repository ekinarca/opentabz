/** Options shared between the UI and the engine for one rendered view of a document. */
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
