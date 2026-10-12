/**
 * Music symbols drawn from their outlines (music-glyphs.ts) rather than with the music font, so
 * exported files show them without the font.
 */
import type { DrawOp } from './drawing.ts';
import { MUSIC_GLYPH_DATA, MUSIC_GLYPH_UNITS_PER_EM } from './music-glyphs.ts';

/**
 * The size of alphaTab's music font in layout units at 100 % (its engraving settings'
 * `musicFontSize`); the score view's stylesheet sets the same size.
 */
export const MUSIC_FONT_SIZE = 36;

export interface MusicGlyph {
  /** Advance width in font units. */
  readonly advance: number;
  /** Outline as SVG path data in font units, y up. */
  readonly d: string;
}

let table: Map<number, MusicGlyph> | null = null;

export function musicGlyph(codePoint: number): MusicGlyph | undefined {
  if (table === null) {
    table = new Map();
    for (const line of MUSIC_GLYPH_DATA) {
      const first = line.indexOf(' ');
      const second = line.indexOf(' ', first + 1);
      table.set(Number.parseInt(line.slice(0, first), 16), {
        advance: Number(line.slice(first + 1, second)),
        d: line.slice(second + 1),
      });
    }
  }
  return table.get(codePoint);
}

export interface PlacedGlyph {
  readonly codePoint: number;
  /** Where the glyph's origin sits on its baseline, in layout units. */
  readonly x: number;
  readonly y: number;
  /** Layout units per font unit. */
  readonly scale: number;
  readonly glyph: MusicGlyph | undefined;
}

/**
 * Where a music font's glyphs come from: Bravura's table, or another font's outlines in the same
 * units (outlines.ts).
 */
export type MusicGlyphs = (codePoint: number) => MusicGlyph | undefined;

/** The glyphs of a row of symbols, set one after another as the music font sets them. */
export function placeSymbols(
  op: Extract<DrawOp, { kind: 'symbols' }>,
  glyphOf: MusicGlyphs = musicGlyph,
): PlacedGlyph[] {
  const scale = (MUSIC_FONT_SIZE * op.scale) / MUSIC_GLYPH_UNITS_PER_EM;
  const glyphs = op.codePoints.map(codePoint => ({ codePoint, glyph: glyphOf(codePoint) }));
  const total = glyphs.reduce((sum, { glyph }) => sum + (glyph?.advance ?? 0) * scale, 0);
  let x = op.anchor === 'middle' ? op.x - total / 2 : op.anchor === 'end' ? op.x - total : op.x;
  return glyphs.map(({ codePoint, glyph }) => {
    const placed = { codePoint, x, y: op.y, scale, glyph };
    x += (glyph?.advance ?? 0) * scale;
    return placed;
  });
}
