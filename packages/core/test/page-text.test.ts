import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_FURNITURE,
  fillTemplate,
  pageLines,
  type ScoreFields,
} from '../src/shared/page-text.ts';

const FIELDS: ScoreFields = {
  title: 'Twelve-Bar Shuffle',
  subtitle: 'A study',
  artist: 'OpenTabz',
  album: '',
  words: '',
  music: 'OpenTabz contributors',
  tabber: 'Ekin',
  copyright: '2026',
};

describe('texts made from the score’s information (REND-236)', () => {
  it('fills the tokens of every field, and the page number and count', () => {
    expect(fillTemplate('%TITLE% (%SUBTITLE%) · %ARTIST%', FIELDS)).toBe(
      'Twelve-Bar Shuffle (A study) · OpenTabz',
    );
    expect(fillTemplate('Tabbed by %TABBER%, © %COPYRIGHT%', FIELDS)).toBe('Tabbed by Ekin, © 2026');
    expect(fillTemplate('Page %PAGE% of %PAGES%', FIELDS, { number: 2, count: 5 })).toBe('Page 2 of 5');
  });

  it('leaves a text out when all it names is missing, and keeps plain text and unknown tokens', () => {
    expect(fillTemplate('Album: %ALBUM%', FIELDS)).toBe('');
    expect(fillTemplate('%ALBUM% %TITLE%', FIELDS)).toBe('Twelve-Bar Shuffle');
    expect(fillTemplate('Draft', FIELDS)).toBe('Draft');
    expect(fillTemplate('%NOPE%', FIELDS)).toBe('%NOPE%');
  });

  it('writes words and music as one only when the same person wrote both', () => {
    expect(fillTemplate('Words & Music by %WORDSMUSIC%', FIELDS)).toBe('');
    expect(fillTemplate('Words & Music by %WORDSMUSIC%', { ...FIELDS, words: 'Ann', music: 'Ann' })).toBe(
      'Words & Music by Ann',
    );
  });
});

describe('the pages’ header and footer (REND-237)', () => {
  it('numbers every page and runs the title on the later ones, by default', () => {
    expect(pageLines(DEFAULT_PAGE_FURNITURE, FIELDS, 1, 3)).toEqual({
      header: null,
      footer: { text: '1 / 3', align: 'center' },
    });
    expect(pageLines(DEFAULT_PAGE_FURNITURE, FIELDS, 2, 3)).toEqual({
      header: { text: 'Twelve-Bar Shuffle', align: 'center' },
      footer: { text: '2 / 3', align: 'center' },
    });
  });

  it('has its own lines for the first page and the later ones, each aligned as asked', () => {
    const furniture = {
      ...DEFAULT_PAGE_FURNITURE,
      firstHeader: { template: '%ARTIST%', align: 'right' as const },
      laterFooter: { template: '%TITLE% · %PAGE%', align: 'left' as const },
    };
    expect(pageLines(furniture, FIELDS, 1, 2).header).toEqual({ text: 'OpenTabz', align: 'right' });
    expect(pageLines(furniture, FIELDS, 2, 2).footer).toEqual({
      text: 'Twelve-Bar Shuffle · 2',
      align: 'left',
    });
  });
});
