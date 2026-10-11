import { useEffect } from 'react';
import { resolveTheme, usePreferences } from '../state/preferences.ts';

/** Applies the theme preference to <html data-theme>, following the OS setting for "system". */
export function useTheme(): void {
  const preference = usePreferences(state => state.theme);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset['theme'] = resolveTheme(preference, media.matches);
    };
    apply();
    if (preference !== 'system') return undefined;
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
    };
  }, [preference]);
}
