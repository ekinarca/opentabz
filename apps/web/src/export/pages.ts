/**
 * A score on paper, for export and print: laid out as the paged view lays it out (the same
 * tracks, staves, systems and paper) in an engine view of its own, then painted a page at a time.
 */
import type { Sheet } from '@opentabz/core/print';
import { DEFAULT_PAGE_FURNITURE, type BarRange } from '@opentabz/core/shared';
import { getEngine } from '../engine/instance.ts';
import { contentWidth, pageGeometry, paginate, type Size } from '../score-view/pagination.ts';
import type { OpenDocument } from '../state/documents.ts';
import { noteColoring, readingAids } from '../state/note-coloring.ts';
import { usePreferences } from '../state/preferences.ts';
import { pagesTexts, scoreFields } from '../state/score-fields.ts';

export interface PagedScore {
  readonly pageCount: number;
  /** Paper size in layout units (CSS pixels at 96 dpi). */
  readonly paper: Size;
  /** Page `index` (from 0), its partials painted. */
  sheet(index: number): Promise<Sheet>;
  /** Releases the engine view. */
  close(): void;
}

let exportViews = 0;

/** The score's title, or its file's name: what PDFs are called and say they are. */
export function scoreTitle(doc: OpenDocument): string {
  return doc.summary.title.trim().length > 0 ? doc.summary.title : doc.source.name;
}

/** The score's pages, or those of only some bars (an export of the selection). */
export async function layoutPages(doc: OpenDocument, bars: BarRange | null = null): Promise<PagedScore> {
  const engine = getEngine();
  exportViews += 1;
  const viewId = `${doc.key}:pages:${exportViews}`;
  const geometry = pageGeometry(doc.view.page);
  const coloring = noteColoring(usePreferences.getState());
  const aids = readingAids(usePreferences.getState());
  const layout = await engine.call('layoutView', {
    viewId,
    docId: doc.engineId,
    options: {
      trackIndexes: doc.view.trackIndexes,
      layout: 'page',
      systemsLayout: doc.view.systemsLayout,
      staffDisplay: doc.view.staffDisplay,
      staves: doc.view.staves,
      concertPitch: doc.view.concertPitch,
      // Exports colour notes as the screen does.
      ...(coloring === undefined ? {} : { noteColors: coloring }),
      ...(aids === undefined ? {} : { readingAids: aids }),
      width: contentWidth(geometry),
      notationScale: 1,
      // The pages' header and footer are drawn on the sheets, not by the engine.
      style: { ...doc.view.style, pages: DEFAULT_PAGE_FURNITURE },
      ...(bars === null ? {} : { bars }),
    },
  });
  const sheets = paginate(layout.partials, geometry);
  const fields = scoreFields(doc);
  const pageCount = sheets.pages.length;
  let closed = false;

  return {
    pageCount,
    paper: geometry.paper,
    async sheet(index) {
      const page = sheets.pages[index];
      if (page === undefined) throw new RangeError(`There is no page ${index + 1}.`);
      const placements = sheets.placements.filter(placement => placement.page === index);
      const painted = await engine.call('paint', {
        viewId,
        generation: layout.generation,
        ids: placements.map(placement => placement.partial.id),
      });
      const svgs = new Map(painted.partials.map(partial => [partial.id, partial.svg]));
      return {
        width: page.width,
        height: page.height,
        partials: placements.map(placement => ({
          svg: svgs.get(placement.partial.id) ?? '',
          x: placement.x - page.x,
          y: placement.y - page.y,
        })),
        ...pagesTexts(doc.view.style, fields, index + 1, pageCount),
        margins: { left: geometry.margins.left, right: geometry.margins.right },
      };
    },
    close() {
      if (closed) return;
      closed = true;
      void engine.call('closeView', { viewId }).catch(() => undefined);
    },
  };
}
