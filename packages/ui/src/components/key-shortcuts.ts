/**
 * Keys written for people ("⌘ F6", "Shift Space", "⌃ ⌘ F") as `aria-keyshortcuts` names them
 * ("Meta+F6", "Shift+Space", "Control+Meta+F"), for assistive technology to announce.
 */
const NAMES: Readonly<Record<string, string>> = {
  '⌘': 'Meta',
  '⌃': 'Control',
  Ctrl: 'Control',
  '⌥': 'Alt',
  '⇧': 'Shift',
  Esc: 'Escape',
  '←': 'ArrowLeft',
  '→': 'ArrowRight',
  '↑': 'ArrowUp',
  '↓': 'ArrowDown',
};

export function ariaKeyShortcuts(keys: string): string {
  return keys
    .split(' or ')
    .map(combination =>
      combination
        .trim()
        // Keys named in two words are one key.
        .replace(/Page (Up|Down)/g, 'Page$1')
        .split(/\s+/)
        .map(part => NAMES[part] ?? part)
        .join('+'),
    )
    .join(' ');
}
