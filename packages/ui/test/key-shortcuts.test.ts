/** Keys as people read them, named as assistive technology announces them (aria-keyshortcuts). */
import { describe, expect, it } from 'vitest';
import { ariaKeyShortcuts } from '../src/components/key-shortcuts.ts';

describe('ariaKeyShortcuts', () => {
  it('names the keys of each platform', () => {
    expect(ariaKeyShortcuts('⌘ F6')).toBe('Meta+F6');
    expect(ariaKeyShortcuts('Ctrl F6')).toBe('Control+F6');
    expect(ariaKeyShortcuts('⌃ ⌘ F')).toBe('Control+Meta+F');
    expect(ariaKeyShortcuts('⌥ M')).toBe('Alt+M');
    expect(ariaKeyShortcuts('Shift Space')).toBe('Shift+Space');
    expect(ariaKeyShortcuts('⇧ Space')).toBe('Shift+Space');
    expect(ariaKeyShortcuts('Esc')).toBe('Escape');
    expect(ariaKeyShortcuts('F7')).toBe('F7');
  });

  it('lists the keys of an action with several', () => {
    expect(ariaKeyShortcuts('⌘ ← or ⌥ Page Up')).toBe('Meta+ArrowLeft Alt+PageUp');
  });
});
