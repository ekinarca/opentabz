/**
 * User preferences, persisted in localStorage (until the M3 library moves them to IndexedDB).
 * Reads and writes are guarded: private windows and blocked storage fall back to defaults.
 */
import type { LayoutKind, StaffDisplay } from '@opentabz/core/shared';
import { create } from 'zustand';
import {
  FRETBOARD_SHOWS,
  NOTE_LABELS,
  type FretboardShow,
  type NoteLabels,
} from '../instrument-view/fretboard.ts';
import { DRUM_MODES, type DrumMode } from '../instrument-view/drums.ts';
import { HANDS, type Hand } from '../instrument-view/keyboard.ts';
import type { PaperId } from '../score-view/pagination.ts';

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
  readonly paper: PaperId;
  readonly staffDisplay: StaffDisplay;
  /** Shortcuts on a single character key (−, =, ?): can be turned off (WCAG 2.2 SC 2.1.4). */
  readonly singleKeyShortcuts: boolean;
  readonly scrollMode: ScrollMode;
  readonly scrollOffset: number;
  readonly cursorStyle: CursorStyle;
  readonly cursorColor: CursorColor;
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
  readonly audioLatency: AudioLatency;
  /** How exported files are named, with tokens (see export/file-names.ts). */
  readonly exportFileName: string;
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
    paper: defaultPaper(locale),
    staffDisplay: 'default',
    singleKeyShortcuts: true,
    scrollMode: 'continuous',
    scrollOffset: 0.18,
    cursorStyle: 'smooth',
    cursorColor: 'accent',
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
    audioLatency: 'interactive',
    exportFileName: '%T',
  };
}

function oneOf<T>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

export function parsePreferences(raw: string | null, fallback: Preferences): Preferences {
  if (raw === null) return fallback;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof Preferences, unknown>>;
    return {
      theme: (THEME_PREFERENCES as readonly unknown[]).includes(value.theme)
        ? (value.theme as ThemePreference)
        : fallback.theme,
      layout:
        value.layout === 'page' || value.layout === 'scroll' || value.layout === 'horizontal'
          ? value.layout
          : fallback.layout,
      paper: value.paper === 'a4' || value.paper === 'letter' ? value.paper : fallback.paper,
      staffDisplay:
        value.staffDisplay === 'default' ||
        value.staffDisplay === 'score-tab' ||
        value.staffDisplay === 'score' ||
        value.staffDisplay === 'tab'
          ? value.staffDisplay
          : fallback.staffDisplay,
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
      audioLatency: oneOf(value.audioLatency, AUDIO_LATENCIES, fallback.audioLatency),
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
      paper: state.paper,
      staffDisplay: state.staffDisplay,
      singleKeyShortcuts: state.singleKeyShortcuts,
      scrollMode: state.scrollMode,
      scrollOffset: state.scrollOffset,
      cursorStyle: state.cursorStyle,
      cursorColor: state.cursorColor,
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
      audioLatency: state.audioLatency,
      exportFileName: state.exportFileName,
    });
  },
}));

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}
