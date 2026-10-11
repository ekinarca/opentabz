/**
 * The score's instructions and notice under the title block (REND-041): Guitar Pro's optional
 * blocks of free text, written when the stylesheet shows them, each paragraph wrapped to the width
 * of the music, in the stylesheet's fonts and the title block's colour. The render session places
 * them as a partial of their own between the title block and the first system.
 */
import * as alphaTab from '@coderline/alphatab';
import { TEXT_BLOCKS, type TextAlign, type TextBlockId } from '../shared/page-text.ts';
import type { ScoreStyle } from '../shared/style.ts';
import { alphaTabFont } from './text-fonts.ts';

const { TextAlign: CanvasAlign, TextBaseline } = alphaTab.platform;

export interface TextBlocksLayout {
  readonly height: number;
  /** The blocks painted, as alphaTab paints its partials. */
  readonly svg: string;
}

/** Lines are this many times their text's size apart. */
const LINE_HEIGHT = 1.3;
/** Space above the blocks, between them and below them, in lines of their text. */
const SPACE_ABOVE = 0.4;
const SPACE_BETWEEN = 0.6;
const SPACE_BELOW = 0.4;

const ALIGNS: Readonly<Record<TextAlign, alphaTab.platform.TextAlign>> = {
  left: CanvasAlign.Left,
  center: CanvasAlign.Center,
  right: CanvasAlign.Right,
};

/** The canvas draws in the units it is given: the blocks are laid out at their final size. */
const UNSCALED = new alphaTab.Settings();

/**
 * A text's paragraphs as lines no wider than `width`, broken between words; a word wider than a
 * line has one of its own. Empty paragraphs stay as empty lines, but not at either end.
 */
export function wrapText(text: string, width: number, measure: (line: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(part => part.length > 0)) {
      const longer = line.length === 0 ? word : `${line} ${word}`;
      if (line.length > 0 && measure(longer) > width) {
        lines.push(line);
        line = word;
      } else {
        line = longer;
      }
    }
    lines.push(line);
  }
  while (lines[0] === '') lines.shift();
  while (lines.at(-1) === '') lines.pop();
  return lines;
}

/** The instructions and notice the style shows, laid out and painted, or null when there are none. */
export function layoutTextBlocks(
  score: alphaTab.model.Score,
  style: ScoreStyle,
  settings: alphaTab.Settings,
  width: number,
): TextBlocksLayout | null {
  const texts: Readonly<Record<TextBlockId, string>> = {
    instructions: score.instructions,
    notices: score.notices,
  };
  const shown = TEXT_BLOCKS.filter(id => style.textBlocks[id].visible && texts[id].trim().length > 0);
  if (shown.length === 0) return null;

  // Text grows with the score, unless the stylesheet keeps its size.
  const textScale = settings.display.scale / (style.keepTextSize ? style.scale : 1);
  const [left = 0, , right = 0] = settings.display.padding;
  // The canvas alphaTab paints its SVG partials with.
  const canvas = alphaTab.Environment.getRenderEngineFactory('svg').createCanvas();
  canvas.settings = UNSCALED;
  const blocks = shown.map(id => {
    const font = alphaTabFont(style.fonts[id], style.fonts[id].size * textScale);
    canvas.font = font;
    const lines = wrapText(texts[id], width - left - right, line => canvas.measureText(line).width);
    return { id, font, lines, lineHeight: font.size * LINE_HEIGHT };
  });

  const first = blocks[0]?.lineHeight ?? 0;
  const last = blocks.at(-1)?.lineHeight ?? 0;
  let height = first * SPACE_ABOVE;
  const tops = blocks.map((block, index) => {
    if (index > 0) height += block.lineHeight * SPACE_BETWEEN;
    const top = height;
    height += block.lines.length * block.lineHeight;
    return top;
  });
  height = Math.ceil(height + last * SPACE_BELOW);

  canvas.beginRender(width, height);
  canvas.color = settings.display.resources.scoreInfoColor;
  canvas.textBaseline = TextBaseline.Top;
  blocks.forEach((block, index) => {
    const align = style.textBlocks[block.id].align;
    const x = align === 'left' ? left : align === 'right' ? width - right : (left + width - right) / 2;
    canvas.font = block.font;
    canvas.textAlign = ALIGNS[align];
    block.lines.forEach((line, row) => {
      if (line.length > 0) canvas.fillText(line, x, (tops[index] ?? 0) + row * block.lineHeight);
    });
  });
  const svg = canvas.endRender();
  return typeof svg === 'string' ? { height, svg } : null;
}
