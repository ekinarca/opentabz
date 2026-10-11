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
 * How the pages sit on screen (REND-212…REND-214): one under the other, side by side, in rows of
 * as many as the view fits, or as one endless sheet without page breaks.
 */
export const PAGE_ARRANGEMENTS = ['vertical', 'horizontal', 'grid', 'endless'] as const;
export type PageArrangement = (typeof PAGE_ARRANGEMENTS)[number];

/** How many pages fit side by side in a view `width` wide (layout units); at least one. */
export function gridColumns(geometry: PageGeometry, width: number): number {
  const { paper, gap, outer } = geometry;
  return Math.max(1, Math.floor((width - 2 * outer + gap) / (paper.width + gap)));
}

/**
 * Distributes partials onto pages in order. Vertical gaps between consecutive partials from the
 * engine's layout are preserved, except at the top of a page. A system never splits; one taller
 * than a page's content area starts a new page and overflows its bottom margin. The pages are
 * then arranged: down, side by side, or `columns` to a row.
 */
export function paginate(
  partials: readonly PartialLayout[],
  geometry: PageGeometry,
  arrangement: PageArrangement = 'vertical',
  columns = 1,
): SheetLayout {
  if (arrangement === 'endless') return endlessSheet(partials, geometry);
  const { paper, margins, gap, outer } = geometry;
  const contentTop = margins.top;
  const contentBottom = paper.height - margins.bottom;

  const onPages: { partial: PartialLayout; page: number; top: number }[] = [];
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
    onPages.push({ partial, page, top });
    cursor = top + partial.height;
    pageHasContent = true;
    previousBottom = partial.y + partial.height;
  }

  const pageCount = Math.max(1, page + 1);
  const perRow = arrangement === 'horizontal' ? pageCount : arrangement === 'grid' ? Math.max(1, columns) : 1;
  const pageX = (index: number): number => outer + (index % perRow) * (paper.width + gap);
  const pageY = (index: number): number => outer + Math.floor(index / perRow) * (paper.height + gap);
  const placements: Placement[] = onPages.map(({ partial, page: index, top }) => ({
    partial,
    page: index,
    x: pageX(index) + margins.left + partial.x,
    y: pageY(index) + top,
  }));
  const pages: PageBox[] = Array.from({ length: pageCount }, (_, index) => ({
    index,
    x: pageX(index),
    y: pageY(index),
    width: paper.width,
    height: paper.height,
  }));
  const across = Math.min(perRow, pageCount);
  const down = Math.ceil(pageCount / perRow);
  return {
    width: outer * 2 + across * paper.width + (across - 1) * gap,
    height: outer * 2 + down * paper.height + (down - 1) * gap,
    pages,
    placements,
  };
}

/** One sheet of the paper's width, as long as the music, with its margins and no page breaks. */
function endlessSheet(partials: readonly PartialLayout[], geometry: PageGeometry): SheetLayout {
  const { paper, margins, outer } = geometry;
  const shown = visible(partials);
  const first = shown[0]?.y ?? 0;
  const bottom = Math.max(first, ...shown.map(partial => partial.y + partial.height));
  const height = Math.max(paper.height, margins.top + (bottom - first) + margins.bottom);
  return {
    width: paper.width + 2 * outer,
    height: height + 2 * outer,
    pages: [{ index: 0, x: outer, y: outer, width: paper.width, height }],
    placements: shown.map(partial => ({
      partial,
      page: 0,
      x: outer + margins.left + partial.x,
      y: outer + margins.top + (partial.y - first),
    })),
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

/** Inverse of `engineToSheet`: maps a point on the sheet back into engine coordinates. */
export function sheetToEngine(layout: SheetLayout, x: number, y: number): { x: number; y: number } | null {
  for (const placement of layout.placements) {
    const { partial } = placement;
    if (
      x >= placement.x &&
      x <= placement.x + partial.width &&
      y >= placement.y &&
      y <= placement.y + partial.height
    ) {
      return { x: partial.x + (x - placement.x), y: partial.y + (y - placement.y) };
    }
  }
  return null;
}

/**
 * Like `sheetToEngine`, but a point outside the music maps to the closest staff system, clamped
 * into it (for drags that leave the music or cross the gap between pages).
 */
export function sheetToEngineNearest(
  layout: SheetLayout,
  x: number,
  y: number,
): { x: number; y: number } | null {
  let best: Placement | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const placement of layout.placements) {
    const { partial } = placement;
    if (partial.kind !== 'system') continue;
    const dx = Math.max(placement.x - x, 0, x - (placement.x + partial.width));
    const dy = Math.max(placement.y - y, 0, y - (placement.y + partial.height));
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = placement;
    }
  }
  if (best === null) return null;
  const clampedX = Math.min(Math.max(x, best.x), best.x + best.partial.width);
  const clampedY = Math.min(Math.max(y, best.y), best.y + best.partial.height);
  return { x: best.partial.x + (clampedX - best.x), y: best.partial.y + (clampedY - best.y) };
}
