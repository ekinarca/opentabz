/**
 * ScoreView: places engine-rendered SVG partials on the main thread (ARCHITECTURE.md §5).
 *
 * Framework-free on purpose: layout, scrolling and painting never go through React. Geometry is
 * computed from data and written to the DOM; nothing is read back from layout in hot paths.
 */
import {
  sameScoreStyle,
  type LayoutKind,
  type ScoreBounds,
  type ScoreStyle,
  type StaffDisplay,
  type SystemsLayout,
  type ViewLayout,
  type ViewOptions,
} from '@opentabz/core/shared';
import type { EngineClient } from '../engine/client.ts';
import { EdgeScroller } from './edge-scroll.ts';
import { SvgCache } from './svg-cache.ts';
import {
  contentWidth,
  gridColumns,
  pageGeometry,
  paginate,
  placeContinuous,
  sheetToEngine,
  sheetToEngineNearest,
  samePageSetup,
  type PageArrangement,
  type PageSetup,
  type SheetLayout,
} from './pagination.ts';

export interface ScoreViewState {
  readonly docId: string;
  readonly layout: LayoutKind;
  /** The paper, its orientation and margins, in the page layout. */
  readonly page: PageSetup;
  /** How the pages sit on screen, in the page layout. */
  readonly arrangement: PageArrangement;
  /** How the score is engraved (the stylesheet). */
  readonly style: ScoreStyle;
  readonly systemsLayout: SystemsLayout;
  readonly staffDisplay: StaffDisplay;
  readonly trackIndexes: readonly number[];
  readonly zoom: number;
  /** Shown in the running header of pages after the first. */
  readonly title: string;
}

export interface ScoreViewLayoutInfo {
  readonly generation: number;
  readonly pages: number;
  readonly systems: number;
  readonly layoutMs: number;
}

/** What a pointer did on the music, in engine coordinates (see ScoreBounds). */
export type ScoreGesture =
  /**
   * A click or tap; `extend` when Shift was held; `count` is 2 or 3 for double and triple taps in
   * the same place. Points outside the music are not reported.
   */
  | {
      readonly type: 'tap';
      readonly x: number;
      readonly y: number;
      readonly extend: boolean;
      readonly count: number;
    }
  /** A long press with a finger or pen (touch screens have no other way to start a selection). */
  | { readonly type: 'press'; readonly x: number; readonly y: number }
  /**
   * A mouse drag. `move` repeats with the latest point, also while the view auto-scrolls near its
   * edges; points beyond the music snap to the nearest staff system.
   */
  | {
      readonly type: 'drag';
      readonly phase: 'start' | 'move' | 'end';
      readonly x: number;
      readonly y: number;
    };

export interface ScoreViewEvents {
  readonly onLayout?: (info: ScoreViewLayoutInfo) => void;
  readonly onGesture?: (gesture: ScoreGesture) => void;
  readonly onFirstPaint?: () => void;
  readonly onError?: (error: unknown) => void;
  /**
   * A zoom gesture (⌘/Ctrl with the wheel, a trackpad pinch, two fingers on a touch screen): zoom
   * by `factor` around a point of the viewport.
   */
  readonly onZoom?: (factor: number, clientX: number, clientY: number) => void;
}

/** Labels for page furniture; injected so all strings live in strings.ts. */
export interface ScoreViewLabels {
  readonly pageNumber: (page: number, pages: number) => string;
}

/** Re-layout delay after the reflow width settles (resize, zoom in vertical layout). */
const RELAYOUT_DELAY_MS = 120;
/** Partials are painted this far ahead of the viewport. */
const PREFETCH_MARGIN = '100% 50%';
/** Movement (CSS px) after which a mouse press becomes a drag, or a touch becomes a scroll. */
const MOUSE_SLOP = 6;
const TOUCH_SLOP = 10;
/** Hold time that makes a touch a long press. */
const LONG_PRESS_MS = 450;
/** Taps closer than this in time and space count as a double or triple tap. */
const MULTI_TAP_MS = 450;
const MULTI_TAP_SLOP = 12;
/** How fast ⌘/Ctrl with the wheel zooms: e^(−rate·pixels), about 20 % a notch of a mouse wheel. */
const WHEEL_ZOOM_RATE = 0.002;

interface PointerGesture {
  readonly pointerId: number;
  readonly touch: boolean;
  readonly startX: number;
  readonly startY: number;
  clientX: number;
  clientY: number;
  shift: boolean;
  state: 'pending' | 'dragging' | 'pressed';
  timer: ReturnType<typeof setTimeout> | null;
}

interface Anchor {
  /** Bar at the top of the viewport and how far into its system the viewport starts (0–1). */
  readonly bar: number;
  readonly fraction: number;
}

export class ScoreView {
  private readonly scroller: HTMLElement;
  private readonly sheet: HTMLDivElement;
  private readonly pagesLayer: HTMLDivElement;
  private readonly partialsLayer: HTMLDivElement;
  /** Layer above the music for the playback cursor and other overlays. */
  public readonly overlay: HTMLDivElement;
  private readonly engine: EngineClient;
  private readonly viewId: string;
  private readonly events: ScoreViewEvents;
  private readonly labels: ScoreViewLabels;

  private state: ScoreViewState | null = null;
  private requestedOptions: ViewOptions | null = null;
  private layoutSeq = 0;
  private generation = 0;
  private sheetLayout: SheetLayout | null = null;
  /** The engine's last layout, arranged again without asking it when only the pages move. */
  private viewLayout: ViewLayout | null = null;
  /** Pages to a row of the page grid as last arranged. */
  private columns = 1;
  private scoreBounds: ScoreBounds | null = null;
  private gesture: PointerGesture | null = null;
  private dragFrame = 0;
  private suppressContextMenuUntil = 0;
  private lastTap: { time: number; x: number; y: number; count: number } | null = null;
  /** Fingers on the score, for a two-finger pinch, and how far apart they were last. */
  private readonly touches = new Map<number, { x: number; y: number }>();
  private pinchDistance: number | null = null;
  /** The scale of Safari's trackpad pinch so far, while one goes on. */
  private safariScale: number | null = null;
  /** The point (client coordinates) the next zoom keeps still; the viewport's middle otherwise. */
  private zoomAnchor: { x: number; y: number } | null = null;
  private readonly edgeScroller: EdgeScroller;
  private externalScroll: (() => void) | null = null;
  private readonly elements = new Map<string, HTMLDivElement>();
  private readonly svgCache = new SvgCache();
  private readonly requested = new Set<string>();
  private readonly nearViewport = new Set<string>();
  private readonly queue = new Set<string>();
  private flushScheduled = false;
  private firstPaintPending = true;
  private relayoutTimer: ReturnType<typeof setTimeout> | null = null;
  private hostWidth = 0;
  private readonly intersection: IntersectionObserver;
  private readonly resize: ResizeObserver;
  private disposed = false;

  public constructor(
    scroller: HTMLElement,
    engine: EngineClient,
    viewId: string,
    labels: ScoreViewLabels,
    events: ScoreViewEvents = {},
  ) {
    this.scroller = scroller;
    this.engine = engine;
    this.viewId = viewId;
    this.labels = labels;
    this.events = events;

    this.sheet = document.createElement('div');
    this.sheet.className = 'ot-sheet';
    this.pagesLayer = document.createElement('div');
    this.pagesLayer.className = 'ot-pages';
    this.partialsLayer = document.createElement('div');
    this.partialsLayer.className = 'ot-partials';
    this.overlay = document.createElement('div');
    this.overlay.className = 'ot-overlay';
    this.sheet.append(this.pagesLayer, this.partialsLayer, this.overlay);
    this.scroller.append(this.sheet);
    this.scroller.addEventListener('pointerdown', this.onPointerDown);
    this.scroller.addEventListener('pointermove', this.onPointerMove);
    this.scroller.addEventListener('pointerup', this.onPointerUp);
    this.scroller.addEventListener('pointercancel', this.onPointerCancel);
    this.scroller.addEventListener('contextmenu', this.onContextMenu);
    this.scroller.addEventListener('wheel', this.onWheel, { passive: false });
    for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
      this.scroller.addEventListener(type, this.onSafariGesture);
    }
    this.edgeScroller = new EdgeScroller(this.scroller, () => {
      this.emitDragMove();
    });

    this.intersection = new IntersectionObserver(
      entries => {
        this.onIntersection(entries);
      },
      {
        root: this.scroller,
        rootMargin: PREFETCH_MARGIN,
      },
    );
    this.resize = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (Math.abs(width - this.hostWidth) < 1) return;
      this.hostWidth = width;
      if (this.state !== null && this.pageColumns(this.state) !== this.columns) this.rearrange();
      this.scheduleRelayout();
    });
    this.hostWidth = this.scroller.clientWidth;
    this.resize.observe(this.scroller);
  }

  /** Applies a new view state; re-lays out only when the engine's output would change. */
  public update(state: ScoreViewState): void {
    if (this.disposed) return;
    const previous = this.state;
    this.state = state;
    if (previous !== null && previous.docId !== state.docId) this.reset();

    if (previous?.zoom !== state.zoom) this.applyZoom(previous?.zoom ?? state.zoom, state.zoom);
    this.zoomAnchor = null;
    // Pages moved (another arrangement, or the grid fits more or fewer to a row): no new layout.
    if (
      previous !== null &&
      state.layout === 'page' &&
      previous.layout === 'page' &&
      (previous.arrangement !== state.arrangement ||
        !samePageSetup(previous.page, state.page) ||
        this.pageColumns(state) !== this.columns)
    ) {
      this.rearrange();
    }
    if (previous !== null && previous.title !== state.title && this.sheetLayout !== null)
      this.renderPages(this.sheetLayout);

    const options = this.engineOptions(state);
    if (options === null) return;
    if (this.requestedOptions === null || !sameOptions(this.requestedOptions, options)) {
      // Zooming a reflowing layout waits for the gesture to settle; everything else is immediate.
      const onlyZoomReflow =
        previous !== null && previous.zoom !== state.zoom && sameExceptZoom(previous, state);
      if (onlyZoomReflow) this.scheduleRelayout();
      else void this.requestLayout(options);
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.relayoutTimer !== null) clearTimeout(this.relayoutTimer);
    this.intersection.disconnect();
    this.resize.disconnect();
    this.endGesture();
    this.scroller.removeEventListener('pointerdown', this.onPointerDown);
    this.scroller.removeEventListener('pointermove', this.onPointerMove);
    this.scroller.removeEventListener('pointerup', this.onPointerUp);
    this.scroller.removeEventListener('pointercancel', this.onPointerCancel);
    this.scroller.removeEventListener('contextmenu', this.onContextMenu);
    this.scroller.removeEventListener('wheel', this.onWheel);
    for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
      this.scroller.removeEventListener(type, this.onSafariGesture);
    }
    this.sheet.remove();
    void this.engine.call('closeView', { viewId: this.viewId }).catch(() => undefined);
  }

  /** Current sheet geometry (layout units, before zoom). */
  public get layout(): SheetLayout | null {
    return this.sheetLayout;
  }

  /** Bounds of the music in the current layout. */
  public get bounds(): ScoreBounds | null {
    return this.scoreBounds;
  }

  public get zoom(): number {
    return this.state?.zoom ?? 1;
  }

  public get layoutKind(): LayoutKind {
    return this.state?.layout ?? 'page';
  }

  public get trackIndexes(): readonly number[] {
    return this.state?.trackIndexes ?? [];
  }

  public get scrollContainer(): HTMLElement {
    return this.scroller;
  }

  /**
   * Engine coordinates of a point in the viewport, or null outside the music. With `nearest`,
   * points outside snap to the closest staff system.
   */
  public clientToEngine(clientX: number, clientY: number, nearest = false): { x: number; y: number } | null {
    const layout = this.sheetLayout;
    if (layout === null || this.state === null) return null;
    const rect = this.sheet.getBoundingClientRect();
    const zoom = this.state.zoom;
    const x = (clientX - rect.left) / zoom;
    const y = (clientY - rect.top) / zoom;
    return nearest ? sheetToEngineNearest(layout, x, y) : sheetToEngine(layout, x, y);
  }

  /** Keeps a point of the viewport (client coordinates) still through the next zoom. */
  public zoomAround(clientX: number, clientY: number): void {
    this.zoomAnchor = { x: clientX, y: clientY };
  }

  /**
   * Scrolls while a drag elsewhere (a selection handle) holds the pointer near an edge; `onScroll`
   * runs after each step. Pass null when the drag ends.
   */
  public autoScroll(clientX: number, clientY: number, onScroll: (() => void) | null): void {
    this.externalScroll = onScroll;
    if (onScroll === null) this.edgeScroller.stop();
    else this.edgeScroller.update(clientX, clientY);
  }

  private readonly onWheel = (event: WheelEvent): void => {
    // Browsers send a trackpad pinch as the wheel with Ctrl; Safari sends its own gesture too.
    if ((!event.ctrlKey && !event.metaKey) || this.safariScale !== null) return;
    event.preventDefault();
    const unit =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? 400
          : 1;
    this.events.onZoom?.(Math.exp(-event.deltaY * unit * WHEEL_ZOOM_RATE), event.clientX, event.clientY);
  };

  /** Safari's pinch (`gesturestart`, `gesturechange`, `gestureend`, not in the DOM typings). */
  private readonly onSafariGesture = (event: Event): void => {
    if (!('scale' in event) || typeof event.scale !== 'number') return;
    // The page itself never zooms over the score.
    event.preventDefault();
    // On a touch screen the fingers are followed instead.
    if (this.touches.size > 0) return;
    if (event.type === 'gestureend') {
      this.safariScale = null;
      return;
    }
    const previous = this.safariScale ?? 1;
    this.safariScale = event.scale;
    if (event.type === 'gesturestart' || previous <= 0) return;
    const box = this.scroller.getBoundingClientRect();
    const x =
      'clientX' in event && typeof event.clientX === 'number' ? event.clientX : box.left + box.width / 2;
    const y =
      'clientY' in event && typeof event.clientY === 'number' ? event.clientY : box.top + box.height / 2;
    this.events.onZoom?.(event.scale / previous, x, y);
  };

  /** How far apart the first two fingers on the score are, and the point between them. */
  private pinch(): { distance: number; x: number; y: number } | null {
    const [a, b] = [...this.touches.values()];
    if (a === undefined || b === undefined) return null;
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') {
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touches.size === 2) {
        // A second finger: the score is pinched, not tapped or scrolled.
        this.endGesture();
        this.pinchDistance = this.pinch()?.distance ?? null;
        return;
      }
    }
    if (!event.isPrimary || event.button !== 0) return;
    // Scrollbars and the margin around the pages are not music.
    if (!(event.target instanceof Node) || !this.sheet.contains(event.target)) return;
    this.endGesture();
    const touch = event.pointerType !== 'mouse';
    const gesture: PointerGesture = {
      pointerId: event.pointerId,
      touch,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      shift: event.shiftKey,
      state: 'pending',
      timer: null,
    };
    if (touch) {
      gesture.timer = setTimeout(() => {
        gesture.timer = null;
        if (this.gesture !== gesture || gesture.state !== 'pending') return;
        gesture.state = 'pressed';
        this.suppressContextMenuUntil = performance.now() + 1500;
        const point = this.clientToEngine(gesture.startX, gesture.startY, true);
        if (point !== null) this.events.onGesture?.({ type: 'press', x: point.x, y: point.y });
      }, LONG_PRESS_MS);
    }
    this.gesture = gesture;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const touch = this.touches.get(event.pointerId);
    if (touch !== undefined) {
      touch.x = event.clientX;
      touch.y = event.clientY;
      const pinch = this.pinchDistance === null ? null : this.pinch();
      if (pinch !== null && this.pinchDistance !== null) {
        if (this.pinchDistance > 0 && pinch.distance > 0) {
          this.events.onZoom?.(pinch.distance / this.pinchDistance, pinch.x, pinch.y);
        }
        this.pinchDistance = pinch.distance;
        return;
      }
    }
    const gesture = this.gesture;
    if (gesture?.pointerId !== event.pointerId) return;
    gesture.clientX = event.clientX;
    gesture.clientY = event.clientY;
    const moved = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
    if (gesture.state === 'pending') {
      if (moved <= (gesture.touch ? TOUCH_SLOP : MOUSE_SLOP)) return;
      if (gesture.touch) {
        // The finger is scrolling the score.
        this.endGesture();
        return;
      }
      gesture.state = 'dragging';
      this.scroller.setPointerCapture(event.pointerId);
      const start = this.clientToEngine(gesture.startX, gesture.startY, true);
      if (start !== null) this.events.onGesture?.({ type: 'drag', phase: 'start', x: start.x, y: start.y });
    }
    if (gesture.state !== 'dragging') return;
    this.edgeScroller.update(event.clientX, event.clientY);
    if (this.dragFrame === 0) {
      this.dragFrame = requestAnimationFrame(() => {
        this.dragFrame = 0;
        this.emitDragMove();
      });
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.releaseTouch(event.pointerId);
    const gesture = this.gesture;
    if (gesture?.pointerId !== event.pointerId) return;
    gesture.clientX = event.clientX;
    gesture.clientY = event.clientY;
    if (gesture.state === 'pending') {
      const point = this.clientToEngine(event.clientX, event.clientY);
      this.endGesture();
      if (point !== null) {
        this.events.onGesture?.({
          type: 'tap',
          x: point.x,
          y: point.y,
          extend: gesture.shift || event.shiftKey,
          count: this.countTap(event.clientX, event.clientY),
        });
      }
      return;
    }
    this.endGesture();
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    this.releaseTouch(event.pointerId);
    if (this.gesture?.pointerId === event.pointerId) this.endGesture();
  };

  private releaseTouch(pointerId: number): void {
    this.touches.delete(pointerId);
    if (this.touches.size < 2) this.pinchDistance = null;
  }

  private countTap(clientX: number, clientY: number): number {
    const now = performance.now();
    const last = this.lastTap;
    const count =
      last !== null &&
      now - last.time < MULTI_TAP_MS &&
      Math.hypot(clientX - last.x, clientY - last.y) < MULTI_TAP_SLOP
        ? Math.min(3, last.count + 1)
        : 1;
    this.lastTap = { time: now, x: clientX, y: clientY, count };
    return count;
  }

  /** A long press on a touch screen must not also open the browser's context menu. */
  private readonly onContextMenu = (event: Event): void => {
    if (this.gesture?.state === 'pressed' || performance.now() < this.suppressContextMenuUntil) {
      event.preventDefault();
    }
  };

  private emitDragMove(): void {
    const gesture = this.gesture;
    if (gesture?.state !== 'dragging') {
      this.externalScroll?.();
      return;
    }
    const point = this.clientToEngine(gesture.clientX, gesture.clientY, true);
    if (point !== null) this.events.onGesture?.({ type: 'drag', phase: 'move', x: point.x, y: point.y });
  }

  /** Finishes the current pointer gesture (a drag reports its last point). */
  private endGesture(): void {
    const gesture = this.gesture;
    if (gesture === null) return;
    this.gesture = null;
    if (gesture.timer !== null) clearTimeout(gesture.timer);
    if (this.dragFrame !== 0) cancelAnimationFrame(this.dragFrame);
    this.dragFrame = 0;
    if (gesture.state !== 'dragging') return;
    this.edgeScroller.stop();
    if (this.scroller.hasPointerCapture(gesture.pointerId))
      this.scroller.releasePointerCapture(gesture.pointerId);
    const point = this.clientToEngine(gesture.clientX, gesture.clientY, true);
    if (point !== null && !this.disposed) {
      this.events.onGesture?.({ type: 'drag', phase: 'end', x: point.x, y: point.y });
    }
  }

  private engineOptions(state: ScoreViewState): ViewOptions | null {
    let width: number;
    switch (state.layout) {
      case 'page':
        width = contentWidth(pageGeometry(state.page));
        break;
      case 'scroll':
        if (this.hostWidth <= 0) return null;
        width = Math.max(240, Math.floor(this.hostWidth / state.zoom));
        break;
      case 'horizontal':
        width = Math.max(240, Math.floor(this.hostWidth > 0 ? this.hostWidth / state.zoom : 1024));
        break;
    }
    return {
      trackIndexes: state.trackIndexes,
      layout: state.layout,
      systemsLayout: state.systemsLayout,
      staffDisplay: state.staffDisplay,
      width,
      notationScale: 1,
      style: state.style,
    };
  }

  private scheduleRelayout(): void {
    if (this.relayoutTimer !== null) clearTimeout(this.relayoutTimer);
    this.relayoutTimer = setTimeout(() => {
      this.relayoutTimer = null;
      if (this.state === null || this.disposed) return;
      const options = this.engineOptions(this.state);
      if (
        options !== null &&
        (this.requestedOptions === null || !sameOptions(this.requestedOptions, options))
      ) {
        void this.requestLayout(options);
      }
    }, RELAYOUT_DELAY_MS);
  }

  private async requestLayout(options: ViewOptions): Promise<void> {
    const state = this.state;
    if (state === null) return;
    const seq = ++this.layoutSeq;
    this.requestedOptions = options;
    const anchor = this.captureAnchor();
    const started = performance.now();
    try {
      const layout = await this.engine.call('layoutView', {
        viewId: this.viewId,
        docId: state.docId,
        options,
      });
      if (seq !== this.layoutSeq || this.disposed) return;
      this.apply(layout, anchor);
      // Request to placed partials, for the "local operations under 100 ms" budget.
      performance.clearMeasures('ot:layout');
      performance.measure('ot:layout', { start: started, end: performance.now() });
    } catch (error) {
      if (seq !== this.layoutSeq || this.disposed) return;
      this.requestedOptions = null;
      this.events.onError?.(error);
    }
  }

  private apply(layout: ViewLayout, anchor: Anchor | null): void {
    const state = this.state;
    if (state === null) return;
    this.generation = layout.generation;
    this.scoreBounds = layout.bounds;
    this.viewLayout = layout;
    this.clearPartials();

    this.columns = this.pageColumns(state);
    const sheetLayout =
      state.layout === 'page'
        ? paginate(layout.partials, pageGeometry(state.page), state.arrangement, this.columns)
        : placeContinuous(layout.partials, layout.width);
    this.sheetLayout = sheetLayout;

    this.sheet.dataset['layout'] = state.layout;
    this.sheet.dataset['arrangement'] = state.layout === 'page' ? state.arrangement : '';
    this.sheet.style.width = `${sheetLayout.width}px`;
    this.sheet.style.height = `${sheetLayout.height}px`;
    this.renderPages(sheetLayout);

    const fragment = document.createDocumentFragment();
    for (const placement of sheetLayout.placements) {
      const { partial } = placement;
      const element = document.createElement('div');
      element.className = 'ot-partial';
      element.dataset['id'] = partial.id;
      element.dataset['kind'] = partial.kind;
      if (partial.firstBar >= 0) {
        element.dataset['firstBar'] = String(partial.firstBar);
        element.dataset['lastBar'] = String(partial.lastBar);
      }
      element.style.left = `${placement.x}px`;
      element.style.top = `${placement.y}px`;
      element.style.width = `${partial.width}px`;
      element.style.height = `${partial.height}px`;
      fragment.append(element);
      this.elements.set(partial.id, element);
    }
    this.partialsLayer.append(fragment);
    for (const element of this.elements.values()) this.intersection.observe(element);

    this.restoreAnchor(anchor);
    this.events.onLayout?.({
      generation: layout.generation,
      pages: sheetLayout.pages.length,
      systems: layout.partials.filter(partial => partial.kind === 'system').length,
      layoutMs: layout.layoutMs,
    });
  }

  private renderPages(sheetLayout: SheetLayout): void {
    const state = this.state;
    this.pagesLayer.replaceChildren();
    const total = sheetLayout.pages.length;
    for (const page of sheetLayout.pages) {
      const element = document.createElement('div');
      element.className = 'ot-page';
      element.style.left = `${page.x}px`;
      element.style.top = `${page.y}px`;
      element.style.width = `${page.width}px`;
      element.style.height = `${page.height}px`;
      this.pagesLayer.append(element);
      // An endless sheet has no pages to number.
      if (state?.arrangement === 'endless') continue;
      if (page.index > 0 && state !== null && state.title.length > 0) {
        const header = document.createElement('div');
        header.className = 'ot-page-header';
        header.textContent = state.title;
        element.append(header);
      }
      const footer = document.createElement('div');
      footer.className = 'ot-page-footer';
      footer.textContent = this.labels.pageNumber(page.index + 1, total);
      element.append(footer);
    }
  }

  /** Pages to a row: as many as the view fits in the page grid, else one. */
  private pageColumns(state: ScoreViewState): number {
    if (state.layout !== 'page' || state.arrangement !== 'grid') return 1;
    return gridColumns(pageGeometry(state.page), this.scroller.clientWidth / state.zoom);
  }

  /** Arranges the last layout's pages again, keeping the reader's place. */
  private rearrange(): void {
    if (this.viewLayout !== null) this.apply(this.viewLayout, this.captureAnchor());
  }

  private onIntersection(entries: IntersectionObserverEntry[]): void {
    for (const entry of entries) {
      const element = entry.target as HTMLDivElement;
      const id = element.dataset['id'];
      if (id === undefined) continue;
      if (entry.isIntersecting) {
        this.nearViewport.add(id);
        const svg = this.svgCache.get(id);
        if (svg !== undefined) this.attach(element, svg);
        else if (!this.requested.has(id)) this.queue.add(id);
      } else {
        this.nearViewport.delete(id);
        // Far away: release the DOM, keep the markup for an instant return.
        if (element.firstChild !== null) element.replaceChildren();
      }
    }
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushScheduled || this.queue.size === 0) return;
    this.flushScheduled = true;
    queueMicrotask(() => {
      this.flushScheduled = false;
      void this.flush();
    });
  }

  private async flush(): Promise<void> {
    if (this.queue.size === 0 || this.disposed) return;
    const ids = [...this.queue];
    this.queue.clear();
    for (const id of ids) this.requested.add(id);
    const generation = this.generation;
    try {
      const result = await this.engine.call('paint', { viewId: this.viewId, generation, ids });
      if (result.generation !== this.generation || this.isDisposed()) return;
      for (const painted of result.partials) {
        // Markup evicted from the cache is painted again by the worker when it comes back.
        for (const evicted of this.svgCache.set(painted.id, painted.svg, id => this.nearViewport.has(id))) {
          this.requested.delete(evicted);
        }
        const element = this.elements.get(painted.id);
        if (element !== undefined && this.nearViewport.has(painted.id)) this.attach(element, painted.svg);
      }
    } catch (error) {
      for (const id of ids) this.requested.delete(id);
      if (!this.isDisposed()) this.events.onError?.(error);
    }
  }

  /** Read through a method: the flag can change while an engine call is awaited. */
  private isDisposed(): boolean {
    return this.disposed;
  }

  private attach(element: HTMLDivElement, svg: string): void {
    if (element.firstChild !== null) return;
    // alphaTab escapes all text from files; CSP additionally forbids inline handlers.
    element.innerHTML = svg;
    if (this.firstPaintPending) {
      this.firstPaintPending = false;
      requestAnimationFrame(() => this.events.onFirstPaint?.());
    }
  }

  private applyZoom(previous: number, zoom: number): void {
    // The point under the pointer of a zoom gesture stays put; otherwise the viewport's middle.
    const anchor = this.zoomAnchor;
    const box = anchor === null ? null : this.scroller.getBoundingClientRect();
    const x = anchor === null || box === null ? this.scroller.clientWidth / 2 : anchor.x - box.left;
    const y = anchor === null || box === null ? this.scroller.clientHeight / 2 : anchor.y - box.top;
    const left = (this.scroller.scrollLeft + x) / previous;
    const top = (this.scroller.scrollTop + y) / previous;
    this.sheet.style.setProperty('zoom', String(zoom));
    // Overlays that must keep a constant on-screen size (touch targets) divide by this.
    this.sheet.style.setProperty('--ot-zoom', String(zoom));
    this.scroller.scrollTop = top * zoom - y;
    this.scroller.scrollLeft = left * zoom - x;
  }

  /** The bar at the top of the viewport, so a re-layout can keep the reader's place. */
  private captureAnchor(): Anchor | null {
    const layout = this.sheetLayout;
    if (layout === null || this.state === null) return null;
    const zoom = this.state.zoom;
    const top = this.scroller.scrollTop / zoom;
    const left = this.scroller.scrollLeft / zoom;
    const right = left + this.scroller.clientWidth / zoom;
    const bottom = top + this.scroller.clientHeight / zoom;
    const music = layout.placements.filter(placement => placement.partial.firstBar >= 0);
    // The first system in view (pages may sit side by side), else the first below the top.
    const anchor =
      music.find(
        ({ x, y, partial }) =>
          x + partial.width > left && x < right && y + partial.height > top && y < bottom,
      ) ?? music.find(({ y, partial }) => y + partial.height > top);
    if (anchor === undefined) return null;
    const fraction = Math.min(1, Math.max(0, (top - anchor.y) / anchor.partial.height));
    return { bar: anchor.partial.firstBar, fraction };
  }

  private restoreAnchor(anchor: Anchor | null): void {
    const layout = this.sheetLayout;
    if (anchor === null || layout === null || this.state === null) return;
    const placement = layout.placements.find(
      candidate =>
        candidate.partial.firstBar >= 0 &&
        candidate.partial.lastBar >= anchor.bar &&
        candidate.partial.firstBar <= anchor.bar,
    );
    if (placement === undefined) return;
    const zoom = this.state.zoom;
    this.scroller.scrollTop = (placement.y + anchor.fraction * placement.partial.height) * zoom;
    // Pages side by side or in a grid: also to the page, if it is out of view.
    const page = layout.pages[placement.page];
    if (
      page !== undefined &&
      (this.state.arrangement === 'horizontal' || this.state.arrangement === 'grid')
    ) {
      const left = this.scroller.scrollLeft;
      if (page.x * zoom < left || (page.x + page.width) * zoom > left + this.scroller.clientWidth) {
        this.scroller.scrollLeft = Math.max(0, (page.x - 16) * zoom);
      }
    }
  }

  private clearPartials(): void {
    for (const element of this.elements.values()) this.intersection.unobserve(element);
    this.elements.clear();
    this.svgCache.clear();
    this.requested.clear();
    this.nearViewport.clear();
    this.queue.clear();
    this.partialsLayer.replaceChildren();
  }

  private reset(): void {
    this.clearPartials();
    this.pagesLayer.replaceChildren();
    this.sheetLayout = null;
    this.requestedOptions = null;
    this.firstPaintPending = true;
    this.scroller.scrollTop = 0;
    this.scroller.scrollLeft = 0;
  }
}

function sameOptions(a: ViewOptions, b: ViewOptions): boolean {
  return (
    a.layout === b.layout &&
    a.systemsLayout === b.systemsLayout &&
    a.staffDisplay === b.staffDisplay &&
    a.width === b.width &&
    a.notationScale === b.notationScale &&
    (a.style === b.style ||
      (a.style !== undefined && b.style !== undefined && sameScoreStyle(a.style, b.style))) &&
    a.trackIndexes.length === b.trackIndexes.length &&
    a.trackIndexes.every((value, index) => value === b.trackIndexes[index])
  );
}

function sameExceptZoom(a: ScoreViewState, b: ScoreViewState): boolean {
  return (
    a.docId === b.docId &&
    a.layout === b.layout &&
    samePageSetup(a.page, b.page) &&
    sameScoreStyle(a.style, b.style) &&
    a.systemsLayout === b.systemsLayout &&
    a.staffDisplay === b.staffDisplay &&
    a.trackIndexes.length === b.trackIndexes.length &&
    a.trackIndexes.every((value, index) => value === b.trackIndexes[index])
  );
}
