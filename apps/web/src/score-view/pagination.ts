/**
 * Physical pages (ADR-0005). alphaTab lays out an endless vertical strip; here its partials are
 * distributed onto sheets of paper. Pure functions, no DOM.
 *
 * Units are CSS pixels at 96 dpi and 100 % zoom ("layout units").
 */
import type { PartialLayout } from '@opentabz/core/shared';

export const PAPER_IDS = ['a4', 'letter'] as const;
export type PaperId = (typeof PAPER_IDS)[number];

const MM = 96 / 25.4;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export const PAPER_SIZES: Readonly<Record<PaperId, Size>> = {
  a4: { width: 210 * MM, height: 297 * MM },
  letter: { width: 8.5 * 96, height: 11 * 96 },
};

export interface Margins {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface PageGeometry {
  readonly paper: Size;
  readonly margins: Margins;
  /** Space between consecutive sheets on screen. */
  readonly gap: number;
  /** Space around the stack of sheets. */
  readonly outer: number;
}

export const DEFAULT_MARGINS: Margins = { top: 15 * MM, right: 12 * MM, bottom: 15 * MM, left: 12 * MM };

export function pageGeometry(paper: PaperId, margins: Margins = DEFAULT_MARGINS): PageGeometry {
  return { paper: PAPER_SIZES[paper], margins, gap: 32, outer: 32 };
}

/** Width available to the notation on a page. */
export function contentWidth(geometry: PageGeometry): number {
  return geometry.paper.width - geometry.margins.left - geometry.margins.right;
}

export interface PageBox {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Placement {
  readonly partial: PartialLayout;
  /** Position on the sheet (layout units). */
  readonly x: number;
  readonly y: number;
  /** Page index, or -1 for continuous layouts. */
  readonly page: number;
}

export interface SheetLayout {
  readonly width: number;
  readonly height: number;
  readonly pages: readonly PageBox[];
  readonly placements: readonly Placement[];
}

/** Partials shown to the user: alphaTab's trailing credit line is omitted (ADR-0014). */
function visible(partials: readonly PartialLayout[]): PartialLayout[] {
  return partials.filter(partial => partial.kind !== 'credit');
}

/**
 * Distributes partials onto pages in order. Vertical gaps between consecutive partials from the
 * engine's layout are preserved, except at the top of a page. A system never splits; one taller
 * than a page's content area starts a new page and overflows its bottom margin.
 */
export function paginate(partials: readonly PartialLayout[], geometry: PageGeometry): SheetLayout {
  const { paper, margins, gap, outer } = geometry;
  const contentTop = margins.top;
  const contentBottom = paper.height - margins.bottom;
  const pageX = outer;
  const pageY = (index: number): number => outer + index * (paper.height + gap);

  const placements: Placement[] = [];
  let page = 0;
  let cursor = contentTop;
  let pageHasContent = false;
  let previousBottom: number | null = null;

  for (const partial of visible(partials)) {
    const sourceGap = previousBottom === null ? 0 : Math.max(0, partial.y - previousBottom);
    let top = pageHasContent ? cursor + sourceGap : contentTop;
    if (pageHasContent && top + partial.height > contentBottom) {
      page += 1;
      top = contentTop;
      pageHasContent = false;
    }
    placements.push({ partial, page, x: pageX + margins.left + partial.x, y: pageY(page) + top });
    cursor = top + partial.height;
    pageHasContent = true;
    previousBottom = partial.y + partial.height;
  }

  const pageCount = Math.max(1, page + 1);
  const pages: PageBox[] = Array.from({ length: pageCount }, (_, index) => ({
    index,
    x: pageX,
    y: pageY(index),
    width: paper.width,
    height: paper.height,
  }));
  return {
    width: paper.width + 2 * outer,
    height: outer * 2 + pageCount * paper.height + (pageCount - 1) * gap,
    pages,
    placements,
  };
}

/** Space kept below the last partial in continuous layouts. */
const CONTINUOUS_TRAILING_SPACE = 48;

/** Continuous layouts (vertical scroll, horizontal): partials keep the engine's coordinates. */
export function placeContinuous(partials: readonly PartialLayout[], width: number): SheetLayout {
  const shown = visible(partials);
  const bottom = Math.max(0, ...shown.map(partial => partial.y + partial.height));
  const right = Math.max(width, ...shown.map(partial => partial.x + partial.width));
  return {
    width: right,
    height: bottom + CONTINUOUS_TRAILING_SPACE,
    pages: [],
    placements: shown.map(partial => ({ partial, page: -1, x: partial.x, y: partial.y })),
  };
}

/**
 * Maps a point in the engine's coordinate space (as used by bounds lookups) onto the sheet by
 * finding the partial that contains it. Returns `null` outside every partial.
 */
export function engineToSheet(layout: SheetLayout, x: number, y: number): { x: number; y: number } | null {
  for (const placement of layout.placements) {
    const { partial } = placement;
    if (y >= partial.y && y < partial.y + partial.height) {
      return { x: placement.x + (x - partial.x), y: placement.y + (y - partial.y) };
    }
  }
  return null;
}
