import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DRUM_BANK, soundFontPresets } from './soundfont-presets.ts';

function sonivox(): ArrayBuffer {
  const require = createRequire(import.meta.url);
  const bytes = readFileSync(
    join(dirname(require.resolve('@coderline/alphatab')), 'soundfont', 'sonivox.sf2'),
  );
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

describe('SoundFont presets', () => {
  it('lists the bundled sound bank: 128 instruments and four drum kits', () => {
    const presets = soundFontPresets(sonivox());
    expect(presets.filter(preset => preset.bank === 0)).toHaveLength(128);
    expect(presets.filter(preset => preset.bank === DRUM_BANK)).toEqual([
      expect.objectContaining({ program: 0, name: 'Standard' }),
      expect.objectContaining({ program: 8, name: 'Room' }),
      expect.objectContaining({ program: 32, name: 'Jazz' }),
      expect.objectContaining({ program: 40, name: 'Brush' }),
    ]);
  });

  it('reads nothing from other files', () => {
    expect(soundFontPresets(new TextEncoder().encode('not a sound font').buffer)).toEqual([]);
    expect(soundFontPresets(new ArrayBuffer(0))).toEqual([]);
  });
});
