/**
 * Fonts of the score's texts (REND-237, REND-238): what the stylesheet chooses for a kind of text
 * is what the engine writes, at the size and in the style chosen; texts left alone keep alphaTab's.
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { pageTexts } from '../src/print/sheet.ts';
import { RenderSession } from '../src/render/session.ts';
import { readScoreStyle } from '../src/render/style.ts';
import type { ScoreStyle } from '../src/shared/style.ts';
import { DEFAULT_TEXT_FONTS, fontFamilies } from '../src/shared/text-fonts.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { readFixture } from './helpers.ts';

/** The shuffle's own style, with some fonts chosen. */
function shuffleStyle(fonts: Partial<ScoreStyle['fonts']> = {}): ScoreStyle {
  const { score } = openScore(readFixture('alphatex/demos/twelve-bar-shuffle.atex'), 'shuffle.atex');
  const style = readScoreStyle(score);
  return { ...style, fonts: { ...style.fonts, ...fonts } };
}

/** Every partial of the shuffle's first track, painted, as one string of SVG. */
function painted(style?: ScoreStyle): string {
  const { score } = openScore(readFixture('alphatex/demos/twelve-bar-shuffle.atex'), 'shuffle.atex');
  const options: ViewOptions = {
    trackIndexes: [0],
    layout: 'page',
    systemsLayout: 'auto',
    staffDisplay: 'default',
    width: 800,
    notationScale: 1,
    ...(style === undefined ? {} : { style }),
  };
  const session = new RenderSession(score, options);
  try {
    const layout = session.layout();
    return session
      .paint(layout.partials.map(partial => partial.id))
      .map(partial => partial.svg)
      .join('\n');
  } finally {
    session.dispose();
  }
}

describe('fonts of the score’s texts', () => {
  it('leaves alphaTab’s fonts as they are by default', () => {
    expect(painted(shuffleStyle())).toBe(painted());
  });

  it('writes a text in the family, size and style chosen for it', () => {
    const svg = painted(
      shuffleStyle({
        title: { family: '"Comic Sans MS", cursive', size: 40, bold: true, italic: false },
        tab: { family: 'Verdana, sans-serif', size: 17, bold: false, italic: true },
      }),
    );
    const fonts = [...svg.matchAll(/font:\s*([^;']+)/g)].map(match => match[1]?.trim() ?? '');
    expect(fonts.some(font => font.includes('bold 40px') && font.includes('Comic Sans MS'))).toBe(true);
    expect(fonts.some(font => font.includes('italic 17px') && font.includes('Verdana'))).toBe(true);
    // The rest as before: the subtitle in alphaTab's serif.
    expect(fonts.some(font => font.includes('20px') && font.includes('Georgia'))).toBe(true);
  });

  it('writes the pages’ header and footer in their fonts (REND-237)', () => {
    const [header, footer] = pageTexts({
      width: 800,
      height: 1000,
      partials: [],
      header: {
        text: 'Title',
        align: 'center',
        font: { family: 'Georgia, serif', size: 14, bold: true, italic: false },
      },
      footer: { text: '1 / 2', align: 'center' },
    });
    expect(header?.style).toEqual({ families: ['Georgia', 'serif'], size: 14, bold: true, italic: false });
    // A footer without a font of its own keeps the paged view's.
    expect(footer?.style.families).toEqual(fontFamilies(DEFAULT_TEXT_FONTS.pageFooter.family));
    expect(footer?.style.size).toBe(DEFAULT_TEXT_FONTS.pageFooter.size);
  });
});
