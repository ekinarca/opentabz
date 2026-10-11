/**
 * Pages as files (EXP-003): what the engine paints is read back completely (every element of
 * every partial), music symbols are drawn from Bravura's outlines, and a sheet becomes a
 * standalone SVG page with the partials where the paged view puts them.
 */
import * as alphaTab from '@coderline/alphatab';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { musicGlyphsModule, readSvgFont } from '../scripts/music-glyphs.ts';
import { openScore } from '../src/open/open.ts';
import { readDrawing, walkDrawing, type DrawOp } from '../src/print/drawing.ts';
import { MUSIC_FONT_SIZE, musicGlyph, placeSymbols } from '../src/print/glyphs.ts';
import { parsePath, pathBounds } from '../src/print/path.ts';
import { pageTexts, sheetSvg, UNITS_PER_MM, type Sheet } from '../src/print/sheet.ts';
import { RenderSession } from '../src/render/session.ts';
import { PRINT_PALETTE, SCORE_COLOR_SENTINELS } from '../src/shared/score-colors.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { listFixtures, readFixture } from './helpers.ts';

const require = createRequire(import.meta.url);
const BRAVURA_SVG = readFileSync(
  join(dirname(require.resolve('@coderline/alphatab')), 'font', 'Bravura.svg'),
  'utf8',
);
const SYMBOLS = Object.values(alphaTab.model.MusicFontSymbol)
  .filter((value): value is number => typeof value === 'number')
  .filter(value => value > 0);

function view(trackCount: number): ViewOptions {
  return {
    trackIndexes: Array.from({ length: trackCount }, (_, index) => index),
    layout: 'page',
    systemsLayout: 'auto',
    staffDisplay: 'default',
    width: 718,
    notationScale: 1,
  };
}

function paintAll(path: string) {
  const { score } = openScore(readFixture(path), path.split('/').at(-1) ?? path);
  const session = new RenderSession(score, view(score.tracks.length));
  try {
    const layout = session.layout();
    const painted = new Map(
      session.paint(layout.partials.map(partial => partial.id)).map(p => [p.id, p.svg]),
    );
    return layout.partials.map(partial => ({ partial, svg: painted.get(partial.id) ?? '' }));
  } finally {
    session.dispose();
  }
}

const count = (svg: string, tag: string) => svg.split(`<${tag} `).length - 1;

function flatten(ops: readonly DrawOp[]): Exclude<DrawOp, { kind: 'group' }>[] {
  const flat: Exclude<DrawOp, { kind: 'group' }>[] = [];
  walkDrawing(ops, op => flat.push(op));
  return flat;
}

describe('music symbol outlines', () => {
  it('are those of the Bravura font alphaTab ships, for every symbol it can draw', () => {
    const committed = readFileSync(
      join(import.meta.dirname, '..', 'src', 'print', 'music-glyphs.ts'),
      'utf8',
    );
    expect(committed, 'run node packages/core/scripts/generate-music-glyphs.ts').toBe(
      musicGlyphsModule(BRAVURA_SVG, SYMBOLS),
    );
    const font = readSvgFont(BRAVURA_SVG);
    for (const symbol of SYMBOLS) {
      expect(musicGlyph(symbol), alphaTab.model.MusicFontSymbol[symbol]).toEqual(font.glyphs.get(symbol));
    }
  });

  it('are drawn at the music font size of alphaTab', () => {
    expect(MUSIC_FONT_SIZE).toBe(new alphaTab.Settings().display.resources.engravingSettings.musicFontSize);
  });

  it('are set in a row by their advances, centred when asked', () => {
    const quarter = alphaTab.model.MusicFontSymbol.NoteheadBlack;
    const advance = (musicGlyph(quarter)?.advance ?? 0) * (MUSIC_FONT_SIZE / 1000);
    const row = placeSymbols({
      kind: 'symbols',
      x: 100,
      y: 50,
      codePoints: [quarter, quarter],
      scale: 1,
      anchor: 'middle',
      fill: null,
    });
    expect(row.map(glyph => glyph.x)).toEqual([100 - advance, 100]);
    expect(row.every(glyph => glyph.y === 50)).toBe(true);
    const small = placeSymbols({
      kind: 'symbols',
      x: 0,
      y: 0,
      codePoints: [quarter],
      scale: 0.7,
      anchor: 'start',
      fill: null,
    });
    expect(small[0]?.scale).toBeCloseTo((0.7 * MUSIC_FONT_SIZE) / 1000, 9);
  });
});

describe('reading painted partials', () => {
  const fixtures = [
    ...listFixtures('alphatex', /\.atex$/),
    ...listFixtures('alphatab/guitarpro8', /\.gp$/),
    'alphatab/guitarpro7/bends.gp',
    'alphatab/lyrics/template.gpx',
  ];

  it.each(fixtures)('%s: every element is read, every symbol has an outline', path => {
    for (const { svg } of paintAll(path)) {
      const drawing = readDrawing(svg);
      expect(drawing.unknown).toEqual([]);
      const ops = flatten(drawing.ops);
      const kinds = (kind: DrawOp['kind']) => ops.filter(op => op.kind === kind).length;
      // Nothing is dropped: one op per element alphaTab wrote.
      expect(kinds('rect')).toBe(count(svg, 'rect'));
      expect(kinds('path')).toBe(count(svg, 'path'));
      expect(kinds('text') + kinds('symbols')).toBe(count(svg, 'text'));
      for (const op of ops) {
        if (op.kind === 'symbols') {
          for (const codePoint of op.codePoints)
            expect(musicGlyph(codePoint), `U+${codePoint.toString(16)}`).toBeDefined();
        } else if (op.kind === 'text') {
          expect(op.style.size).toBeGreaterThan(0);
          expect(op.style.families.length).toBeGreaterThan(0);
        } else if (op.kind === 'path') {
          expect(parsePath(op.d).length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps what alphaTab says about texts, symbols, shapes and rotations', () => {
    const drawing = readDrawing(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="100px" height="50px" class="at-surface-svg">',
        `<text x="50" y="0" style='stroke: none; font:bold italic 32px "Times New Roman", serif; dominant-baseline: hanging' fill="#050505" text-anchor="middle">A &amp; B</text>`,
        '<g class="b12"><g transform="translate(406 29.682)" class="at" ><text style="font-size: 70%; stroke:none" fill="#FF0000" text-anchor="middle">&#57424;&#57425;</text></g></g>',
        '<rect x="1" y="2" width="3" height="4" fill="#020202" />',
        '<rect x="1.5" y="2.5" width="3" height="4" stroke="#000000" stroke-width="2" fill="transparent" />',
        '<path d=" M1,1 L2,2 z" style="stroke: none"/>',
        '<path d=" M1,1 L2,2" stroke="#000000" stroke-width="1.5" style="fill: none" />',
        '<g transform="translate(8 ,190.5) rotate( -90.1)"><text x="0" y="0" style=\'stroke: none; font:12px Arial, sans-serif; \'>R.Gt.</text></g>',
        '</svg>',
      ].join('\n'),
    );
    expect(drawing.unknown).toEqual([]);
    expect(drawing.ops).toEqual([
      {
        kind: 'text',
        x: 50,
        y: 0,
        text: 'A & B',
        style: { families: ['Times New Roman', 'serif'], size: 32, bold: true, italic: true },
        anchor: 'middle',
        baseline: 'hanging',
        fill: '#050505',
      },
      {
        kind: 'symbols',
        x: 406,
        y: 29.682,
        codePoints: [57424, 57425],
        scale: 0.7,
        anchor: 'middle',
        fill: '#FF0000',
      },
      { kind: 'rect', x: 1, y: 2, width: 3, height: 4, fill: '#020202', stroke: false, strokeWidth: 1 },
      { kind: 'rect', x: 1.5, y: 2.5, width: 3, height: 4, fill: false, stroke: '#000000', strokeWidth: 2 },
      { kind: 'path', d: ' M1,1 L2,2 z', fill: null, stroke: false, strokeWidth: 1 },
      { kind: 'path', d: ' M1,1 L2,2', fill: false, stroke: '#000000', strokeWidth: 1.5 },
      {
        kind: 'group',
        translateX: 8,
        translateY: 190.5,
        rotate: -90.1,
        ops: [
          {
            kind: 'text',
            x: 0,
            y: 0,
            text: 'R.Gt.',
            style: { families: ['Arial', 'sans-serif'], size: 12, bold: false, italic: false },
            anchor: 'start',
            baseline: 'alphabetic',
            fill: null,
          },
        ],
      },
    ]);
  });
});

describe('path data', () => {
  it('reads absolute and relative commands, repeats and shorthands into moves, lines and cubics', () => {
    expect(parsePath('M10 20 L30 40 h5 v-5 l1,1 2,2 Z m1 1 30 0')).toEqual([
      ['M', 10, 20],
      ['L', 30, 40],
      ['L', 35, 40],
      ['L', 35, 35],
      ['L', 36, 36],
      ['L', 38, 38],
      ['Z'],
      ['M', 11, 21],
      ['L', 41, 21],
    ]);
    // A quadratic curve becomes the cubic that draws it.
    expect(parsePath('M0 0 Q30 30 60 0')).toEqual([
      ['M', 0, 0],
      ['C', 20, 20, 40, 20, 60, 0],
    ]);
    // Smooth curves reflect the previous control point.
    const smooth = parsePath('M0 0 C0 10 10 10 10 0 S20 -10 20 0');
    expect(smooth[2]).toEqual(['C', 10, -10, 20, -10, 20, 0]);
    const relative = parsePath('m0 0c0 10 10 10 10 0s10 -10 10 0');
    expect(relative).toEqual(smooth);
    const reflected = parsePath('M0 0 Q5 5 10 0 T20 0')[2] ?? [];
    [40 / 3, -10 / 3, 50 / 3, -10 / 3, 20, 0].forEach((value, index) => {
      expect(reflected[index + 1]).toBeCloseTo(value, 9);
    });
  });

  it('turns arcs into curves on the circle, as alphaTab draws filled circles', () => {
    // fillCircle(100, 50, 4): two half circles through (96, 50) and (104, 50).
    const circle = parsePath(' M96,50 A1,1 0 0,0 104,50 A1,1 0 0,0 96,50 z');
    expect(circle[0]).toEqual(['M', 96, 50]);
    const curves = circle.filter(segment => segment[0] === 'C');
    expect(curves.length).toBe(4);
    for (const curve of curves) expect(Math.hypot(curve[5] - 100, curve[6] - 50)).toBeCloseTo(4, 6);
    const bounds = pathBounds(circle);
    expect(bounds.minX).toBeCloseTo(96, 6);
    expect(bounds.maxX).toBeCloseTo(104, 6);
    expect(bounds.maxY - bounds.minY).toBeCloseTo(8, 6);
    // Flags written without separators.
    expect(parsePath('M0 0a5 5 0 105 5').length).toBeGreaterThan(1);
  });

  it('reads every music symbol outline', () => {
    for (const symbol of SYMBOLS) {
      const glyph = musicGlyph(symbol);
      if (glyph === undefined || glyph.d.length === 0) continue;
      const segments = parsePath(glyph.d);
      expect(segments[0]?.[0], alphaTab.model.MusicFontSymbol[symbol]).toBe('M');
    }
  });
});

describe('sheets as SVG pages', () => {
  function shuffleSheet(header: string | null): Sheet {
    const painted = paintAll('alphatex/demos/twelve-bar-shuffle.atex').filter(
      ({ partial }) => partial.kind !== 'credit',
    );
    return {
      width: 210 * UNITS_PER_MM,
      height: 297 * UNITS_PER_MM,
      partials: painted.map(({ partial, svg }) => ({ svg, x: 45.4 + partial.x, y: 56.7 + partial.y })),
      header: header === null ? null : { text: header, align: 'center' },
      footer: { text: 'Page 1 of 1', align: 'center' },
    };
  }

  it('is a standalone SVG of the paper size, in print colours, with its header and footer', () => {
    const svg = sheetSvg(shuffleSheet('Twelve-Bar Shuffle in A'), {
      palette: PRINT_PALETTE,
      background: '#FFFFFF',
      idPrefix: 'p1-',
    });
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" xmlns:xlink=/);
    expect(svg).toContain('width="210mm" height="297mm" viewBox="0 0 793.701 1122.52"');
    expect(svg).toContain('<rect width="793.701" height="1122.52" fill="#FFFFFF"/>');
    // Sentinel colours are gone; the theme's variables are not used.
    for (const sentinel of Object.values(SCORE_COLOR_SENTINELS).filter(value => value !== '#000000')) {
      expect(svg).not.toContain(sentinel);
    }
    expect(svg).not.toContain('var(');
    // Music symbols are outlines, used by reference; no music font.
    expect(svg).not.toContain('class="at"');
    expect(svg).not.toContain('Bravura');
    const used = new Set([...svg.matchAll(/xlink:href="#([^"]+)"/g)].map(match => match[1]));
    const defined = new Set([...svg.matchAll(/<path id="([^"]+)"/g)].map(match => match[1]));
    expect(used.size).toBeGreaterThan(5);
    expect(used).toEqual(defined);
    for (const id of defined) expect(id).toMatch(/^p1-g[0-9a-f]+$/);
    // Every group closes.
    expect(svg.split('<g').length).toBe(svg.split('</g>').length);
    expect(
      svg.match(/font-size="11" font-style="italic"[^>]*>Twelve-Bar Shuffle in A<\/text>/g)?.length,
    ).toBe(1);
    expect(svg).toContain('>Page 1 of 1</text>');
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('leaves the background out when it should be transparent', () => {
    const svg = sheetSvg(shuffleSheet(null), { palette: PRINT_PALETTE, background: null, idPrefix: '' });
    expect(svg).not.toContain('<rect width="793.701"');
    expect(svg).not.toContain('font-size="11" font-style="italic"');
  });

  it('writes colours with transparency as a colour and an opacity', () => {
    const svg = sheetSvg(
      {
        width: 100,
        height: 100,
        partials: [
          {
            svg: '<svg><rect x="0" y="0" width="5" height="5" fill="rgba(255,0,0,0.5)" /></svg>',
            x: 0,
            y: 0,
          },
        ],
        header: null,
        footer: null,
      },
      { palette: PRINT_PALETTE, background: null, idPrefix: '' },
    );
    expect(svg).toContain('fill="#FF0000" fill-opacity="0.5"');
  });
});

describe('page texts (REND-237)', () => {
  it('aligns the header and footer to the margins or the middle', () => {
    const texts = pageTexts({
      width: 800,
      height: 1000,
      partials: [],
      header: { text: 'Title · Artist', align: 'left' },
      footer: { text: 'Page 2 of 3', align: 'right' },
      margins: { left: 40, right: 50 },
    });
    expect(texts.map(text => [text.text, text.x, text.anchor])).toEqual([
      ['Title · Artist', 40, 'start'],
      ['Page 2 of 3', 750, 'end'],
    ]);
    const centred = pageTexts({
      width: 800,
      height: 1000,
      partials: [],
      header: null,
      footer: { text: '1', align: 'center' },
    });
    expect(centred.map(text => [text.x, text.anchor])).toEqual([[400, 'middle']]);
  });
});
