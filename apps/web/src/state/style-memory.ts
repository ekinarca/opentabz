/**
 * Stylesheets remembered per song (REND-218: saved with the document): opening the same file
 * again brings back the style chosen for it. Songs are recognised as the mixer recognises them,
 * by a hash of their bytes; styles live in localStorage until the library (M3) keeps them.
 */
import {
  BRACKET_MODES,
  DEFAULT_SCORE_STYLE,
  STYLE_SCALE,
  STYLE_SPACING,
  TEXT_ORIENTATIONS,
  TRACK_NAME_PLACES,
  TRACK_NAME_TEXTS,
  type ScoreStyle,
} from '@opentabz/core/shared';

export const STYLE_STORAGE_KEY = 'opentabz.style.v1';
/** The most songs kept; the least recently used are forgotten first. */
export const MAX_REMEMBERED_STYLES = 100;

function oneOf<T>(value: unknown, options: readonly T[]): T | null {
  return options.includes(value as T) ? (value as T) : null;
}

function within(value: unknown, range: { readonly min: number; readonly max: number }): number | null {
  return typeof value === 'number' && value >= range.min && value <= range.max ? value : null;
}

/** A stored style, or null if any of it is missing or out of range. */
export function parseStyle(value: unknown): ScoreStyle | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Partial<Record<keyof ScoreStyle, unknown>>;
  const flags = [
    'keepTextSize',
    'hideDynamics',
    'singleStaffBrackets',
    'extendBarLines',
    'systemSeparator',
    'tuning',
    'chordDiagramsOnTop',
    'chordDiagramsInScore',
    'multiBarRests',
    'hideEmptyStaves',
    'hideEmptyStavesInFirstSystem',
  ] as const;
  if (flags.some(flag => typeof raw[flag] !== 'boolean')) return null;
  const style = {
    scale: within(raw.scale, STYLE_SCALE),
    spacing: within(raw.spacing, STYLE_SPACING),
    brackets: oneOf(raw.brackets, BRACKET_MODES),
    singleTrackNames: oneOf(raw.singleTrackNames, TRACK_NAME_PLACES),
    multiTrackNames: oneOf(raw.multiTrackNames, TRACK_NAME_PLACES),
    firstSystemNames: oneOf(raw.firstSystemNames, TRACK_NAME_TEXTS),
    otherSystemNames: oneOf(raw.otherSystemNames, TRACK_NAME_TEXTS),
    firstSystemNamesOrientation: oneOf(raw.firstSystemNamesOrientation, TEXT_ORIENTATIONS),
    otherSystemNamesOrientation: oneOf(raw.otherSystemNamesOrientation, TEXT_ORIENTATIONS),
  };
  if (Object.values(style).some(entry => entry === null)) return null;
  return {
    ...DEFAULT_SCORE_STYLE,
    ...Object.fromEntries(flags.map(flag => [flag, raw[flag] === true])),
    ...(style as { [K in keyof typeof style]: NonNullable<(typeof style)[K]> }),
  };
}

/** Remembered styles, most recently used last; anything unreadable is left out. */
export function parseStyleMemory(raw: string | null): Map<string, ScoreStyle> {
  const memory = new Map<string, ScoreStyle>();
  if (raw === null) return memory;
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== 'object' || value === null) return memory;
    for (const [hash, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!/^[0-9a-f]{64}$/.test(hash)) continue;
      const style = parseStyle(entry);
      if (style !== null) memory.set(hash, style);
    }
  } catch {
    return memory;
  }
  return memory;
}

function load(): Map<string, ScoreStyle> {
  try {
    return parseStyleMemory(localStorage.getItem(STYLE_STORAGE_KEY));
  } catch {
    return new Map();
  }
}

export function rememberStyle(hash: string, style: ScoreStyle): void {
  const memory = load();
  memory.delete(hash);
  memory.set(hash, style);
  while (memory.size > MAX_REMEMBERED_STYLES) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch {
    // Storage unavailable (private mode, quota): the style is kept for this session only.
  }
}

export function recallStyle(hash: string): ScoreStyle | null {
  return load().get(hash) ?? null;
}
