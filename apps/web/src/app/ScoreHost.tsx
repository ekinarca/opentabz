import { useEffect, useRef } from 'react';
import { getEngine } from '../engine/instance.ts';
import { pageGeometry } from '../score-view/pagination.ts';
import { ScoreView } from '../score-view/score-view.ts';
import { clampZoom, useDocuments, type OpenDocument } from '../state/documents.ts';
import { strings } from '../strings.ts';

/** Hosts the framework-free ScoreView for one document. */
export function ScoreHost({ doc, hidden }: { readonly doc: OpenDocument; readonly hidden: boolean }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ScoreView | null>(null);
  const intakeMark = useRef(doc.intakeMark);
  const title = doc.summary.title.trim().length > 0 ? doc.summary.title : doc.source.name;
  const key = doc.key;

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller === null) return undefined;
    let measured = false;
    const view = new ScoreView(
      scroller,
      getEngine(),
      key,
      { pageNumber: strings.score.pageNumber },
      {
        onFirstPaint: () => {
          if (measured) return;
          measured = true;
          try {
            performance.measure('ot:drop-to-paint', intakeMark.current);
          } catch {
            // The intake mark is gone (performance buffer cleared); nothing to measure.
          }
        },
        onError: error => {
          useDocuments.getState().notify({
            title: strings.score.renderFailed,
            description: error instanceof Error ? error.message : String(error),
            tone: 'error',
          });
        },
      },
    );
    viewRef.current = view;
    return () => {
      view.dispose();
      viewRef.current = null;
    };
  }, [key]);

  // Fit the page to narrow windows once, when the document first appears.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller === null || !doc.view.autoFit || hidden) return;
    let zoom = doc.view.zoom;
    if (doc.view.layout === 'page') {
      const geometry = pageGeometry(doc.view.paper);
      const needed = geometry.paper.width + 2 * geometry.outer;
      // Round down so the fitted page never overflows by a fraction of a pixel.
      if (scroller.clientWidth > 0 && scroller.clientWidth < needed)
        zoom = clampZoom(Math.floor((scroller.clientWidth / needed) * 100) / 100);
    }
    useDocuments.getState().updateView(key, { zoom, autoFit: false });
  }, [key, doc.view.autoFit, doc.view.layout, doc.view.paper, doc.view.zoom, hidden]);

  useEffect(() => {
    if (doc.view.autoFit) return;
    viewRef.current?.update({
      docId: doc.engineId,
      layout: doc.view.layout,
      paper: doc.view.paper,
      systemsLayout: doc.view.systemsLayout,
      staffDisplay: doc.view.staffDisplay,
      trackIndexes: doc.view.trackIndexes,
      zoom: doc.view.zoom,
      title,
    });
  }, [doc.engineId, doc.view, title]);

  return (
    <div
      ref={scrollerRef}
      hidden={hidden}
      role="region"
      aria-label={strings.score.region(title)}
      tabIndex={0}
      className="ot-scroll min-h-0 flex-1"
      data-doc={key}
    />
  );
}
