import { describe, expect, it } from 'vitest';
import { fileName } from './download.ts';

describe('file names for exports', () => {
  it('keeps a title as it is when the file system takes it', () => {
    expect(fileName('Twelve-Bar Shuffle in A', 'mid')).toBe('Twelve-Bar Shuffle in A.mid');
  });

  it('replaces what file systems refuse and never starts with a dot', () => {
    expect(fileName('AC/DC: "Back in Black"?', 'mid')).toBe('AC-DC- -Back in Black-.mid');
    expect(fileName('..hidden', 'wav')).toBe('hidden.wav');
  });

  it('falls back when nothing is left', () => {
    expect(fileName('  ', 'mid')).toBe('Untitled.mid');
    expect(fileName('', 'mid', 'Track')).toBe('Track.mid');
  });
});
