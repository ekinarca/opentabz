import type { MasterBarSummary } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import {
  formatBinding,
  isCharacterBinding,
  matches,
  sectionTick,
  SHORTCUTS,
  type KeyInput,
} from './keymap.ts';
import { shortcutFor } from './use-shortcuts.ts';

function key(value: string, modifiers: Partial<Omit<KeyInput, 'key'>> = {}): KeyInput {
  return {
    key: value,
    code: '',
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...modifiers,
  };
}

function event(
  value: string,
  modifiers: Partial<Omit<KeyInput, 'key'>> = {},
  target: EventTarget = document.body,
) {
  const keyboard = new KeyboardEvent('keydown', { key: value, bubbles: true, ...modifiers });
  Object.defineProperty(keyboard, 'target', { value: target });
  return keyboard;
}

const context = { hasScore: true, singleKeyShortcuts: true, apple: true };

describe('keymap', () => {
  it('matches the primary modifier per platform and nothing else', () => {
    const goTo = { key: 'g', mod: true };
    expect(matches(goTo, key('g', { metaKey: true }), true)).toBe(true);
    expect(matches(goTo, key('g', { ctrlKey: true }), true)).toBe(false);
    expect(matches(goTo, key('g', { ctrlKey: true }), false)).toBe(true);
    expect(matches(goTo, key('G', { ctrlKey: true, shiftKey: true }), false)).toBe(false);
    expect(matches(goTo, key('g', { ctrlKey: true, altKey: true }), false)).toBe(false);
  });

  it('matches letters with Alt by their physical key (⌥M types µ on macOS)', () => {
    const metronome = { key: 'm', code: 'KeyM', alt: true };
    expect(matches(metronome, key('µ', { code: 'KeyM', altKey: true }), true)).toBe(true);
    expect(matches(metronome, key('m', { code: 'KeyM', altKey: true }), false)).toBe(true);
    expect(matches(metronome, key('m', { code: 'KeyM' }), false)).toBe(false);
  });

  it('ignores Shift for printable symbols that need it, but not for named keys', () => {
    expect(matches({ key: '+' }, key('+', { shiftKey: true }), true)).toBe(true);
    expect(matches({ key: '?' }, key('?', { shiftKey: true }), true)).toBe(true);
    expect(matches({ key: 'ArrowLeft' }, key('ArrowLeft', { shiftKey: true }), true)).toBe(false);
    expect(matches({ key: 'ArrowLeft', shift: true }, key('ArrowLeft', { shiftKey: true }), true)).toBe(true);
  });

  it('has unique ids and no two shortcuts on the same keys', () => {
    expect(new Set(SHORTCUTS.map(shortcut => shortcut.id)).size).toBe(SHORTCUTS.length);
    const seen = new Map<string, string>();
    for (const shortcut of SHORTCUTS) {
      for (const binding of shortcut.bindings) {
        const id = JSON.stringify([
          binding.key,
          binding.mod === true,
          binding.shift === true,
          binding.alt === true,
        ]);
        expect(seen.get(id), `${shortcut.id} and ${seen.get(id) ?? ''} share ${id}`).toBeUndefined();
        seen.set(id, shortcut.id);
      }
    }
  });

  it('formats bindings for each platform', () => {
    expect(formatBinding({ key: 'ArrowRight', mod: true, shift: true }, '⌘')).toBe('⌘ ⇧ →');
    expect(formatBinding({ key: 'ArrowLeft', mod: true, alt: true }, 'Ctrl')).toBe('Ctrl Alt ←');
    expect(formatBinding({ key: ' ' }, 'Ctrl')).toBe('Space');
    expect(formatBinding({ key: 'g', mod: true }, 'Ctrl')).toBe('Ctrl G');
    expect(isCharacterBinding({ key: '-' })).toBe(true);
    expect(isCharacterBinding({ key: 'g', mod: true })).toBe(false);
    expect(isCharacterBinding({ key: ' ' })).toBe(false);
  });

  it('finds the previous and next section in playback order', () => {
    // Bars of 3840 ticks: master bars 0, 1, 2, 1, 2, 3 (a repeat). Sections at master bars 0 and 2.
    const bars = Int32Array.from(
      [0, 1, 2, 1, 2, 3].flatMap((master, index) => [index * 3840, (index + 1) * 3840, master, 0, 0]),
    );
    const section = { marker: 'A', text: 'Verse' };
    const meter = { numerator: 4, denominator: 4, anacrusis: false };
    const masterBars: MasterBarSummary[] = [
      { ...meter, section },
      { ...meter, section: null },
      { ...meter, section: { marker: 'B', text: 'Chorus' } },
      { ...meter, section: null },
    ];
    expect(sectionTick(bars, masterBars, 0, 1)).toBe(2 * 3840);
    expect(sectionTick(bars, masterBars, 2 * 3840, 1)).toBe(4 * 3840);
    expect(sectionTick(bars, masterBars, 4 * 3840 + 100, 1)).toBeNull();
    expect(sectionTick(bars, masterBars, 4 * 3840 + 1000, -1)).toBe(4 * 3840);
    expect(sectionTick(bars, masterBars, 4 * 3840, -1)).toBe(2 * 3840);
    expect(sectionTick(bars, masterBars, 100, -1)).toBeNull();
  });
});

describe('shortcut context', () => {
  it('needs an open score for score actions but not for opening files or the sheet', () => {
    expect(shortcutFor(event(' '), { ...context, hasScore: false })).toBeNull();
    expect(shortcutFor(event('o', { metaKey: true }), { ...context, hasScore: false })?.id).toBe('open');
    expect(shortcutFor(event('?', { shiftKey: true }), { ...context, hasScore: false })?.id).toBe(
      'shortcuts',
    );
  });

  it('leaves keys alone in text fields, except opening files', () => {
    const input = document.createElement('input');
    expect(shortcutFor(event('-', {}, input), context)).toBeNull();
    expect(shortcutFor(event('ArrowLeft', {}, input), context)).toBeNull();
    expect(shortcutFor(event('o', { metaKey: true }, input), context)?.id).toBe('open');
  });

  it('keeps Space and arrows for focused controls, but runs modified keys and F-keys', () => {
    const button = document.createElement('button');
    expect(shortcutFor(event(' ', {}, button), context)).toBeNull();
    expect(shortcutFor(event('ArrowRight', {}, button), context)).toBeNull();
    expect(shortcutFor(event('ArrowRight', { metaKey: true }, button), context)?.id).toBe('bar-next');
    expect(shortcutFor(event('F9', {}, button), context)?.id).toBe('loop');
    expect(shortcutFor(event('Escape', {}, button), context)?.id).toBe('clear-selection');
    // Typed characters mean nothing to a button: the speed keys work from the toolbar.
    expect(shortcutFor(event('-', {}, button), context)?.id).toBe('speed-down');
  });

  it('leaves typed characters to widgets with typeahead or values', () => {
    const slider = document.createElement('span');
    slider.setAttribute('role', 'slider');
    const menuItem = document.createElement('div');
    menuItem.setAttribute('role', 'menuitemradio');
    expect(shortcutFor(event('-', {}, slider), context)).toBeNull();
    expect(shortcutFor(event('ArrowRight', {}, slider), context)).toBeNull();
    expect(shortcutFor(event('=', {}, menuItem), context)).toBeNull();
    expect(shortcutFor(event('F9', {}, slider), context)?.id).toBe('loop');
  });

  it('gives keys to an open dialog or menu', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const inside = document.createElement('div');
    dialog.append(inside);
    expect(shortcutFor(event('Escape', {}, inside), context)).toBeNull();
    expect(shortcutFor(event('ArrowRight', { metaKey: true }, inside), context)).toBeNull();
  });

  it('can turn single-key shortcuts off (WCAG 2.1.4)', () => {
    expect(shortcutFor(event('-'), context)?.id).toBe('speed-down');
    expect(shortcutFor(event('-'), { ...context, singleKeyShortcuts: false })).toBeNull();
    expect(shortcutFor(event('?', { shiftKey: true }), { ...context, singleKeyShortcuts: false })).toBeNull();
    // Space is a key, not a character shortcut.
    expect(shortcutFor(event(' '), { ...context, singleKeyShortcuts: false })?.id).toBe('play-pause');
  });

  it('uses Guitar Pro keys for moving around', () => {
    expect(shortcutFor(event('ArrowRight'), context)?.id).toBe('beat-next');
    expect(shortcutFor(event('ArrowRight', { altKey: true }), context)?.id).toBe('beat-next-audible');
    expect(shortcutFor(event('ArrowRight', { metaKey: true }), context)?.id).toBe('bar-next');
    expect(shortcutFor(event('ArrowRight', { metaKey: true, altKey: true }), context)?.id).toBe(
      'section-next',
    );
    expect(shortcutFor(event('PageDown', { altKey: true }), context)?.id).toBe('section-next');
    expect(shortcutFor(event('ArrowRight', { shiftKey: true }), context)?.id).toBe('select-beat-right');
    expect(shortcutFor(event('ArrowRight', { metaKey: true, shiftKey: true }), context)?.id).toBe(
      'select-bar-right',
    );
    expect(shortcutFor(event('Home', { metaKey: true }), context)?.id).toBe('song-start');
  });
});
