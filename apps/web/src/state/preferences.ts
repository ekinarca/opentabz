/**
 * User preferences, persisted in localStorage (until the M3 library moves them to IndexedDB).
 * Reads and writes are guarded: private windows and blocked storage fall back to defaults.
 */
import {
  NOTE_COLOR_MODES,
  NOTE_NAMES,
  NOTE_PALETTES,
  STRING_COLORS,
  type LayoutKind,
  type NoteColorMode,
  type NoteNames,
  type NotePalette,
  type StaffDisplay,
} from '@opentabz/core/shared';
import { create } from 'zustand';
import type { KeyBinding, KeyOverrides } from '../app/keymap.ts';
import {
  FRETBOARD_SHOWS,
  NOTE_LABELS,
  type FretboardShow,
  type NoteLabels,
} from '../instrument-view/fretboard.ts';
import { DRUM_MODES, type DrumMode } from '../instrument-view/drums.ts';
import { HANDS, type Hand } from '../instrument-view/keyboard.ts';
import {
  MARGIN_MM,
  ORIENTATIONS,
  PAGE_ARRANGEMENTS,
  PAPER_IDS,
  PAPER_SIDE_MM,
  pageSetup,
  type Margins,
  type PageArrangement,
  type PageSetup,
  type PaperId,
  type Size,
} from '../score-view/pagination.ts';

export const THEME_PREFERENCES = ['system', 'light', 'dark', 'sepia', 'stage'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

/** How the view follows playback: keeping the playing system in place, page by page, or not. */
export const SCROLL_MODES = ['continuous', 'page', 'off'] as const;
export type ScrollMode = (typeof SCROLL_MODES)[number];
/** The beat line: gliding, jumping from note to note or beat to beat, or hidden. */
export const CURSOR_STYLES = ['smooth', 'note', 'beat', 'hidden'] as const;
export type CursorStyle = (typeof CURSOR_STYLES)[number];
export const CURSOR_COLORS = ['accent', 'blue', 'green', 'violet', 'rose'] as const;
export type CursorColor = (typeof CURSOR_COLORS)[number];
/** How much the audio output buffers: the least delay, a balance, or the steadiest sound. */
export const AUDIO_LATENCIES = ['interactive', 'balanced', 'playback'] as const;
export type AudioLatency = (typeof AUDIO_LATENCIES)[number];
/** Where the playing system sits, as a share of the view's height from the top. */
export const MIN_SCROLL_OFFSET = 0.05;
export const MAX_SCROLL_OFFSET = 0.6;

export interface Preferences {
  readonly theme: ThemePreference;
  readonly layout: LayoutKind;
  /** The paper, its orientation and margins new scores start with. */
  readonly page: PageSetup;
  /** How the pages sit on screen in the page layout. */
  readonly pageArrangement: PageArrangement;
  readonly staffDisplay: StaffDisplay;
  /** Transposing instruments written at concert pitch in scores opened from now on (PLAT-032). */
  readonly concertPitch: boolean;
  /** Shortcuts on a single character key (−, =, ?): can be turned off (WCAG 2.2 SC 2.1.4). */
  readonly singleKeyShortcuts: boolean;
  readonly scrollMode: ScrollMode;
  readonly scrollOffset: number;
  readonly cursorStyle: CursorStyle;
  readonly cursorColor: CursorColor;
  /** Notes coloured by string, interval, degree or chord tone, and in which colours (REND-300…). */
  readonly noteColors: NoteColorMode;
  readonly notePalette: NotePalette;
  /** One's own string colours, from the lowest string up. */
  readonly stringColors: readonly string[];
  /** Note names above the notes, and beat counts under them (VIEW-009, REND-317). */
  readonly noteNames: NoteNames;
  readonly beatCounts: boolean;
  /** A key to the drums under the title block (REND-318). */
  readonly drumKey: boolean;
  /** A tint on the bar being played. */
  readonly barHighlight: boolean;
  /** The notes being played drawn in the cursor colour. */
  readonly noteHighlight: boolean;
  /** The fretboard panel is open. */
  readonly fretboard: boolean;
  /** The keyboard panel is open. */
  readonly keyboard: boolean;
  /** The chords panel is open. */
  readonly chords: boolean;
  /** The lyrics panel is open. */
  readonly lyrics: boolean;
  /** The drum view is open. */
  readonly drums: boolean;
  /** The song overview is open. */
  readonly overview: boolean;
  readonly drumMode: DrumMode;
  /** The drum view's sounds limited to General MIDI's. */
  readonly drumGmOnly: boolean;
  readonly drumLargeLabels: boolean;
  /** The hands the keyboard shows. */
  readonly keyboardHand: Hand;
  readonly fretboardShow: FretboardShow;
  readonly noteLabels: NoteLabels;
  /** Instrument views mirrored for left-handed players. */
  readonly leftHanded: boolean;
  /** The tablature's strings the other way up, the lowest on top (REND-315). */
  readonly invertedTab: boolean;
  /** Each fret written while editing is heard (EDIT-096). */
  readonly hearNotes: boolean;
  readonly audioLatency: AudioLatency;
  /** How exported files are named, with tokens (see export/file-names.ts). */
  readonly exportFileName: string;
  /** The scores opened are kept on this device to open again (LIB-005). */
  readonly rememberRecent: boolean;
  /** The scores open when the app was last left open again at the start (UX-028). */
  readonly reopenSession: boolean;
  /** Keys set in the shortcut sheet in place of the shortcuts' own (PLAT-036). */
  readonly keyBindings: KeyOverrides;
}

/** The longest file-name template kept. */
export const MAX_FILE_NAME_TEMPLATE = 200;

export const STORAGE_KEY = 'opentabz.preferences.v1';

/** US and Canadian locales print on Letter; everyone else on A4. */
export function defaultPaper(locale: string): PaperId {
  return /-(US|CA|MX|PH|CL|CO|VE)$/i.test(locale) ? 'letter' : 'a4';
}

export function defaultPreferences(locale: string): Preferences {
  return {
    theme: 'system',
    layout: 'page',
    page: pageSetup(defaultPaper(locale)),
    pageArrangement: 'vertical',
    staffDisplay: 'default',
    concertPitch: false,
    singleKeyShortcuts: true,
    scrollMode: 'continuous',
    scrollOffset: 0.18,
    cursorStyle: 'smooth',
    cursorColor: 'accent',
    noteColors: 'off',
    notePalette: 'standard',
    stringColors: STRING_COLORS.standard,
    noteNames: 'off',
    beatCounts: false,
    drumKey: false,
    barHighlight: true,
    noteHighlight: true,
    fretboard: false,
    keyboard: false,
    chords: false,
    lyrics: false,
    drums: false,
    overview: false,
    drumMode: 'kit',
    drumGmOnly: false,
    drumLargeLabels: false,
    keyboardHand: 'both',
    fretboardShow: 'next',
    noteLabels: 'hover',
    leftHanded: false,
    invertedTab: false,
    hearNotes: false,
    audioLatency: 'interactive',
    exportFileName: '%T',
    rememberRecent: true,
    reopenSession: false,
    keyBindings: {},
  };
}

/** A binding read back, or null when it is not one. */
function parseBinding(value: unknown): KeyBinding | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const key = record['key'];
  if (typeof key !== 'string' || key.length === 0 || key.length > 20) return null;
  const code = record['code'];
  if (code !== undefined && typeof code !== 'string') return null;
  const flags = ['mod', 'shift', 'alt', 'ctrl'] as const;
  if (flags.some(flag => record[flag] !== undefined && typeof record[flag] !== 'boolean')) return null;
  return {
    key,
    ...(typeof code === 'string' ? { code } : {}),
    ...(record['mod'] === true ? { mod: true } : {}),
    ...(record['shift'] === true ? { shift: true } : {}),
    ...(record['alt'] === true ? { alt: true } : {}),
    ...(record['ctrl'] === true ? { ctrl: true } : {}),
  };
}

/** Keys set in the shortcut sheet, read back; whatever is not a list of bindings is dropped. */
export function parseKeyBindings(value: unknown): KeyOverrides {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const overrides: Record<string, readonly KeyBinding[]> = {};
  for (const [id, list] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const bindings = list.map(parseBinding);
    if (bindings.every(binding => binding !== null)) overrides[id] = bindings;
  }
  return overrides;
}

function oneOf<T>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function numberIn(
  value: unknown,
  range: { readonly min: number; readonly max: number },
  fallback: number,
): number {
  return typeof value === 'number' && value >= range.min && value <= range.max ? value : fallback;
}

/** A stored page setup; older preferences kept only the paper's name. */
function parsePageSetup(raw: unknown, paper: unknown, fallback: PageSetup): PageSetup {
  if (!isRecord(raw)) return { ...fallback, paper: oneOf(paper, PAPER_IDS, fallback.paper) };
  const custom: Size = isRecord(raw['custom'])
    ? {
        width: numberIn(raw['custom']['width'], PAPER_SIDE_MM, fallback.custom.width),
        height: numberIn(raw['custom']['height'], PAPER_SIDE_MM, fallback.custom.height),
      }
    : fallback.custom;
  const margins: Margins = isRecord(raw['margins'])
    ? {
        top: numberIn(raw['margins']['top'], MARGIN_MM, fallback.margins.top),
        right: numberIn(raw['margins']['right'], MARGIN_MM, fallback.margins.right),
        bottom: numberIn(raw['margins']['bottom'], MARGIN_MM, fallback.margins.bottom),
        left: numberIn(raw['margins']['left'], MARGIN_MM, fallback.margins.left),
      }
    : fallback.margins;
  return {
    paper: oneOf(raw['paper'], PAPER_IDS, fallback.paper),
    custom,
    orientation: oneOf(raw['orientation'], ORIENTATIONS, fallback.orientation),
    margins,
  };
}

export function parsePreferences(raw: string | null, fallback: Preferences): Preferences {
  if (raw === null) return fallback;
  try {
    // `paper` is how older versions kept the page: its name only.
    const value = JSON.parse(raw) as Partial<Record<keyof Preferences | 'paper', unknown>>;
    return {
      theme: (THEME_PREFERENCES as readonly unknown[]).includes(value.theme)
        ? (value.theme as ThemePreference)
        : fallback.theme,
      layout:
        value.layout === 'page' || value.layout === 'scroll' || value.layout === 'horizontal'
          ? value.layout
          : fallback.layout,
      page: parsePageSetup(value.page, value.paper, fallback.page),
      pageArrangement: oneOf(value.pageArrangement, PAGE_ARRANGEMENTS, fallback.pageArrangement),
      staffDisplay:
        value.staffDisplay === 'default' ||
        value.staffDisplay === 'score-tab' ||
        value.staffDisplay === 'score' ||
        value.staffDisplay === 'tab'
          ? value.staffDisplay
          : fallback.staffDisplay,
      concertPitch: typeof value.concertPitch === 'boolean' ? value.concertPitch : fallback.concertPitch,
      singleKeyShortcuts:
        typeof value.singleKeyShortcuts === 'boolean'
          ? value.singleKeyShortcuts
          : fallback.singleKeyShortcuts,
      scrollMode: oneOf(value.scrollMode, SCROLL_MODES, fallback.scrollMode),
      scrollOffset:
        typeof value.scrollOffset === 'number' &&
        value.scrollOffset >= MIN_SCROLL_OFFSET &&
        value.scrollOffset <= MAX_SCROLL_OFFSET
          ? value.scrollOffset
          : fallback.scrollOffset,
      cursorStyle: oneOf(value.cursorStyle, CURSOR_STYLES, fallback.cursorStyle),
      cursorColor: oneOf(value.cursorColor, CURSOR_COLORS, fallback.cursorColor),
      noteColors: oneOf(value.noteColors, NOTE_COLOR_MODES, fallback.noteColors),
      notePalette: oneOf(value.notePalette, NOTE_PALETTES, fallback.notePalette),
      stringColors:
        Array.isArray(value.stringColors) &&
        value.stringColors.length === fallback.stringColors.length &&
        value.stringColors.every(color => typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color))
          ? (value.stringColors as string[])
          : fallback.stringColors,
      noteNames: oneOf(value.noteNames, NOTE_NAMES, fallback.noteNames),
      beatCounts: typeof value.beatCounts === 'boolean' ? value.beatCounts : fallback.beatCounts,
      drumKey: typeof value.drumKey === 'boolean' ? value.drumKey : fallback.drumKey,
      barHighlight: typeof value.barHighlight === 'boolean' ? value.barHighlight : fallback.barHighlight,
      noteHighlight: typeof value.noteHighlight === 'boolean' ? value.noteHighlight : fallback.noteHighlight,
      fretboard: typeof value.fretboard === 'boolean' ? value.fretboard : fallback.fretboard,
      keyboard: typeof value.keyboard === 'boolean' ? value.keyboard : fallback.keyboard,
      chords: typeof value.chords === 'boolean' ? value.chords : fallback.chords,
      lyrics: typeof value.lyrics === 'boolean' ? value.lyrics : fallback.lyrics,
      drums: typeof value.drums === 'boolean' ? value.drums : fallback.drums,
      overview: typeof value.overview === 'boolean' ? value.overview : fallback.overview,
      drumMode: oneOf(value.drumMode, DRUM_MODES, fallback.drumMode),
      drumGmOnly: typeof value.drumGmOnly === 'boolean' ? value.drumGmOnly : fallback.drumGmOnly,
      drumLargeLabels:
        typeof value.drumLargeLabels === 'boolean' ? value.drumLargeLabels : fallback.drumLargeLabels,
      keyboardHand: oneOf(value.keyboardHand, HANDS, fallback.keyboardHand),
      fretboardShow: oneOf(value.fretboardShow, FRETBOARD_SHOWS, fallback.fretboardShow),
      noteLabels: oneOf(value.noteLabels, NOTE_LABELS, fallback.noteLabels),
      leftHanded: typeof value.leftHanded === 'boolean' ? value.leftHanded : fallback.leftHanded,
      invertedTab: typeof value.invertedTab === 'boolean' ? value.invertedTab : fallback.invertedTab,
      hearNotes: typeof value.hearNotes === 'boolean' ? value.hearNotes : fallback.hearNotes,
      audioLatency: oneOf(value.audioLatency, AUDIO_LATENCIES, fallback.audioLatency),
      rememberRecent:
        typeof value.rememberRecent === 'boolean' ? value.rememberRecent : fallback.rememberRecent,
      reopenSession: typeof value.reopenSession === 'boolean' ? value.reopenSession : fallback.reopenSession,
      keyBindings:
        value.keyBindings === undefined ? fallback.keyBindings : parseKeyBindings(value.keyBindings),
      exportFileName:
        typeof value.exportFileName === 'string' && value.exportFileName.length <= MAX_FILE_NAME_TEMPLATE
          ? value.exportFileName
          : fallback.exportFileName,
    };
  } catch {
    return fallback;
  }
}

function load(): Preferences {
  const fallback = defaultPreferences(navigator.language);
  try {
    return parsePreferences(localStorage.getItem(STORAGE_KEY), fallback);
  } catch {
    return fallback;
  }
}

function save(preferences: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Storage unavailable (private mode, quota): preferences last for this session only.
  }
}

interface PreferencesStore extends Preferences {
  readonly set: (patch: Partial<Preferences>) => void;
}

export const usePreferences = create<PreferencesStore>((set, get) => ({
  ...load(),
  set: patch => {
    set(patch);
    const state = get();
    save({
      theme: state.theme,
      layout: state.layout,
      page: state.page,
      pageArrangement: state.pageArrangement,
      staffDisplay: state.staffDisplay,
      concertPitch: state.concertPitch,
      singleKeyShortcuts: state.singleKeyShortcuts,
      scrollMode: state.scrollMode,
      scrollOffset: state.scrollOffset,
      cursorStyle: state.cursorStyle,
      cursorColor: state.cursorColor,
      noteColors: state.noteColors,
      notePalette: state.notePalette,
      stringColors: state.stringColors,
      noteNames: state.noteNames,
      beatCounts: state.beatCounts,
      drumKey: state.drumKey,
      barHighlight: state.barHighlight,
      noteHighlight: state.noteHighlight,
      fretboard: state.fretboard,
      keyboard: state.keyboard,
      chords: state.chords,
      lyrics: state.lyrics,
      drums: state.drums,
      overview: state.overview,
      drumMode: state.drumMode,
      drumGmOnly: state.drumGmOnly,
      drumLargeLabels: state.drumLargeLabels,
      keyboardHand: state.keyboardHand,
      fretboardShow: state.fretboardShow,
      noteLabels: state.noteLabels,
      leftHanded: state.leftHanded,
      invertedTab: state.invertedTab,
      hearNotes: state.hearNotes,
      audioLatency: state.audioLatency,
      exportFileName: state.exportFileName,
      rememberRecent: state.rememberRecent,
      reopenSession: state.reopenSession,
      keyBindings: state.keyBindings,
    });
  },
}));

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}
