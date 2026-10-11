/**
 * Writes packages/core/src/print/music-glyphs.ts from Bravura's SVG font (see music-glyphs.ts).
 * Run with `node packages/core/scripts/generate-music-glyphs.ts` after upgrading alphaTab; a test
 * fails while the file is out of date.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import * as alphaTab from '@coderline/alphatab';
import { musicGlyphsModule } from './music-glyphs.ts';

const require = createRequire(import.meta.url);
const fontSvg = readFileSync(
  join(dirname(require.resolve('@coderline/alphatab')), 'font', 'Bravura.svg'),
  'utf8',
);
const codePoints = Object.values(alphaTab.model.MusicFontSymbol)
  .filter((value): value is number => typeof value === 'number')
  .filter(value => value > 0);
const out = join(import.meta.dirname, '..', 'src', 'print', 'music-glyphs.ts');
writeFileSync(out, musicGlyphsModule(fontSvg, codePoints));
console.log(`Wrote ${codePoints.length} music symbols → ${out}`);
