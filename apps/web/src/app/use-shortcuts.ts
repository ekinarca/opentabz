/**
 * Global keyboard shortcuts, driven by the table in keymap.ts (documented in
 * docs/SHORTCUTS.md). Keys keep their native meaning wherever focus gives them one.
 */
import { useEffect } from 'react';
import { useDocuments } from '../state/documents.ts';
import { usePreferences } from '../state/preferences.ts';
import { isCharacterBinding, matches, SHORTCUTS, type KeyBinding, type Shortcut } from './keymap.ts';
import { modKey } from './platform.ts';

/** Widgets that use Space, Enter, arrows or typed characters themselves (typeahead, values). */
const WIDGET_ROLES = new Set([
  'checkbox',
  'combobox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
]);

/** What kind of control has focus: keys keep their native meaning there. */
export function controlKind(target: EventTarget | null): 'widget' | 'button' | null {
  if (!(target instanceof HTMLElement)) return null;
  const role = target.getAttribute('role') ?? '';
  if (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    WIDGET_ROLES.has(role)
  ) {
    return 'widget';
  }
  if (['BUTTON', 'A'].includes(target.tagName) || role === 'button' || role === 'link') return 'button';
  return null;
}

export function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    (target instanceof HTMLInputElement &&
      !['range', 'checkbox', 'radio', 'button', 'submit'].includes(target.type))
  );
}

/** Inside a dialog, menu or popover, keys belong to that layer. */
function insideLayer(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest('[role="dialog"], [role="menu"], [role="listbox"]') !== null
  );
}

/**
 * Keys with modifiers, function keys and Escape mean nothing to a focused control. Buttons and
 * links also leave typed characters (−, =, ?) alone; Space, Enter and the arrows they keep.
 */
function allowedOn(kind: 'widget' | 'button', binding: KeyBinding): boolean {
  if (binding.mod === true || binding.alt === true || /^F\d+$/.test(binding.key) || binding.key === 'Escape')
    return true;
  return kind === 'button' && isCharacterBinding(binding);
}

/** The shortcut a key event triggers, given where focus is, or null. */
export function shortcutFor(
  event: KeyboardEvent,
  context: { readonly hasScore: boolean; readonly singleKeyShortcuts: boolean; readonly apple: boolean },
): Shortcut | null {
  const target = event.target;
  const inLayer = insideLayer(target);
  const typing = isTextField(target);
  const control = controlKind(target);
  for (const shortcut of SHORTCUTS) {
    if (shortcut.needsScore && !context.hasScore) continue;
    for (const binding of shortcut.bindings) {
      if (!matches(binding, event, context.apple)) continue;
      if (typing && shortcut.inTextFields !== true) continue;
      if (inLayer && shortcut.inTextFields !== true) continue;
      if (control !== null && !allowedOn(control, binding)) continue;
      if (!context.singleKeyShortcuts && isCharacterBinding(binding)) continue;
      return shortcut;
    }
  }
  return null;
}

export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const shortcut = shortcutFor(event, {
        hasScore: useDocuments.getState().activeKey !== null,
        singleKeyShortcuts: usePreferences.getState().singleKeyShortcuts,
        apple: modKey() === '⌘',
      });
      if (shortcut?.run() === true) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
