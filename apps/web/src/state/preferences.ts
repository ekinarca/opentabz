/**
 * User preferences, persisted in localStorage (until the M3 library moves them to IndexedDB).
 * Reads and writes are guarded: private windows and blocked storage fall back to defaults.
 */
import type { LayoutKind, StaffDisplay } from '@opentabz/core/shared';
import { create } from 'zustand';
import type { PaperId } from '../score-view/pagination.ts';

export const THEME_PREFERENCES = ['system', 'light', 'dark', 'sepia', 'stage'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

export interface Preferences {
  readonly theme: ThemePreference;
  readonly layout: LayoutKind;
  readonly paper: PaperId;
  readonly staffDisplay: StaffDisplay;
  /** Shortcuts on a single character key (−, =, ?): can be turned off (WCAG 2.2 SC 2.1.4). */
  readonly singleKeyShortcuts: boolean;
}

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
  };
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
    const { theme, layout, paper, staffDisplay, singleKeyShortcuts } = get();
    save({ theme, layout, paper, staffDisplay, singleKeyShortcuts });
  },
}));

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}
