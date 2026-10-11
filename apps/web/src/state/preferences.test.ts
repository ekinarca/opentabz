import { describe, expect, it } from 'vitest';
import { defaultPaper, defaultPreferences, parsePreferences, resolveTheme } from './preferences.ts';

const FALLBACK = defaultPreferences('en-GB');

describe('preferences', () => {
  it('print on Letter in the Americas that use it, A4 elsewhere', () => {
    expect(defaultPaper('en-US')).toBe('letter');
    expect(defaultPaper('es-MX')).toBe('letter');
    expect(defaultPaper('tr-TR')).toBe('a4');
  });

  it('fall back to the defaults for missing or broken storage', () => {
    expect(parsePreferences(null, FALLBACK)).toEqual(FALLBACK);
    expect(parsePreferences('{oops', FALLBACK)).toEqual(FALLBACK);
  });

  it('read back how the view follows playback, keeping valid values only', () => {
    const stored = JSON.stringify({
      scrollMode: 'page',
      scrollOffset: 0.4,
      cursorStyle: 'beat',
      cursorColor: 'violet',
      barHighlight: false,
      noteHighlight: false,
    });
    expect(parsePreferences(stored, FALLBACK)).toMatchObject({
      scrollMode: 'page',
      scrollOffset: 0.4,
      cursorStyle: 'beat',
      cursorColor: 'violet',
      barHighlight: false,
      noteHighlight: false,
    });
    const invalid = JSON.stringify({
      scrollMode: 'sideways',
      scrollOffset: 2,
      cursorStyle: 'wobbly',
      cursorColor: 'plaid',
      barHighlight: 'yes',
      noteHighlight: 1,
    });
    expect(parsePreferences(invalid, FALLBACK)).toMatchObject({
      scrollMode: FALLBACK.scrollMode,
      scrollOffset: FALLBACK.scrollOffset,
      cursorStyle: FALLBACK.cursorStyle,
      cursorColor: FALLBACK.cursorColor,
      barHighlight: FALLBACK.barHighlight,
      noteHighlight: FALLBACK.noteHighlight,
    });
  });

  it('read back the fretboard settings, keeping valid values only', () => {
    const stored = JSON.stringify({
      fretboard: true,
      fretboardShow: 'bar',
      noteLabels: 'always',
      leftHanded: true,
    });
    expect(parsePreferences(stored, FALLBACK)).toMatchObject({
      fretboard: true,
      fretboardShow: 'bar',
      noteLabels: 'always',
      leftHanded: true,
    });
    const invalid = JSON.stringify({
      fretboard: 1,
      fretboardShow: 'song',
      noteLabels: 'sometimes',
      leftHanded: 'yes',
    });
    expect(parsePreferences(invalid, FALLBACK)).toMatchObject({
      fretboard: false,
      fretboardShow: 'next',
      noteLabels: 'hover',
      leftHanded: false,
    });
  });

  it('resolve the system theme from the colour scheme', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('sepia', true)).toBe('sepia');
  });
});
