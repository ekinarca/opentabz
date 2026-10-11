/**
 * Outlines read from font files (REND-241): Bravura's PostScript outlines, read from its .otf by
 * the CFF reader, match the outlines of its SVG font that the music glyph table keeps, symbol by
 * symbol; TrueType outlines come out as quadratic curves; WOFF 2 and other files are refused.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { musicGlyph } from '../src/print/glyphs.ts';
import { readOutlines } from '../src/print/outlines.ts';
import { parsePath } from '../src/print/path.ts';
import { FontFormatError, readTrueType } from '../src/print/truetype.ts';

const require = createRequire(import.meta.url);
const fonts = join(dirname(require.resolve('@coderline/alphatab')), 'font');
const bravura = new Uint8Array(readFileSync(join(fonts, 'Bravura.otf')));

/** A path's contours and the box around its points. */
function shape(d: string) {
  const segments = parsePath(d);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const segment of segments) {
    if (segment[0] === 'Z') continue;
    const values = segment.slice(1) as number[];
    // The end point of each segment: where the outline goes, not its handles.
    xs.push(values.at(-2) ?? 0);
    ys.push(values.at(-1) ?? 0);
  }
  return {
    contours: segments.filter(segment => segment[0] === 'M').length,
    box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
  };
}

describe('outlines from font files', () => {
  it('reads Bravura’s PostScript outlines as its SVG font has them', () => {
    const outlines = readOutlines(bravura);
    const symbols = Object.values(alphaTab.model.MusicFontSymbol).filter(
      (value): value is number => typeof value === 'number' && value > 0 && musicGlyph(value) !== undefined,
    );
    expect(symbols.length).toBeGreaterThan(250);
    let compared = 0;
    for (const symbol of symbols) {
      const expected = musicGlyph(symbol);
      const read = outlines.glyph(symbol);
      const name = `U+${symbol.toString(16)}`;
      expect(read, name).toBeDefined();
      if (expected === undefined || read === undefined) continue;
      expect(Math.abs(read.advance - expected.advance), name).toBeLessThanOrEqual(1);
      if (expected.d.trim().length === 0) {
        expect(read.d, name).toBe('');
        continue;
      }
      const want = shape(expected.d);
      const got = shape(read.d);
      expect(got.contours, name).toBe(want.contours);
      got.box.forEach((value, index) => {
        expect(Math.abs(value - (want.box[index] ?? 0)), `${name} box ${index}`).toBeLessThanOrEqual(1);
      });
      compared++;
    }
    expect(compared).toBeGreaterThan(250);
  });

  it('reads TrueType outlines (quadratic curves) from a WOFF file, scaled to 1000 units per em', () => {
    const woff = new Uint8Array(
      readFileSync(
        join(
          dirname(require.resolve('@fontsource/arimo/unicode.json')),
          'files',
          'arimo-latin-400-normal.woff',
        ),
      ),
    );
    const outlines = readOutlines(woff);
    const font = readTrueType(woff);
    const toThousand = 1000 / 2048;
    for (const char of ['A', 'O', 'g', '8']) {
      const codePoint = char.codePointAt(0) ?? 0;
      const glyph = outlines.glyph(codePoint);
      expect(glyph, char).toBeDefined();
      if (glyph === undefined) continue;
      expect(glyph.advance).toBeCloseTo(font.advanceOf(font.glyphOf(codePoint)) * toThousand, 5);
      const { contours, box } = shape(glyph.d);
      // Inside the em, on the baseline or below it for descenders.
      expect(box[0] ?? -1, char).toBeGreaterThanOrEqual(-50);
      expect(box[2] ?? 2000, char).toBeLessThanOrEqual(1000);
      expect(box[3] ?? 2000, char).toBeLessThanOrEqual(800);
      expect(contours, char).toBeGreaterThan(0);
    }
    // O and 8 have holes; curves are quadratic.
    expect(shape(outlines.glyph(0x4f)?.d ?? '').contours).toBe(2);
    expect(shape(outlines.glyph(0x38)?.d ?? '').contours).toBe(3);
    expect(outlines.glyph(0x4f)?.d).toMatch(/Q/);
    // A descender goes below the baseline.
    expect(shape(outlines.glyph(0x67)?.d ?? '').box[1] ?? 0).toBeLessThan(-100);
  });

  it('leaves out what the font does not have', () => {
    const outlines = readOutlines(bravura);
    expect(outlines.glyph(0x41)).toBeUndefined();
    expect(outlines.glyph(0x10ffff)).toBeUndefined();
  });

  it('refuses WOFF 2 and files that are not fonts', () => {
    const woff2 = new Uint8Array(64);
    woff2.set([0x77, 0x4f, 0x46, 0x32]);
    expect(() => readOutlines(woff2)).toThrow(FontFormatError);
    expect(() => readOutlines(new TextEncoder().encode('not a font, not at all'))).toThrow(FontFormatError);
    expect(() => readOutlines(new Uint8Array(4))).toThrow(FontFormatError);
  });
});
