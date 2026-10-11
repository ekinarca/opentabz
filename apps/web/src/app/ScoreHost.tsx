import { useEffect, useRef } from 'react';
import { getEngine } from '../engine/instance.ts';
import { pageGeometry } from '../score-view/pagination.ts';
import { PlaybackCursor } from '../score-view/playback-cursor.ts';
import { ScoreView, type ScoreGesture } from '../score-view/score-view.ts';
import { SelectionOverlay } from '../score-view/selection-overlay.ts';
import { usePlayer } from '../state/player.ts';
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
    let cursor: PlaybackCursor | null = null;
    let selection: SelectionOverlay | null = null;
    const onGesture = (gesture: ScoreGesture) => {
      const player = usePlayer.getState();
      if (player.docKey !== key || cursor === null || selection === null) return;
      switch (gesture.type) {
        case 'tap': {
          if (gesture.extend) {
            selection.extendTo(gesture.x, gesture.y);
            return;
          }
          const tick = cursor.tickAt(gesture.x, gesture.y);
          if (tick !== null) player.seek(tick);
          return;
        }
        case 'press':
          if (selection.selectBarAt(gesture.x, gesture.y) && 'vibrate' in navigator) navigator.vibrate(10);
          return;
        case 'drag':
          if (gesture.phase === 'start') selection.beginDrag(gesture.x, gesture.y);
          else if (gesture.phase === 'move') selection.dragTo(gesture.x, gesture.y);
          else selection.endDrag(gesture.x, gesture.y);
          return;
      }
    };
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
        onLayout: () => {
          selection?.onLayout();
          cursor?.onLayout();
        },
        onGesture,
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
    cursor = new PlaybackCursor(view);
    const playbackCursor = cursor;
    const selectionOverlay = new SelectionOverlay(view, {
      onChange: (range, final) => {
        if (usePlayer.getState().docKey === key) usePlayer.getState().setSelection(range, final);
      },
      currentTick: () => usePlayer.getState().tick,
      onDragging: dragging => {
        playbackCursor.setFollow(!dragging);
      },
    });
    selection = selectionOverlay;
    const sync = (state: ReturnType<typeof usePlayer.getState>) => {
      const mine = state.docKey === key;
      selectionOverlay.setRange(mine ? state.selection : null);
      playbackCursor.update(mine ? state.tick : 0, state.tempo, mine && state.transport.status === 'playing');
    };
    let timeline = usePlayer.getState().docKey === key ? usePlayer.getState().timeline : null;
    playbackCursor.setTimeline(timeline);
    selectionOverlay.setTimeline(timeline);
    const unsubscribe = usePlayer.subscribe(state => {
      const next = state.docKey === key ? state.timeline : null;
      if (next !== timeline) {
        timeline = next;
        selectionOverlay.setTimeline(next);
        playbackCursor.setTimeline(next);
      }
      sync(state);
    });
    sync(usePlayer.getState());
    return () => {
      unsubscribe();
      selectionOverlay.dispose();
      playbackCursor.dispose();
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
