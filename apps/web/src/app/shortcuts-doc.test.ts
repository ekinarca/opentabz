/** docs/SHORTCUTS.md lists every shortcut in the keymap, with the same keys. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatBinding, SHORTCUTS } from './keymap.ts';

const doc = readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'docs', 'SHORTCUTS.md'), 'utf8');

describe('docs/SHORTCUTS.md', () => {
  it.each(SHORTCUTS.map(shortcut => [shortcut.id, shortcut] as const))('documents %s', (_, shortcut) => {
    const row = doc.split('\n').find(line => line.split('|')[1]?.trim() === shortcut.label);
    expect(row, `no table row for "${shortcut.label}"`).toBeDefined();
    for (const binding of shortcut.bindings) {
      expect(row).toContain(`\`${formatBinding(binding, 'Ctrl')}\``);
      expect(row).toContain(`\`${formatBinding(binding, '⌘')}\``);
    }
  });
});
