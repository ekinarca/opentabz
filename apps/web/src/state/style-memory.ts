/**
 * Stylesheets remembered per song (REND-218: saved with the document): opening the same file
 * again brings back the style chosen for it. Songs are recognised as the mixer recognises them,
 * by a hash of their bytes; styles live in localStorage until the library (M3) keeps them.
 */
import {
  BRACKET_MODES,
  CHORD_SPELLINGS,
  DEFAULT_SCORE_STYLE,
  PAGE_LINES,
  STYLE_SCALE,
  STYLE_SPACING,
  TEXT_ALIGNS,
  TEXT_ORIENTATIONS,
  TITLE_ELEMENTS,
  TRACK_NAME_PLACES,
  TRACK_NAME_TEXTS,
  type PageFurniture,
  type ScoreStyle,
  type TitleBlock,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** A stored title block, or null; lines it lacks come from `fallback`. */
function parseTitleBlock(value: unknown, fallback: TitleBlock): TitleBlock | null {
  if (!isRecord(value)) return null;
  const lines = TITLE_ELEMENTS.map(element => {
    const line = value[element];
    if (line === undefined) return [element, fallback[element]] as const;
    if (!isRecord(line) || typeof line['visible'] !== 'boolean' || typeof line['template'] !== 'string')
      return null;
    const align = oneOf(line['align'], TEXT_ALIGNS);
    return align === null
      ? null
      : ([element, { visible: line['visible'], template: line['template'], align }] as const);
  });
  if (lines.some(line => line === null)) return null;
  return Object.fromEntries(lines.filter(line => line !== null)) as unknown as TitleBlock;
}

function parsePages(value: unknown): PageFurniture | null {
  if (!isRecord(value)) return null;
  const lines = PAGE_LINES.map(id => {
    const line = value[id];
    if (!isRecord(line) || typeof line['template'] !== 'string') return null;
    const align = oneOf(line['align'], TEXT_ALIGNS);
    return align === null ? null : ([id, { template: line['template'], align }] as const);
  });
  if (lines.some(line => line === null)) return null;
  return Object.fromEntries(lines.filter(line => line !== null)) as unknown as PageFurniture;
}

/**
 * A stored style, or null if any of it is broken or out of range. What styles stored by older
 * versions lack (the title block, the pages' lines, chord spelling) comes from `fallback`.
 */
export function parseStyle(value: unknown, fallback: ScoreStyle = DEFAULT_SCORE_STYLE): ScoreStyle | null {
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
  // Switches added later: what an older version did not keep comes from the file's style.
  const laterFlags = ['tempoMarks', 'lyrics'] as const;
  if (laterFlags.some(flag => raw[flag] !== undefined && typeof raw[flag] !== 'boolean')) return null;
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
  const titleBlock =
    raw.titleBlock === undefined ? fallback.titleBlock : parseTitleBlock(raw.titleBlock, fallback.titleBlock);
  const pages = raw.pages === undefined ? fallback.pages : parsePages(raw.pages);
  const chordSpelling =
    raw.chordSpelling === undefined ? fallback.chordSpelling : oneOf(raw.chordSpelling, CHORD_SPELLINGS);
  if (titleBlock === null || pages === null || chordSpelling === null) return null;
  return {
    ...DEFAULT_SCORE_STYLE,
    ...Object.fromEntries(flags.map(flag => [flag, raw[flag] === true])),
    ...Object.fromEntries(
      laterFlags.map(flag => [flag, typeof raw[flag] === 'boolean' ? raw[flag] : fallback[flag]]),
    ),
    ...(style as { [K in keyof typeof style]: NonNullable<(typeof style)[K]> }),
    titleBlock,
    pages,
    chordSpelling,
  };
}

/** Remembered styles, most recently used last; anything unreadable is left out. */
export function parseStyleMemory(
  raw: string | null,
  fallback: ScoreStyle = DEFAULT_SCORE_STYLE,
): Map<string, ScoreStyle> {
  const memory = new Map<string, ScoreStyle>();
  if (raw === null) return memory;
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== 'object' || value === null) return memory;
    for (const [hash, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!/^[0-9a-f]{64}$/.test(hash)) continue;
      const style = parseStyle(entry, fallback);
      if (style !== null) memory.set(hash, style);
    }
  } catch {
    return memory;
  }
  return memory;
}

function load(fallback?: ScoreStyle): Map<string, ScoreStyle> {
  try {
    return parseStyleMemory(localStorage.getItem(STYLE_STORAGE_KEY), fallback);
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

/** A song's remembered style; what an older version did not keep comes from the file's (`fallback`). */
export function recallStyle(hash: string, fallback?: ScoreStyle): ScoreStyle | null {
  return load(fallback).get(hash) ?? null;
}
