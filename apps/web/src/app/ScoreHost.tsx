import { useEffect, useRef, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { getEngine } from '../engine/instance.ts';
import { forgetPainted, markPainted } from '../score-view/first-paint.ts';
import { pageGeometry } from '../score-view/pagination.ts';
import { PlaybackCursor, type CursorOptions } from '../score-view/playback-cursor.ts';
import { ScoreView, type ScoreGesture } from '../score-view/score-view.ts';
import { SelectionOverlay } from '../score-view/selection-overlay.ts';
import { usePlayer } from '../state/player.ts';
import { clampZoom, MAX_ZOOM, MIN_ZOOM, useDocuments, type OpenDocument } from '../state/documents.ts';
import { usePreferences, type Preferences } from '../state/preferences.ts';
import { strings } from '../strings.ts';

function cursorOptions(preferences: Preferences): CursorOptions {
  return {
    scrollMode: preferences.scrollMode,
    scrollOffset: preferences.scrollOffset,
    cursorStyle: preferences.cursorStyle,
    barHighlight: preferences.barHighlight,
    noteHighlight: preferences.noteHighlight,
  };
}

/** Hosts the framework-free ScoreView for one document. */
export function ScoreHost({ doc, hidden }: { readonly doc: OpenDocument; readonly hidden: boolean }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ScoreView | null>(null);
  const cursorRef = useRef<PlaybackCursor | null>(null);
  /** The user scrolled away while playing: the view waits until they come back to the cursor. */
  const [followPaused, setFollowPaused] = useState(false);
  const cursorColor = usePreferences(state => state.cursorColor);
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
          // Double-tap selects the bar, triple-tap everything (as in Guitar Pro).
          if (gesture.count === 2) {
            selection.selectBarAt(gesture.x, gesture.y);
            return;
          }
          if (gesture.count === 3 && player.timeline !== null) {
            player.setSelection({ startTick: 0, endTick: player.timeline.endTick });
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
    // A zoom gesture's zoom, unrounded, so that slow pinches add up; forgotten once it ends.
    let gestureZoom: number | null = null;
    let gestureEnd: ReturnType<typeof setTimeout> | null = null;
    const onZoom = (factor: number, clientX: number, clientY: number) => {
      const doc = useDocuments.getState().docs.find(candidate => candidate.key === key);
      if (doc === undefined || !Number.isFinite(factor)) return;
      gestureZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (gestureZoom ?? doc.view.zoom) * factor));
      if (gestureEnd !== null) clearTimeout(gestureEnd);
      gestureEnd = setTimeout(() => {
        gestureZoom = null;
      }, 300);
      viewRef.current?.zoomAround(clientX, clientY);
      useDocuments.getState().updateView(key, { zoom: clampZoom(gestureZoom) });
    };
    const view = new ScoreView(
      scroller,
      getEngine(),
      key,
      { pageNumber: strings.score.pageNumber },
      {
        onZoom,
        onFirstPaint: () => {
          markPainted(key);
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
    cursor = new PlaybackCursor(view, setFollowPaused);
    cursorRef.current = cursor;
    const playbackCursor = cursor;
    playbackCursor.setMeters(
      useDocuments.getState().docs.find(candidate => candidate.key === key)?.summary.masterBars ?? [],
    );
    playbackCursor.setOptions(cursorOptions(usePreferences.getState()));
    const unsubscribePreferences = usePreferences.subscribe(state => {
      playbackCursor.setOptions(cursorOptions(state));
    });
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
      if (gestureEnd !== null) clearTimeout(gestureEnd);
      unsubscribe();
      unsubscribePreferences();
      selectionOverlay.dispose();
      playbackCursor.dispose();
      view.dispose();
      forgetPainted(key);
      viewRef.current = null;
      cursorRef.current = null;
    };
  }, [key]);

  // Fitting the page's width or a whole page follows the window (REND-216, REND-217).
  const fit = doc.view.layout === 'page' ? doc.view.fit : null;
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller === null || fit === null || hidden) return undefined;
    const geometry = pageGeometry(doc.view.paper);
    const apply = () => {
      if (scroller.clientWidth <= 0 || scroller.clientHeight <= 0) return;
      const width = scroller.clientWidth / (geometry.paper.width + 2 * geometry.outer);
      const height = scroller.clientHeight / (geometry.paper.height + 2 * geometry.outer);
      // Round down so the fitted page never overflows by a fraction of a pixel.
      const zoom = clampZoom(Math.floor((fit === 'page' ? Math.min(width, height) : width) * 100) / 100);
      const current = useDocuments.getState().docs.find(candidate => candidate.key === key);
      if (current !== undefined && current.view.zoom !== zoom) {
        useDocuments.getState().updateView(key, { zoom, fit });
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(scroller);
    return () => {
      observer.disconnect();
    };
  }, [key, fit, doc.view.paper, hidden]);

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
      arrangement: doc.view.arrangement,
      systemsLayout: doc.view.systemsLayout,
      staffDisplay: doc.view.staffDisplay,
      trackIndexes: doc.view.trackIndexes,
      zoom: doc.view.zoom,
      title,
    });
  }, [doc.engineId, doc.view, title]);

  return (
    <div hidden={hidden} className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        hidden={hidden}
        role="region"
        aria-label={strings.score.region(title)}
        tabIndex={0}
        className="ot-scroll min-h-0 flex-1"
        data-doc={key}
        data-cursor-color={cursorColor}
      />
      {followPaused && (
        <button
          type="button"
          onClick={() => {
            cursorRef.current?.resume();
          }}
          className="ot-pop-in absolute bottom-4 left-1/2 inline-flex h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 text-[13px] font-semibold text-canvas shadow-[var(--shadow-popover)] hover:scale-[1.02] active:scale-95"
        >
          <LocateFixed size={16} aria-hidden />
          {strings.score.backToCursor}
        </button>
      )}
    </div>
  );
}
