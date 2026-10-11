import type { PartialKind, PartialLayout } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import {
  contentWidth,
  engineToSheet,
  PAPER_SIZES,
  pageGeometry,
  paginate,
  placeContinuous,
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

describe('paper', () => {
  it('has A4 and Letter at 96 dpi', () => {
    expect(PAPER_SIZES.a4.width).toBeCloseTo(793.7, 1);
    expect(PAPER_SIZES.a4.height).toBeCloseTo(1122.5, 1);
    expect(PAPER_SIZES.letter).toEqual({ width: 816, height: 1056 });
  });

  it('subtracts margins from the content width', () => {
    const geometry = pageGeometry('letter', { top: 10, right: 20, bottom: 10, left: 30 });
    expect(contentWidth(geometry)).toBe(766);
  });
});

describe('paginate', () => {
  const geometry = pageGeometry('a4');
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
