/**
 * The score's instructions and notice under the title block (REND-041): hidden until the
 * stylesheet shows them, then written in their fonts, wrapped to the width of the music, aligned
 * as asked; the systems and their bounds make room for them.
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { RenderSession } from '../src/render/session.ts';
import { wrapText } from '../src/render/text-blocks.ts';
import { DEFAULT_TEXT_BLOCKS } from '../src/shared/page-text.ts';
import { BOUNDS_SYSTEM_STRIDE } from '../src/shared/playback.ts';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { readMarks } from './engraving.ts';

const INSTRUCTIONS = 'Swing the eighths.\\nLet the open strings ring.';
const NOTICE = 'Transcribed by ear; the solo is simplified.';

function score(instructions = INSTRUCTIONS, notices = NOTICE) {
  const tex = [
    '\\title "Blocks"',
    `\\instructions "${instructions}"`,
    `\\notices "${notices}"`,
    '\\track "Guitar"',
    '\\staff {tabs}',
    '\\tuning (E4 B3 G3 D3 A2 E2)',
    `:4 ${Array.from({ length: 8 }, () => '0.6 2.5 2.4 0.3').join(' | ')} |`,
  ].join('\n');
  return openScore(new TextEncoder().encode(tex), 'blocks.atex').score;
}

const SHOWN: ScoreStyle = {
  ...DEFAULT_SCORE_STYLE,
  textBlocks: {
    instructions: { visible: true, align: 'left' },
    notices: { visible: true, align: 'left' },
  },
};

function render(style: ScoreStyle, options: Partial<ViewOptions> = {}, of = score()) {
  const session = new RenderSession(of, {
    trackIndexes: [0],
    layout: 'page',
    systemsLayout: 'auto',
    staffDisplay: 'default',
    width: 700,
    notationScale: 1,
    style,
    ...options,
  });
  try {
    const layout = session.layout();
    const painted = session.paint(layout.partials.map(partial => partial.id));
    const marks = painted.flatMap(paint => {
      const partial = layout.partials.find(candidate => candidate.id === paint.id);
      return partial === undefined ? [] : readMarks(paint.svg, partial.x, partial.y, partial.kind);
    });
    const block = layout.partials.find(partial => partial.id.startsWith('ot-block-'));
    const svg = painted.find(paint => paint.id === block?.id)?.svg ?? '';
    return { layout, marks, block, svg };
  } finally {
    session.dispose();
  }
}

const texts = (marks: readonly { kind: string; name: string }[]) =>
  marks.filter(mark => mark.kind === 'text').map(mark => mark.name);

describe('wrapping', () => {
  const measure = (line: string) => line.length * 10;

  it('breaks paragraphs between words, keeping a word wider than a line whole', () => {
    expect(wrapText('one two three four', 100, measure)).toEqual(['one two', 'three four']);
    expect(wrapText('a\nb c\n\nd', 100, measure)).toEqual(['a', 'b c', '', 'd']);
    expect(wrapText('extraordinarily long', 100, measure)).toEqual(['extraordinarily', 'long']);
    expect(wrapText('\n\n  spaced   out  \n\n', 200, measure)).toEqual(['spaced out']);
  });
});

describe('the instructions and notice (REND-041)', () => {
  it('are left out until the stylesheet shows them', () => {
    expect(DEFAULT_TEXT_BLOCKS.instructions.visible).toBe(false);
    expect(DEFAULT_TEXT_BLOCKS.notices.visible).toBe(false);
    const hidden = render(DEFAULT_SCORE_STYLE);
    expect(hidden.block).toBeUndefined();
    expect(texts(hidden.marks)).not.toContain('Swing the eighths.');
  });

  it('are written under the title block, the music moved down to make room', () => {
    const plain = render(DEFAULT_SCORE_STYLE);
    const shown = render(SHOWN);
    const { block } = shown;
    expect(block).toBeDefined();
    if (block === undefined) return;
    // Right after the title block (and the tuning legend), before the first system.
    const kinds = shown.layout.partials.map(partial => (partial.id === block.id ? 'blocks' : partial.kind));
    expect(kinds.indexOf('blocks')).toBe(kinds.indexOf('system') - 1);
    expect(kinds.slice(0, kinds.indexOf('blocks')).every(kind => kind === 'header')).toBe(true);
    const lastHeader = shown.layout.partials[kinds.indexOf('blocks') - 1];
    expect(block.y).toBe((lastHeader?.y ?? 0) + (lastHeader?.height ?? 0));
    expect(shown.layout.height).toBe(plain.layout.height + block.height);

    // Every system, and its bounds, moved down by the blocks' height.
    const systems = (layout: typeof plain.layout) =>
      layout.partials.filter(partial => partial.kind === 'system').map(partial => partial.y);
    expect(systems(shown.layout)).toEqual(systems(plain.layout).map(y => y + block.height));
    const tops = (layout: typeof plain.layout) =>
      Array.from(layout.bounds.systems).filter((_, index) => index % BOUNDS_SYSTEM_STRIDE === 1);
    expect(tops(shown.layout)).toEqual(tops(plain.layout).map(y => y + block.height));

    // The instructions first, then the notice, inside the block.
    const lines = shown.marks.filter(
      mark => mark.kind === 'text' && mark.y >= block.y && mark.y < block.y + block.height,
    );
    expect(lines.map(mark => mark.name)).toEqual([
      'Swing the eighths.',
      'Let the open strings ring.',
      NOTICE,
    ]);
    expect(shown.svg).toContain('font:italic 13px Georgia, serif');
    expect(shown.svg).toContain('font:13px Georgia, serif');
  });

  it('show either alone, aligned as asked, in the fonts chosen', () => {
    const style: ScoreStyle = {
      ...SHOWN,
      textBlocks: {
        instructions: { visible: false, align: 'left' },
        notices: { visible: true, align: 'right' },
      },
      fonts: {
        ...SHOWN.fonts,
        notices: { family: '"Courier New", monospace', size: 16, bold: true, italic: false },
      },
    };
    const { svg, marks } = render(style);
    expect(texts(marks)).not.toContain('Swing the eighths.');
    expect(svg).toContain(`>${NOTICE}</text>`);
    expect(svg).toContain('text-anchor="end"');
    expect(svg).toContain('x="700"');
    expect(svg).toContain('font:bold 16px "Courier New", monospace');
  });

  it('wrap long text to the width of the music, and leave out what the score lacks', () => {
    const long = Array.from({ length: 40 }, (_, index) => `word${index}`).join(' ');
    const { block, marks } = render(SHOWN, { width: 400 }, score(long, ''));
    expect(block).toBeDefined();
    if (block === undefined) return;
    const lines = marks.filter(
      mark => mark.kind === 'text' && mark.y >= block.y && mark.y < block.y + block.height,
    );
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.map(mark => mark.name).join(' ')).toBe(long);
    expect(lines.every(line => line.x + line.width <= 400 + 1)).toBe(true);
    // An empty notice is no block.
    expect(render(SHOWN, {}, score('', '')).block).toBeUndefined();
  });

  it('grow with the score unless the text keeps its size, and stay out of the horizontal layout', () => {
    expect(render({ ...SHOWN, scale: 2 }).svg).toContain('font:italic 26px Georgia, serif');
    expect(render({ ...SHOWN, scale: 2, keepTextSize: true }).svg).toContain(
      'font:italic 13px Georgia, serif',
    );
    expect(render(SHOWN, { layout: 'horizontal' }).block).toBeUndefined();
  });
});
