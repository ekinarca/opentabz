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

  it('keeps a song’s style for the next time it is opened', () => {
    const style = { ...DEFAULT_SCORE_STYLE, systemSeparator: true };
    rememberStyle(HASH, style);
    expect(recallStyle(HASH)).toEqual(style);
    expect(recallStyle('c'.repeat(64))).toBeNull();
  });
});
