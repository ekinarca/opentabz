import { describe, expect, it } from 'vitest';
import { expandFileName, type FileNameContext } from './file-names.ts';

const CONTEXT: FileNameContext = {
  title: 'Twelve-Bar Shuffle in A',
  trackName: 'Lead Guitar',
  trackNumber: 2,
  trackCount: 4,
  now: new Date(2026, 9, 11, 9, 5),
};

describe('file-name templates (EXP-028)', () => {
  it('fill in the title, the track, its number, the track count, the date and the time', () => {
    expect(expandFileName('%T', CONTEXT)).toBe('Twelve-Bar Shuffle in A');
    expect(expandFileName('%T - %t (%n of %N)', CONTEXT)).toBe(
      'Twelve-Bar Shuffle in A - Lead Guitar (2 of 4)',
    );
    expect(expandFileName('%d %h %T', CONTEXT)).toBe('2026-10-11 09-05 Twelve-Bar Shuffle in A');
  });

  it('keep other text, unknown tokens and escaped percent signs', () => {
    expect(expandFileName('Practice: %x 100%% %T', CONTEXT)).toBe(
      'Practice: %x 100% Twelve-Bar Shuffle in A',
    );
    expect(expandFileName('', CONTEXT)).toBe('');
  });
});
