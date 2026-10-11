/**
 * PDF export (EXP-001), read back with pdf.js: a page per sheet at the paper's size, music
 * symbols as vector forms, text set in embedded font subsets (selectable, searchable, placed as
 * laid out), text no font covers drawn as an image, and the document's information. Also the
 * TrueType and WOFF reading and subsetting it relies on.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { PdfWriter, type PdfMetadata, type TextRasterizer } from '../src/print/pdf.ts';
import { UNITS_PER_MM, UNITS_PER_POINT, type Sheet } from '../src/print/sheet.ts';
import {
  baselineShift,
  parseUnicodeRanges,
  type TextFace,
  type TextFontFile,
  type TextFontSource,
} from '../src/print/text-fonts.ts';
import { readTrueType } from '../src/print/truetype.ts';
import { RenderSession } from '../src/render/session.ts';
import { PRINT_PALETTE } from '../src/shared/score-colors.ts';
import { readFixture } from './helpers.ts';

const require = createRequire(import.meta.url);

interface FontFile extends TextFontFile {
  readonly face: TextFace;
}

/** Arimo and Gelasio from their packages, as the app ships them. */
function fontFiles(): FontFile[] {
  const files: FontFile[] = [];
  for (const [family, name] of [
    ['sans', 'arimo'],
    ['serif', 'gelasio'],
  ] as const) {
    const unicode = require.resolve(`@fontsource/${name}/unicode.json`);
    const ranges = JSON.parse(readFileSync(unicode, 'utf8')) as Record<string, string>;
    for (const [script, range] of Object.entries(ranges)) {
      for (const weight of [400, 700]) {
        for (const style of ['normal', 'italic']) {
          files.push({
            id: join(dirname(unicode), 'files', `${name}-${script}-${weight}-${style}.woff`),
            ranges: parseUnicodeRanges(range),
            face: { family, bold: weight === 700, italic: style === 'italic' },
          });
        }
      }
    }
  }
  // Latin first, as the app orders them.
  return files.sort((a, b) => Number(!a.id.includes('-latin-')) - Number(!b.id.includes('-latin-')));
}

function fontSource(loaded: string[] = []): TextFontSource {
  const files = fontFiles();
  return {
    files: face =>
      files.filter(
        file =>
          file.face.family === face.family &&
          file.face.bold === face.bold &&
          file.face.italic === face.italic,
      ),
    load: file => {
      loaded.push(file.id);
      return Promise.resolve(new Uint8Array(readFileSync(file.id)));
    },
  };
}

const METADATA: PdfMetadata = {
  title: 'Twelve-Bar Shuffle in A',
  author: 'OpenTabz contributors',
  subject: 'OpenTabz demo',
  creator: 'OpenTabz',
  producer: 'OpenTabz, with the alphaTab notation engine',
  created: new Date(Date.UTC(2026, 9, 11, 12, 0, 0)),
};

const A4 = { width: 210 * UNITS_PER_MM, height: 297 * UNITS_PER_MM };
const MARGIN = { x: 12 * UNITS_PER_MM, y: 15 * UNITS_PER_MM };

/** A score's pages, as the paged view lays them out on A4. */
function sheetsOf(path: string, trackIndexes: readonly number[] = [0]): Sheet[] {
  const { score } = openScore(readFixture(path), path.split('/').at(-1) ?? path);
  const session = new RenderSession(score, {
    trackIndexes,
    layout: 'page',
    systemsLayout: 'auto',
    staffDisplay: 'default',
    width: A4.width - 2 * MARGIN.x,
    notationScale: 1,
  });
  try {
    const layout = session.layout();
    const painted = new Map(
      session.paint(layout.partials.map(partial => partial.id)).map(p => [p.id, p.svg]),
    );
    const pages: { svg: string; x: number; y: number }[][] = [[]];
    let y = MARGIN.y;
    for (const partial of layout.partials) {
      if (partial.kind === 'credit') continue;
      if (y + partial.height > A4.height - MARGIN.y && (pages.at(-1)?.length ?? 0) > 0) {
        pages.push([]);
        y = MARGIN.y;
      }
      pages.at(-1)?.push({ svg: painted.get(partial.id) ?? '', x: MARGIN.x + partial.x, y });
      y += partial.height;
    }
    return pages.map((partials, index) => ({
      ...A4,
      partials,
      header: index > 0 ? { text: 'Twelve-Bar Shuffle in A', align: 'center' as const } : null,
      footer: { text: `${index + 1} / ${pages.length}`, align: 'center' as const },
    }));
  } finally {
    session.dispose();
  }
}

async function writePdf(
  sheets: readonly Sheet[],
  options: { rasterize?: TextRasterizer; loaded?: string[] } = {},
) {
  const writer = new PdfWriter({
    palette: PRINT_PALETTE,
    metadata: METADATA,
    fonts: fontSource(options.loaded),
    ...(options.rasterize === undefined ? {} : { rasterize: options.rasterize }),
  });
  for (const sheet of sheets) await writer.addSheet(sheet);
  return writer.finish();
}

function readPdf(bytes: Uint8Array) {
  return getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    fontExtraProperties: true,
  }).promise;
}

interface TextItem {
  readonly str: string;
  readonly transform: readonly number[];
  readonly width: number;
  readonly fontName: string;
}

async function textItems(bytes: Uint8Array, page = 1): Promise<TextItem[]> {
  const document = await readPdf(bytes);
  const content = await (await document.getPage(page)).getTextContent();
  return content.items.filter((item): item is TextItem & (typeof content.items)[number] => 'str' in item);
}

describe('TrueType and WOFF fonts', () => {
  const file = fontFiles().find(candidate => candidate.id.endsWith('arimo-latin-400-normal.woff'));
  if (file === undefined) throw new Error('Arimo expected.');
  const font = readTrueType(new Uint8Array(readFileSync(file.id)));

  it('are read from WOFF files: metrics, characters and advances', () => {
    expect(font.unitsPerEm).toBe(2048);
    expect(font.postScriptName).toBe('Arimo-Regular');
    // Arimo is as wide as Arial: "A" advances 1366 of 2048 units, the space 569.
    expect(font.advanceOf(font.glyphOf(0x41))).toBe(1366);
    expect(font.advanceOf(font.glyphOf(0x20))).toBe(569);
    expect(font.glyphOf(0x41)).not.toBe(font.glyphOf(0x42));
    // A character the file does not cover maps to the missing glyph.
    expect(font.glyphOf(0x65e5)).toBe(0);
  });

  it('are subset to the glyphs used, keeping glyph ids and checksums', () => {
    const glyph = font.glyphOf(0x41);
    const subset = font.subset([glyph]);
    const again = readTrueType(subset);
    expect(again.glyphCount).toBe(font.glyphCount);
    expect(again.advanceOf(glyph)).toBe(1366);
    const data = new DataView(subset.buffer, subset.byteOffset, subset.byteLength);
    let sum = 0;
    for (let at = 0; at < subset.length; at += 4) sum = (sum + data.getUint32(at)) >>> 0;
    expect(sum).toBe(0xb1b0afba);
    // Only the outlines used stay.
    expect(subset.length).toBeLessThan(8000);
    expect(() => readTrueType(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toThrow();
  });
});

describe('PDF export', () => {
  it('writes a page per sheet at the size of the paper, with the document information', async () => {
    const sheets = sheetsOf('alphatex/demos/twelve-bar-shuffle.atex');
    expect(sheets.length).toBe(2);
    const bytes = await writePdf(sheets);
    expect(new TextDecoder().decode(bytes.subarray(0, 8))).toBe('%PDF-1.7');
    const document = await readPdf(bytes);
    expect(document.numPages).toBe(2);
    const page = await document.getPage(1);
    expect(page.view.map(value => Math.round(value * 100) / 100)).toEqual([0, 0, 595.28, 841.89]);
    const { info } = (await document.getMetadata()) as { info: Record<string, unknown> };
    expect(info).toMatchObject({
      Title: 'Twelve-Bar Shuffle in A',
      Author: 'OpenTabz contributors',
      Subject: 'OpenTabz demo',
      Creator: 'OpenTabz',
      Producer: 'OpenTabz, with the alphaTab notation engine',
    });
  });

  it('sets text in embedded subsets of the fonts, selectable and placed as laid out', async () => {
    const sheets = sheetsOf('alphatex/demos/twelve-bar-shuffle.atex');
    const loaded: string[] = [];
    const bytes = await writePdf(sheets, { loaded });
    const items = await textItems(bytes);
    const title = items.find(item => item.str === 'Twelve-Bar Shuffle in A');
    if (title === undefined)
      throw new Error(`The title expected among ${items.map(item => item.str).join('|')}`);
    // Centred on the page's content (the header is as wide as the content) on its hanging baseline.
    const x = title.transform[4] ?? 0;
    const y = A4.height / UNITS_PER_POINT - (title.transform[5] ?? 0);
    const centre = (x + title.width / 2) * UNITS_PER_POINT;
    expect(centre).toBeCloseTo(A4.width / 2, 0);
    expect(y * UNITS_PER_POINT).toBeCloseTo(MARGIN.y + baselineShift('hanging', 'serif', 32), 1);
    expect(title.transform[0]).toBeCloseTo(32 / UNITS_PER_POINT, 3);
    // Tab numbers, the page number, chord names: all text.
    const strings = items.map(item => item.str);
    expect(strings).toContain('1 / 2');
    expect(strings).toContain('A7');
    expect(strings.filter(text => text === '2').length).toBeGreaterThan(10);
    // Only the Latin files of the faces used were fetched.
    expect(loaded.every(path => path.includes('-latin-'))).toBe(true);
    expect(new Set(loaded).size).toBe(loaded.length);
    // Every font is embedded.
    const page = await (await readPdf(bytes)).getPage(1);
    await page.getOperatorList();
    const fontNames = (await page.getTextContent()).items.map(item =>
      'fontName' in item ? item.fontName : '',
    );
    for (const name of new Set(fontNames)) {
      const font = await new Promise<{ missingFile: boolean; data?: Uint8Array }>(resolve => {
        page.commonObjs.get(name, resolve);
      });
      expect(font.missingFile, name).toBe(false);
      expect(font.data?.length ?? 0).toBeGreaterThan(0);
    }
    // Small: subsets, compressed streams, symbols drawn once.
    expect(bytes.length).toBeLessThan(120_000);
  });

  it('draws music symbols as vector forms, reused, and no images', async () => {
    const bytes = await writePdf(sheetsOf('alphatex/demos/twelve-bar-shuffle.atex'));
    const document = await readPdf(bytes);
    const operators = await (await document.getPage(1)).getOperatorList();
    const count = (op: number) => operators.fnArray.filter(fn => fn === op).length;
    expect(count(OPS.paintFormXObjectBegin)).toBeGreaterThan(100);
    expect(count(OPS.paintImageXObject)).toBe(0);
    const text = new TextDecoder('latin1').decode(bytes);
    // One form per symbol however often it is drawn.
    const forms = text.match(/\/Subtype \/Form/g)?.length ?? 0;
    expect(forms).toBeGreaterThan(5);
    expect(forms).toBeLessThan(40);
  });

  it('draws text no font covers as an image, the rest as text', async () => {
    const calls: string[] = [];
    const rasterize: TextRasterizer = text => {
      calls.push(text);
      return {
        width: 24,
        left: 0,
        top: -10,
        boxWidth: 24,
        boxHeight: 12,
        columns: 2,
        rows: 2,
        alpha: Uint8Array.of(0, 255, 255, 0),
      };
    };
    const sheet: Sheet = {
      ...A4,
      partials: [
        {
          svg: `<svg><text x="100" y="100" style='stroke: none; font:15px Georgia, serif; '>Words: 日本 Ünïcödé</text></svg>`,
          x: 0,
          y: 0,
        },
      ],
      header: null,
      footer: null,
    };
    const bytes = await writePdf([sheet], { rasterize });
    expect(calls).toEqual(['日本']);
    const document = await readPdf(bytes);
    const page = await document.getPage(1);
    const operators = await page.getOperatorList();
    expect(operators.fnArray.filter(fn => fn === OPS.paintImageXObject).length).toBe(1);
    const strings = (await page.getTextContent()).items.map(item => ('str' in item ? item.str : ''));
    expect(strings.join('')).toContain('Words: ');
    expect(strings.join('')).toContain('Ünïcödé');
  });
});
