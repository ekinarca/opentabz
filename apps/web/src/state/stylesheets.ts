/**
 * Stylesheets to choose from (REND-220, REND-310): bundled looks, which change some of a score's
 * style and keep the rest as its file has it, and stylesheets of one's own, saved whole under a
 * name. One of them can be the default for the scores opened from then on. Kept in localStorage,
 * guarded like the preferences.
 */
import {
  DEFAULT_TEXT_FONTS,
  SANS_SERIF,
  SERIF,
  TEXT_ELEMENTS,
  type ScoreStyle,
  type TextFonts,
} from '@opentabz/core/shared';
import { parseStyle } from './style-memory.ts';

export const LOOK_IDS = ['classic', 'pop', 'jazz', 'large', 'compact'] as const;
export type LookId = (typeof LOOK_IDS)[number];

/** Every text in one family, sizes and styles as they were. */
function allIn(family: string): TextFonts {
  return Object.fromEntries(
    TEXT_ELEMENTS.map(element => [element, { ...DEFAULT_TEXT_FONTS[element], family }]),
  ) as unknown as TextFonts;
}

/** What each bundled look changes in a score's style. */
export const LOOKS: Readonly<Record<LookId, Partial<ScoreStyle>>> = {
  // Engraved: serif texts, chords spelled the classic way.
  classic: { fonts: allIn(SERIF), chordSpelling: 'classic', brackets: 'staves' },
  // Songbook: clean sans-serif texts, rock chord symbols, diagrams above the music.
  pop: { fonts: allIn(SANS_SERIF), chordSpelling: 'rock', chordDiagramsOnTop: true },
  // A chart: jazz chord symbols over the beats, no diagram grid or tuning legend.
  jazz: {
    chordSpelling: 'jazz',
    chordDiagramsOnTop: false,
    chordDiagramsInScore: false,
    tuning: false,
  },
  // For the music stand at a distance.
  large: { scale: 1.5, spacing: 1.2 },
  // As much music on a page as fits.
  compact: { scale: 0.8, spacing: 0.8, tuning: false, chordDiagramsOnTop: false },
};

export interface SavedStylesheet {
  readonly id: string;
  readonly name: string;
  readonly style: ScoreStyle;
}

/** What a stylesheet choice names: a bundled look, or one of one's own. */
export type StylesheetChoice = { readonly look: LookId } | { readonly saved: string };

export const STYLESHEETS_STORAGE_KEY = 'opentabz.stylesheets.v1';
/** The most stylesheets of one's own kept. */
export const MAX_STYLESHEETS = 50;

interface Stored {
  readonly saved: readonly SavedStylesheet[];
  /** The stylesheet scores opened from now on start with, if any. */
  readonly default: StylesheetChoice | null;
}

function parseChoice(value: unknown, saved: readonly SavedStylesheet[]): StylesheetChoice | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as { look?: unknown; saved?: unknown };
  const look = LOOK_IDS.find(id => id === raw.look);
  if (look !== undefined) return { look };
  const own = saved.find(entry => entry.id === raw.saved);
  return own === undefined ? null : { saved: own.id };
}

export function parseStylesheets(raw: string | null): Stored {
  const empty: Stored = { saved: [], default: null };
  if (raw === null) return empty;
  try {
    const value = JSON.parse(raw) as { saved?: unknown; default?: unknown };
    const saved: SavedStylesheet[] = [];
    for (const entry of Array.isArray(value.saved) ? (value.saved as unknown[]) : []) {
      if (typeof entry !== 'object' || entry === null) continue;
      const { id, name, style } = entry as { id?: unknown; name?: unknown; style?: unknown };
      const parsed = parseStyle(style);
      if (typeof id !== 'string' || typeof name !== 'string' || name.trim().length === 0 || parsed === null)
        continue;
      saved.push({ id, name: name.trim(), style: parsed });
    }
    return { saved: saved.slice(0, MAX_STYLESHEETS), default: parseChoice(value.default, saved) };
  } catch {
    return empty;
  }
}

export function loadStylesheets(): Stored {
  try {
    return parseStylesheets(localStorage.getItem(STYLESHEETS_STORAGE_KEY));
  } catch {
    return { saved: [], default: null };
  }
}

function store(next: Stored): Stored {
  try {
    localStorage.setItem(STYLESHEETS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota): kept for this session only.
  }
  return next;
}

/** Saves a style under a name (replacing one of the same name), returning its id. */
export function saveStylesheet(name: string, style: ScoreStyle): string {
  const current = loadStylesheets();
  const trimmed = name.trim();
  const same = current.saved.find(entry => entry.name === trimmed);
  const id = same?.id ?? `own-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const saved = [...current.saved.filter(entry => entry.id !== id), { id, name: trimmed, style }];
  store({ ...current, saved: saved.slice(-MAX_STYLESHEETS) });
  return id;
}

export function deleteStylesheet(id: string): void {
  const current = loadStylesheets();
  const isDefault = current.default !== null && 'saved' in current.default && current.default.saved === id;
  store({
    saved: current.saved.filter(entry => entry.id !== id),
    default: isDefault ? null : current.default,
  });
}

export function setDefaultStylesheet(choice: StylesheetChoice | null): void {
  store({ ...loadStylesheets(), default: choice });
}

/** A score's style with a stylesheet applied: a look over the file's, or one's own whole. */
export function applyStylesheet(choice: StylesheetChoice, fileStyle: ScoreStyle): ScoreStyle {
  if ('look' in choice) return { ...fileStyle, ...LOOKS[choice.look] };
  return loadStylesheets().saved.find(entry => entry.id === choice.saved)?.style ?? fileStyle;
}

/** The style a score opened now starts with: the default stylesheet's, else the file's. */
export function startingStyle(fileStyle: ScoreStyle): ScoreStyle {
  const choice = loadStylesheets().default;
  return choice === null ? fileStyle : applyStylesheet(choice, fileStyle);
}
