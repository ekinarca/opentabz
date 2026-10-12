/** docs/SHORTCUTS.md lists every shortcut in the keymap, with the same keys. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { formatBinding, onPlatform, SHORTCUTS } from './keymap.ts';

const doc = readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'docs', 'SHORTCUTS.md'), 'utf8');

describe('docs/SHORTCUTS.md', () => {
  it.each(SHORTCUTS.map(shortcut => [shortcut.id, shortcut] as const))('documents %s', (_, shortcut) => {
    const row = doc.split('\n').find(line => line.split('|')[1]?.trim() === shortcut.label);
    expect(row, `no table row for "${shortcut.label}"`).toBeDefined();
    const [, , others, apple] = row?.split('|') ?? [];
    for (const binding of shortcut.bindings) {
      if (onPlatform(binding, false)) expect(others).toContain(`\`${formatBinding(binding, 'Ctrl')}\``);
      else expect(others).not.toContain(`\`${formatBinding(binding, 'Ctrl')}\``);
      if (onPlatform(binding, true)) expect(apple).toContain(`\`${formatBinding(binding, '⌘')}\``);
      else expect(apple).not.toContain(`\`${formatBinding(binding, '⌘')}\``);
    }
  });
});
