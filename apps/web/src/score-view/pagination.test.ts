import type { PartialKind, PartialLayout } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import {
  contentWidth,
  engineToSheet,
  gridColumns,
  PAPER_IDS,
  pageGeometry,
  pageSetup,
  paperSize,
  paginate,
  placeContinuous,
  sheetToEngine,
  sheetToEngineNearest,
} from './pagination.ts';

let counter = 0;
function partial(
  kind: PartialKind,
  y: number,
  height: number,
  bars: [number, number] = [-1, -1],
): PartialLayout {
  counter += 1;
  return { id: `p${counter}`, kind, x: 0, y, width: 700, height, firstBar: bars[0], lastBar: bars[1] };
}

/** A strip: header (0–80), then systems of `height` with 10 px gaps, then the credit line. */
function strip(systems: number, height: number): PartialLayout[] {
  const parts = [partial('header', 0, 80)];
  let y = 90;
  for (let i = 0; i < systems; i++) {
    parts.push(partial('system', y, height, [i * 4, i * 4 + 3]));
    y += height + 10;
  }
  parts.push(partial('credit', y, 12));
  return parts;
}

describe('paper (REND-012, REND-221, REND-222)', () => {
  it("has twelve formats at 96 dpi, A4 and Letter among them, and a size of one's own", () => {
    expect(PAPER_IDS).toHaveLength(13);
    const a4 = paperSize(pageSetup('a4'));
    expect(a4.width).toBeCloseTo(793.7, 1);
    expect(a4.height).toBeCloseTo(1122.5, 1);
    const letter = paperSize(pageSetup('letter'));
    expect(letter.width).toBeCloseTo(816, 6);
    expect(letter.height).toBeCloseTo(1056, 6);
    expect(paperSize(pageSetup('a3')).height).toBeCloseTo(420 * (96 / 25.4), 6);
    const custom = paperSize(pageSetup('custom', { custom: { width: 254, height: 127 } }));
    expect(custom.width).toBeCloseTo(960, 6);
    expect(custom.height).toBeCloseTo(480, 6);
  });

  it('turns the paper on its side for landscape', () => {
    const landscape = paperSize(pageSetup('letter', { orientation: 'landscape' }));
    expect(landscape.width).toBeCloseTo(1056, 6);
    expect(landscape.height).toBeCloseTo(816, 6);
  });

  it('subtracts margins (millimetres) from the content width', () => {
    const geometry = pageGeometry(
      pageSetup('letter', { margins: { top: 10, right: 25.4, bottom: 10, left: 25.4 } }),
    );
    expect(contentWidth(geometry)).toBeCloseTo(624, 6);
    expect(geometry.margins.top).toBeCloseTo(10 * (96 / 25.4), 6);
  });
});

describe('paginate', () => {
  const geometry = pageGeometry(pageSetup('a4'));
  const contentHeight = geometry.paper.height - geometry.margins.top - geometry.margins.bottom;

  it('keeps everything on one page when it fits and drops the credit line', () => {
    const sheet = paginate(strip(3, 100), geometry);
    expect(sheet.pages).toHaveLength(1);
    expect(sheet.placements.map(p => p.partial.kind)).toEqual(['header', 'system', 'system', 'system']);
    // Source gaps are preserved.
    const [header, first, second] = sheet.placements;
    expect((first?.y ?? 0) - ((header?.y ?? 0) + 80)).toBeCloseTo(10);
    expect((second?.y ?? 0) - ((first?.y ?? 0) + 100)).toBeCloseTo(10);
  });

  it('never splits a system and starts new pages at the top margin', () => {
    const systems = 20;
    const sheet = paginate(strip(systems, 180), geometry);
    expect(sheet.pages.length).toBeGreaterThan(1);
    for (const placement of sheet.placements) {
      const page = sheet.pages[placement.page];
      expect(page).toBeDefined();
      const top = placement.y - (page?.y ?? 0);
      expect(top).toBeGreaterThanOrEqual(geometry.margins.top - 0.001);
      expect(top + placement.partial.height).toBeLessThanOrEqual(
        geometry.paper.height - geometry.margins.bottom + 0.001,
      );
    }
    const firstOnPage2 = sheet.placements.find(p => p.page === 1);
    expect((firstOnPage2?.y ?? 0) - (sheet.pages[1]?.y ?? 0)).toBeCloseTo(geometry.margins.top);
    expect(sheet.placements.filter(p => p.partial.kind === 'system')).toHaveLength(systems);
  });

  it('places an oversized system alone at the top of its own page', () => {
    const parts = [partial('system', 0, 100, [0, 0]), partial('system', 110, contentHeight + 200, [1, 1])];
    const sheet = paginate(parts, geometry);
    expect(sheet.placements[1]?.page).toBe(1);
    expect(sheet.pages).toHaveLength(2);
  });

  it('computes the sheet size from the page stack', () => {
    const sheet = paginate(strip(20, 180), geometry);
    const pages = sheet.pages.length;
    expect(sheet.width).toBeCloseTo(geometry.paper.width + 2 * geometry.outer);
    expect(sheet.height).toBeCloseTo(
      2 * geometry.outer + pages * geometry.paper.height + (pages - 1) * geometry.gap,
    );
  });

  it('maps engine coordinates onto the sheet', () => {
    const parts = strip(20, 180);
    const sheet = paginate(parts, geometry);
    const lastSystem = sheet.placements.filter(p => p.partial.kind === 'system').at(-1);
    expect(lastSystem).toBeDefined();
    if (lastSystem === undefined) return;
    const mapped = engineToSheet(sheet, 15, lastSystem.partial.y + 5);
    expect(mapped).toEqual({ x: lastSystem.x + 15, y: lastSystem.y + 5 });
    expect(engineToSheet(sheet, 0, -50)).toBeNull();
  });

  it('maps points outside the music to the nearest system, clamped into it', () => {
    const parts = strip(20, 180);
    const sheet = paginate(parts, geometry);
    const systems = sheet.placements.filter(p => p.partial.kind === 'system');
    const [first, second] = systems;
    const last = systems.at(-1);
    if (first === undefined || second === undefined || last === undefined) throw new Error('no systems');
    // Inside a system both mappings agree.
    const inside = { x: first.x + 20, y: first.y + 30 };
    expect(sheetToEngineNearest(sheet, inside.x, inside.y)).toEqual(sheetToEngine(sheet, inside.x, inside.y));
    // In the gap just below the first system: its bottom edge, not the header or the next system.
    const gap = sheetToEngineNearest(sheet, first.x + 20, first.y + first.partial.height + 3);
    expect(gap).toEqual({ x: 20, y: first.partial.y + first.partial.height });
    // Far left of the page and far below the last page: clamped into the closest system.
    expect(sheetToEngineNearest(sheet, -500, second.y + 10)).toEqual({ x: 0, y: second.partial.y + 10 });
    expect(sheetToEngineNearest(sheet, last.x + 50, sheet.height + 400)).toEqual({
      x: 50,
      y: last.partial.y + last.partial.height,
    });
    expect(sheetToEngineNearest(paginate([], geometry), 0, 0)).toBeNull();
  });
});

describe('placeContinuous', () => {
  it('keeps engine coordinates and omits the credit line', () => {
    const parts = strip(3, 100);
    const sheet = placeContinuous(parts, 900);
    expect(sheet.pages).toHaveLength(0);
    expect(sheet.placements).toHaveLength(4);
    expect(sheet.placements[1]?.y).toBe(parts[1]?.y);
    expect(sheet.width).toBe(900);
  });
});

describe('page arrangements (REND-212…REND-214)', () => {
  const geometry = pageGeometry(pageSetup('letter'));
  const { paper, gap, outer } = geometry;
  // Ten systems of 300 px: three to a page, four pages.
  const parts = strip(10, 300);

  it('puts the pages one under the other by default', () => {
    const layout = paginate(parts, geometry);
    expect(layout.pages.map(page => [page.x, page.y])).toEqual(
      [0, 1, 2, 3].map(index => [outer, outer + index * (paper.height + gap)]),
    );
  });

  it('puts the pages side by side, the sheet as wide as all of them', () => {
    const layout = paginate(parts, geometry, 'horizontal');
    expect(layout.pages).toHaveLength(4);
    expect(layout.pages.map(page => [page.x, page.y])).toEqual(
      [0, 1, 2, 3].map(index => [outer + index * (paper.width + gap), outer]),
    );
    expect(layout.width).toBe(2 * outer + 4 * paper.width + 3 * gap);
    expect(layout.height).toBe(2 * outer + paper.height);
    // The music moves with its page.
    const third = layout.placements.find(placement => placement.page === 2);
    expect(third?.x).toBe(outer + 2 * (paper.width + gap) + geometry.margins.left);
  });

  it('puts as many pages to a row as the view fits', () => {
    expect(gridColumns(geometry, 2 * outer + 3 * paper.width + 2 * gap)).toBe(3);
    expect(gridColumns(geometry, 2 * outer + 3 * paper.width + 2 * gap - 1)).toBe(2);
    expect(gridColumns(geometry, 100)).toBe(1);
    const layout = paginate(parts, geometry, 'grid', 3);
    expect(layout.pages.map(page => [page.x, page.y])).toEqual([
      [outer, outer],
      [outer + paper.width + gap, outer],
      [outer + 2 * (paper.width + gap), outer],
      [outer, outer + paper.height + gap],
    ]);
    expect(layout.width).toBe(2 * outer + 3 * paper.width + 2 * gap);
    expect(layout.height).toBe(2 * outer + 2 * paper.height + gap);
  });

  it('lays the music on one endless sheet without page breaks', () => {
    const layout = paginate(parts, geometry, 'endless');
    expect(layout.pages).toHaveLength(1);
    const systems = layout.placements.filter(placement => placement.partial.kind === 'system');
    expect(systems).toHaveLength(10);
    // The engine's gaps are kept from the first partial to the last.
    const first = layout.placements[0];
    expect(first?.y).toBe(outer + geometry.margins.top);
    for (const placement of layout.placements) {
      expect(placement.y - (first?.y ?? 0)).toBe(placement.partial.y);
    }
    const sheet = layout.pages[0];
    const last = systems.at(-1);
    expect((sheet?.y ?? 0) + (sheet?.height ?? 0)).toBe(
      (last?.y ?? 0) + (last?.partial.height ?? 0) + geometry.margins.bottom,
    );
    // Engine and sheet coordinates still map both ways.
    const point = engineToSheet(layout, 10, 1000);
    expect(point === null ? null : sheetToEngine(layout, point.x, point.y)).toEqual({ x: 10, y: 1000 });
  });
});
