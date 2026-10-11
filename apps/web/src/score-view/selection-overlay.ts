/**
 * The selected playback range (the A/B loop) drawn over the music, with a handle at each end.
 *
 * A range is made by dragging across the music with a mouse, by a long press on a touch screen
 * (which selects that bar), or by Shift+click. The handles are separate elements with
 * `touch-action: none`, so they can be dragged with a finger without fighting the browser's
 * scrolling; holding a handle near the viewport's edge scrolls the score.
 */
import type { PlaybackTimeline, TickRange } from '@opentabz/core/shared';
import { engineToSheet } from './pagination.ts';
import type { ScoreView } from './score-view.ts';
import {
  barRange,
  beatEndTick,
  beatNearPoint,
  beatTicks,
  findBarOccurrence,
  occurrence,
  rangeBetweenBeats,
  rangeRects,
} from './timeline-lookup.ts';

type End = 'start' | 'end';

export interface SelectionOverlayOptions {
  /** A new range was chosen; `final` once the gesture that changes it has ended. */
  readonly onChange: (range: TickRange | null, final: boolean) => void;
  /** The playback position, to choose the right pass through repeated bars. */
  readonly currentTick: () => number;
  /** A drag (of the range or a handle) started or ended. */
  readonly onDragging?: (dragging: boolean) => void;
}

interface HandleDrag {
  readonly end: End;
  readonly pointerId: number;
  readonly element: HTMLDivElement;
  clientX: number;
  clientY: number;
  range: TickRange;
}

export class SelectionOverlay {
  private readonly view: ScoreView;
  private readonly options: SelectionOverlayOptions;
  private readonly layer: HTMLDivElement;
  private readonly handles: Readonly<Record<End, HTMLDivElement>>;
  private readonly rects: HTMLDivElement[] = [];
  private timeline: PlaybackTimeline | null = null;
  private tracks = new Set<number>();
  private range: TickRange | null = null;
  /** The beat a mouse drag across the music started on. */
  private dragAnchor: number | null = null;
  private handleDrag: HandleDrag | null = null;

  public constructor(view: ScoreView, options: SelectionOverlayOptions) {
    this.view = view;
    this.options = options;
    this.layer = document.createElement('div');
    this.layer.className = 'ot-selection-layer';
    this.handles = { start: this.createHandle('start'), end: this.createHandle('end') };
    // Below the playback cursor, which is appended to the overlay afterwards.
    view.overlay.prepend(this.layer, this.handles.start, this.handles.end);
    this.render();
  }

  public setTimeline(timeline: PlaybackTimeline | null): void {
    this.timeline = timeline;
    this.render();
  }

  /** Call after every layout: bounds and visible tracks may have changed. */
  public onLayout(): void {
    this.tracks = new Set(this.view.trackIndexes);
    this.render();
  }

  /** Shows `range` (from the player); ignored while a handle is being dragged. */
  public setRange(range: TickRange | null): void {
    if (this.handleDrag !== null) return;
    if (range?.startTick === this.range?.startTick && range?.endTick === this.range?.endTick) return;
    this.range = range;
    this.render();
  }

  public get isDragging(): boolean {
    return this.dragAnchor !== null || this.handleDrag !== null;
  }

  /** A mouse drag across the music started at engine point (x, y). */
  public beginDrag(x: number, y: number): void {
    const beat = this.beatAt(x, y);
    if (beat === null) return;
    this.dragAnchor = beat;
    this.options.onDragging?.(true);
    this.dragTo(x, y);
  }

  public dragTo(x: number, y: number): void {
    const anchor = this.dragAnchor;
    const timeline = this.timeline;
    const beat = this.beatAt(x, y);
    if (anchor === null || timeline === null || beat === null) return;
    const range = rangeBetweenBeats(timeline, anchor, beat, this.preferAfterTick());
    if (range !== null) this.change(range, false);
  }

  public endDrag(x: number, y: number): void {
    if (this.dragAnchor === null) return;
    this.dragTo(x, y);
    this.dragAnchor = null;
    this.options.onDragging?.(false);
    if (this.range !== null) this.options.onChange(this.range, true);
  }

  /** Selects the whole bar at engine point (x, y) (a long press). */
  public selectBarAt(x: number, y: number): boolean {
    const timeline = this.timeline;
    const beat = this.beatAt(x, y);
    if (timeline === null || beat === null) return false;
    const tick = this.passOf(beat);
    const range = tick === null ? null : barRange(timeline, tick);
    if (range === null) return false;
    this.change(range, true);
    return true;
  }

  /**
   * Extends the range (or makes one from the playback position) to the beat at engine point
   * (x, y) (Shift+click).
   */
  public extendTo(x: number, y: number): void {
    const timeline = this.timeline;
    const beat = this.beatAt(x, y);
    if (timeline === null || beat === null) return;
    const tick = this.passOf(beat);
    if (tick === null) return;
    const end = beatEndTick(timeline, beat, tick);
    const current = this.range;
    let range: TickRange;
    if (current !== null) {
      range =
        tick < current.startTick
          ? { startTick: tick, endTick: current.endTick }
          : { startTick: current.startTick, endTick: Math.max(end, current.startTick + 1) };
    } else {
      const position = this.options.currentTick();
      const bar = occurrence(timeline, findBarOccurrence(timeline, position));
      const from = bar?.startTick ?? 0;
      range =
        tick < from ? { startTick: tick, endTick: bar?.endTick ?? end } : { startTick: from, endTick: end };
    }
    this.change(range, true);
  }

  public dispose(): void {
    this.endHandleDrag();
    this.layer.remove();
    this.handles.start.remove();
    this.handles.end.remove();
  }

  private change(range: TickRange, final: boolean): void {
    this.range = range;
    this.render();
    this.options.onChange(range, final);
  }

  private beatAt(x: number, y: number): number | null {
    const bounds = this.view.bounds;
    if (bounds === null || this.timeline === null) return null;
    return beatNearPoint(bounds, this.tracks, x, y);
  }

  private preferAfterTick(): number {
    const timeline = this.timeline;
    if (timeline === null) return 0;
    const bar = occurrence(timeline, findBarOccurrence(timeline, this.options.currentTick()));
    return bar?.startTick ?? 0;
  }

  /** The pass of `beat` nearest the playback position (repeats play a beat several times). */
  private passOf(beat: number): number | null {
    const timeline = this.timeline;
    if (timeline === null) return null;
    const ticks = beatTicks(timeline, beat);
    const after = this.preferAfterTick();
    return ticks.find(tick => tick >= after) ?? ticks[0] ?? null;
  }

  private createHandle(end: End): HTMLDivElement {
    const handle = document.createElement('div');
    handle.className = 'ot-selection-handle';
    handle.dataset['end'] = end;
    handle.hidden = true;
    // A pointer-only affordance: keyboard users adjust the range with Shift+arrows.
    handle.setAttribute('aria-hidden', 'true');
    const knob = document.createElement('span');
    knob.className = 'ot-selection-knob';
    handle.append(knob);
    handle.addEventListener('pointerdown', event => {
      this.onHandleDown(end, handle, event);
    });
    handle.addEventListener('pointermove', this.onHandleMove);
    handle.addEventListener('pointerup', this.onHandleUp);
    handle.addEventListener('pointercancel', this.onHandleUp);
    return handle;
  }

  private onHandleDown(end: End, element: HTMLDivElement, event: PointerEvent): void {
    const range = this.range;
    if (range === null || !event.isPrimary || event.button !== 0) return;
    // The score underneath must not start a drag or a tap of its own.
    event.stopPropagation();
    event.preventDefault();
    element.setPointerCapture(event.pointerId);
    this.handleDrag = {
      end,
      pointerId: event.pointerId,
      element,
      clientX: event.clientX,
      clientY: event.clientY,
      range,
    };
    element.dataset['active'] = '';
    this.options.onDragging?.(true);
  }

  private readonly onHandleMove = (event: PointerEvent): void => {
    const drag = this.handleDrag;
    if (drag?.pointerId !== event.pointerId) return;
    drag.clientX = event.clientX;
    drag.clientY = event.clientY;
    this.view.autoScroll(event.clientX, event.clientY, this.moveHandle);
    this.moveHandle();
  };

  private readonly onHandleUp = (event: PointerEvent): void => {
    const drag = this.handleDrag;
    if (drag?.pointerId !== event.pointerId) return;
    this.endHandleDrag();
    this.options.onChange(drag.range, true);
  };

  /** Moves the dragged end to the beat under the pointer; the ends never cross. */
  private readonly moveHandle = (): void => {
    const drag = this.handleDrag;
    const timeline = this.timeline;
    const bounds = this.view.bounds;
    if (drag === null || timeline === null || bounds === null) return;
    const point = this.view.clientToEngine(drag.clientX, drag.clientY, true);
    if (point === null) return;
    const beat = beatNearPoint(bounds, this.tracks, point.x, point.y);
    if (beat === null) return;
    const passes = beatTicks(timeline, beat);
    let range: TickRange | null = null;
    if (drag.end === 'start') {
      const start = passes.filter(tick => tick < drag.range.endTick).at(-1);
      if (start !== undefined) range = { startTick: start, endTick: drag.range.endTick };
    } else {
      const start = passes.find(tick => tick >= drag.range.startTick);
      if (start !== undefined)
        range = { startTick: drag.range.startTick, endTick: beatEndTick(timeline, beat, start) };
    }
    if (range === null || (range.startTick === drag.range.startTick && range.endTick === drag.range.endTick))
      return;
    drag.range = range;
    this.range = range;
    this.render();
    this.options.onChange(range, false);
  };

  private endHandleDrag(): void {
    const drag = this.handleDrag;
    if (drag === null) return;
    this.handleDrag = null;
    this.view.autoScroll(0, 0, null);
    delete drag.element.dataset['active'];
    if (drag.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
    this.options.onDragging?.(false);
  }

  private render(): void {
    const layout = this.view.layout;
    const bounds = this.view.bounds;
    const range = this.range;
    const timeline = this.timeline;
    const rects =
      layout === null || bounds === null || range === null || timeline === null
        ? []
        : rangeRects(bounds, timeline, this.tracks, range);

    const placed: { x: number; y: number; w: number; h: number }[] = [];
    if (layout !== null) {
      for (const rect of rects) {
        const top = engineToSheet(layout, rect.x, rect.y + 1);
        if (top !== null) placed.push({ x: top.x, y: top.y - 1, w: rect.w, h: rect.h });
      }
    }
    while (this.rects.length < placed.length) {
      const element = document.createElement('div');
      element.className = 'ot-selection';
      this.layer.append(element);
      this.rects.push(element);
    }
    this.rects.forEach((element, index) => {
      const rect = placed[index];
      element.hidden = rect === undefined;
      if (rect === undefined) return;
      element.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
      element.style.width = `${rect.w}px`;
      element.style.height = `${rect.h}px`;
    });

    const first = placed[0];
    const last = placed.at(-1);
    this.placeHandle(this.handles.start, first === undefined ? null : { x: first.x, y: first.y, h: first.h });
    this.placeHandle(
      this.handles.end,
      last === undefined ? null : { x: last.x + last.w, y: last.y, h: last.h },
    );
  }

  private placeHandle(handle: HTMLDivElement, at: { x: number; y: number; h: number } | null): void {
    handle.hidden = at === null;
    if (at === null) return;
    handle.style.transform = `translate(${at.x}px, ${at.y}px)`;
    handle.style.height = `${at.h}px`;
  }
}
