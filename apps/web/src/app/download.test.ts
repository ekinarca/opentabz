import { describe, expect, it } from 'vitest';
import { fileBase } from './download.ts';

describe('file names for exports', () => {
  it('keeps a title as it is when the file system takes it', () => {
    expect(fileBase('Twelve-Bar Shuffle in A')).toBe('Twelve-Bar Shuffle in A');
  });

  it('replaces what file systems refuse and never starts with a dot', () => {
    expect(fileBase('AC/DC: "Back in Black"?')).toBe('AC-DC- -Back in Black-');
    expect(fileBase('..hidden')).toBe('hidden');
    expect(fileBase('Line\nbreak\tand tab')).toBe('Line break and tab');
  });

  it('falls back when nothing is left', () => {
    expect(fileBase('  ')).toBe('Untitled');
    expect(fileBase('', 'Track')).toBe('Track');
  });
});
