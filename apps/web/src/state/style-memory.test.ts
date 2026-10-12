import { DEFAULT_SCORE_STYLE } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import { parseStyle, parseStyleMemory, recallStyle, rememberStyle } from './style-memory.ts';

const HASH = 'a'.repeat(64);

describe('styles remembered per song', () => {
  it('reads a stored style back, and nothing that is broken or out of range', () => {
    const style = { ...DEFAULT_SCORE_STYLE, scale: 1.5, brackets: 'none', singleTrackNames: 'all' };
    expect(parseStyle(JSON.parse(JSON.stringify(style)))).toEqual(style);
    expect(parseStyle({ ...style, scale: 7 })).toBeNull();
    expect(parseStyle({ ...style, brackets: 'curly' })).toBeNull();
    expect(parseStyle({ ...style, tuning: 'yes' })).toBeNull();
    expect(parseStyle(null)).toBeNull();
    const memory = parseStyleMemory(
      JSON.stringify({ [HASH]: style, short: style, ['b'.repeat(64)]: { scale: 1 } }),
    );
    expect([...memory.keys()]).toEqual([HASH]);
    expect(parseStyleMemory('{oops').size).toBe(0);
  });

  it('reads the title block, the pages’ lines and chord spelling, and takes what older versions lacked from the file', () => {
    const file = {
      ...DEFAULT_SCORE_STYLE,
      titleBlock: {
        ...DEFAULT_SCORE_STYLE.titleBlock,
        title: { visible: false, template: 'T: %TITLE%', align: 'left' as const },
      },
    };
    const stored = {
      ...DEFAULT_SCORE_STYLE,
      chordSpelling: 'jazz',
      pages: { ...DEFAULT_SCORE_STYLE.pages, laterFooter: { template: '%PAGE%', align: 'right' } },
    };
    expect(parseStyle(JSON.parse(JSON.stringify(stored)), file)).toMatchObject({
      chordSpelling: 'jazz',
      pages: { laterFooter: { template: '%PAGE%', align: 'right' } },
    });
    const older = JSON.parse(JSON.stringify(DEFAULT_SCORE_STYLE)) as Record<string, unknown>;
    delete older['titleBlock'];
    delete older['pages'];
    delete older['chordSpelling'];
    expect(parseStyle(older, file)?.titleBlock.title).toEqual(file.titleBlock.title);
    expect(parseStyle({ ...stored, chordSpelling: 'baroque' })).toBeNull();
    expect(parseStyle({ ...stored, pages: { laterFooter: { template: 1 } } })).toBeNull();
  });

  it('reads the staff lines, space between systems and indent (REND-228), in range', () => {
    const stored = JSON.parse(
      JSON.stringify({
        ...DEFAULT_SCORE_STYLE,
        staffLineThickness: 2,
        systemSpacing: 0,
        firstSystemIndent: 15,
      }),
    ) as Record<string, unknown>;
    expect(parseStyle(stored)).toMatchObject({
      staffLineThickness: 2,
      systemSpacing: 0,
      firstSystemIndent: 15,
    });
    expect(parseStyle({ ...stored, staffLineThickness: 9 })).toBeNull();
    expect(parseStyle({ ...stored, firstSystemIndent: -1 })).toBeNull();
    const {
      staffLineThickness: _lines,
      systemSpacing: _spacing,
      firstSystemIndent: _indent,
      ...older
    } = stored;
    expect(parseStyle(older)).toMatchObject({
      staffLineThickness: 1,
      systemSpacing: 1,
      firstSystemIndent: 0,
    });
  });

  it('reads the music font (REND-241): built in or one’s own, Bravura for older styles', () => {
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, musicFont: 'petaluma' })) as Record<
      string,
      unknown
    >;
    expect(parseStyle(stored)?.musicFont).toBe('petaluma');
    expect(parseStyle({ ...stored, musicFont: `own:${'0f'.repeat(8)}` })?.musicFont).toBe(
      `own:${'0f'.repeat(8)}`,
    );
    expect(parseStyle({ ...stored, musicFont: 'comic-sans' })).toBeNull();
    const { musicFont: _musicFont, ...older } = stored;
    expect(parseStyle(older)?.musicFont).toBe('bravura');
  });

  it('reads tempo decimals shown or not (REND-240), older styles taking the file’s', () => {
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, tempoDecimals: false })) as Record<
      string,
      unknown
    >;
    expect(parseStyle(stored)?.tempoDecimals).toBe(false);
    expect(parseStyle({ ...stored, tempoDecimals: 'no' })).toBeNull();
    const { tempoDecimals: _tempoDecimals, ...older } = stored;
    expect(parseStyle(older, { ...DEFAULT_SCORE_STYLE, tempoDecimals: false })?.tempoDecimals).toBe(false);
    expect(parseStyle(older)?.tempoDecimals).toBe(true);
  });

  it('reads the fonts, and nothing broken', () => {
    const fonts = {
      ...DEFAULT_SCORE_STYLE.fonts,
      title: { family: '"Comic Sans MS", sans-serif', size: 40, bold: true, italic: false },
    };
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, fonts })) as Record<string, unknown>;
    expect(parseStyle(stored)?.fonts.title).toEqual(fonts.title);
    expect(parseStyle({ ...stored, fonts: { ...fonts, title: { ...fonts.title, size: 500 } } })).toBeNull();
    expect(parseStyle({ ...stored, fonts: { ...fonts, tab: { ...fonts.tab, family: ' ' } } })).toBeNull();
    // A kind of text an older version did not keep comes from the file's style.
    const { tab: _tab, ...older } = fonts;
    expect(parseStyle({ ...stored, fonts: older })?.fonts.tab).toEqual(DEFAULT_SCORE_STYLE.fonts.tab);
  });

  it('reads the instructions and notice shown or not (REND-041), older styles hiding them', () => {
    const textBlocks = {
      instructions: { visible: true, align: 'center' },
      notices: { visible: false, align: 'right' },
    } as const;
    const stored = JSON.parse(JSON.stringify({ ...DEFAULT_SCORE_STYLE, textBlocks })) as Record<
      string,
      unknown
    >;
    expect(parseStyle(stored)?.textBlocks).toEqual(textBlocks);
    expect(parseStyle({ ...stored, textBlocks: { ...textBlocks, notices: { visible: 'yes' } } })).toBeNull();
    expect(
      parseStyle({ ...stored, textBlocks: { ...textBlocks, instructions: { visible: true, align: 'up' } } }),
    ).toBeNull();
    const { textBlocks: _textBlocks, ...older } = stored;
    expect(parseStyle(older)?.textBlocks).toEqual(DEFAULT_SCORE_STYLE.textBlocks);
  });

  it('keeps a song’s style for the next time it is opened', () => {
    const style = { ...DEFAULT_SCORE_STYLE, systemSeparator: true };
    rememberStyle(HASH, style);
    expect(recallStyle(HASH)).toEqual(style);
    expect(recallStyle('c'.repeat(64))).toBeNull();
  });
});
