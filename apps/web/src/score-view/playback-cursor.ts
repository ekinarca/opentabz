/**
 * Playback cursor: a beat line (gliding between beats with Web Animations, or jumping from note
 * to note or beat to beat), a highlight on the current bar, the notes being played drawn in the
 * cursor colour, and auto-scroll that follows the music continuously or page by page. Scrolling
 * by hand pauses the following until it is resumed. Positions come from the synthesizer ~45
 * times per second; DOM work happens only when the playing slice or beat changes.
 */
import { TIMELINE_ITEM_STRIDE, type PlaybackTimeline } from '@opentabz/core/shared';
import type { CursorStyle, ScrollMode } from '../state/preferences.ts';
import { engineToSheet } from './pagination.ts';
import type { ScoreView } from './score-view.ts';
import {
  beatAtPoint,
  beatPlacement,
  beatsStartingAt,
  findBarOccurrence,
  findSlice,
  indexBeats,
  nextSlice,
  occurrence,
  slice,
  tickOfBeat,
  type BeatPlacement,
  type Meter,
  type Occurrence,
  type Slice,
} from './timeline-lookup.ts';

/** Ticks per quarter note in alphaTab's MIDI. */
const QUARTER_TICKS = 960;
/** Keys that scroll the view by themselves. */
const SCROLL_KEYS = new Set(['PageUp', 'PageDown']);

export interface CursorOptions {
  readonly scrollMode: ScrollMode;
  /** Where the playing system (or, horizontally, the beat line) sits: a share of the view. */
  readonly scrollOffset: number;
  readonly cursorStyle: CursorStyle;
  readonly barHighlight: boolean;
  readonly noteHighlight: boolean;
}

export const DEFAULT_CURSOR_OPTIONS: CursorOptions = {
  scrollMode: 'continuous',
  scrollOffset: 0.18,
  cursorStyle: 'smooth',
  barHighlight: true,
  noteHighlight: true,
};

let scopes = 0;

export class PlaybackCursor {
  private readonly view: ScoreView;
  private readonly barElement: HTMLDivElement;
  private readonly beatElement: HTMLDivElement;
  /** Colours the notes being played; scoped to this view's partials. */
  private readonly highlightStyle: HTMLStyleElement;
  private readonly scope: string;
  private readonly onPausedChange: (paused: boolean) => void;
  private readonly removeListeners: () => void;
  private options: CursorOptions = DEFAULT_CURSOR_OPTIONS;
  private timeline: PlaybackTimeline | null = null;
  private meters: readonly Meter[] = [];
  private beatIndex = new Map<number, number>();
  private tracks = new Set<number>();
  private currentSlice = -1;
  /** For the beat-by-beat cursor: the bar occurrence and beat it was placed on. */
  private currentStep = '';
  private currentBeat: BeatPlacement | null = null;
  private currentSystem = -1;
  private animation: Animation | null = null;
  private highlighted = '';
  private lastTick = 0;
  private lastTempo = 120;
  private playing = false;
  private follow = true;
  /** The user scrolled away while playing: following waits for `resume()`. */
  private paused = false;

  public constructor(view: ScoreView, onPausedChange: (paused: boolean) => void = () => undefined) {
    this.view = view;
    this.onPausedChange = onPausedChange;
    this.barElement = document.createElement('div');
    this.barElement.className = 'ot-cursor-bar';
    this.beatElement = document.createElement('div');
    this.beatElement.className = 'ot-cursor-beat';
    this.barElement.hidden = true;
    this.beatElement.hidden = true;
    this.highlightStyle = document.createElement('style');
    scopes += 1;
    this.scope = `ot-cursor-${scopes}`;
    view.scrollContainer.dataset['cursorScope'] = this.scope;
    view.overlay.append(this.barElement, this.beatElement, this.highlightStyle);
    this.removeListeners = this.listenForManualScrolling();
  }

  public setTimeline(timeline: PlaybackTimeline | null): void {
    this.timeline = timeline;
    this.reset();
    this.render(this.lastTick, this.lastTempo, false);
  }

  /** Meters of the master bars, for the beat-by-beat cursor. */
  public setMeters(meters: readonly Meter[]): void {
    this.meters = meters;
  }

  public setOptions(options: CursorOptions): void {
    const previous = this.options;
    this.options = options;
    if (options.scrollMode === 'off' && this.paused) this.setPaused(false);
    if (
      previous.cursorStyle !== options.cursorStyle ||
      previous.barHighlight !== options.barHighlight ||
      previous.noteHighlight !== options.noteHighlight
    ) {
      this.reset();
      this.render(this.lastTick, this.lastTempo, this.playing);
    }
  }

  /** Call after every layout: bounds and visible tracks may have changed. */
  public onLayout(): void {
    const bounds = this.view.bounds;
    this.beatIndex = bounds === null ? new Map<number, number>() : indexBeats(bounds);
    this.tracks = new Set(this.view.trackIndexes);
    this.reset();
    this.render(this.lastTick, this.lastTempo, this.playing);
  }

  /** Whether the view scrolls along with playback (off while a selection is dragged). */
  public setFollow(follow: boolean): void {
    this.follow = follow;
  }

  /** Follows playback again after the user scrolled away, back to where the music is. */
  public resume(): void {
    this.setPaused(false);
    if (this.currentBeat !== null) this.scrollIntoView(this.currentBeat, true);
  }

  public update(tick: number, tempo: number, playing: boolean): void {
    const wasPlaying = this.playing;
    this.lastTick = tick;
    this.lastTempo = tempo > 0 ? tempo : this.lastTempo;
    this.playing = playing;
    if (wasPlaying && !playing) this.animation?.pause();
    if (wasPlaying !== playing) this.highlightSlice(this.timeline, playing ? this.currentSlice : -1);
    // Pressing play means following the music again, from wherever the view was left.
    if (!wasPlaying && playing) {
      this.setPaused(false);
      const beat = this.currentBeat;
      if (beat !== null && this.follow && this.options.scrollMode !== 'off' && !this.inView(beat)) {
        this.scrollIntoView(beat, true);
      }
    }
    this.render(tick, this.lastTempo, playing);
  }

  /** The score tick a click at engine coordinates (x, y) corresponds to. */
  public tickAt(x: number, y: number): number | null {
    const bounds = this.view.bounds;
    const timeline = this.timeline;
    if (bounds === null || timeline === null) return null;
    const beatId = beatAtPoint(bounds, this.tracks, x, y);
    if (beatId === null) return null;
    const current = occurrence(timeline, findBarOccurrence(timeline, this.lastTick));
    return tickOfBeat(timeline, beatId, current?.startTick ?? 0);
  }

  public dispose(): void {
    this.removeListeners();
    this.animation?.cancel();
    this.barElement.remove();
    this.beatElement.remove();
    this.highlightStyle.remove();
  }

  private reset(): void {
    this.currentSlice = -1;
    this.currentStep = '';
    this.currentBeat = null;
    this.currentSystem = -1;
  }

  private setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;
    this.onPausedChange(paused);
  }

  /** Wheel, touch, scroll keys and the scrollbar mean the user wants to look elsewhere. */
  private listenForManualScrolling(): () => void {
    const scroller = this.view.scrollContainer;
    const manual = () => {
      if (this.playing && this.options.scrollMode !== 'off') this.setPaused(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) manual();
    };
    const onPointer = (event: PointerEvent) => {
      // A press on the scroller itself (not on the music) is a press on its scrollbar.
      if (event.target === scroller) manual();
    };
    scroller.addEventListener('wheel', manual, { passive: true });
    scroller.addEventListener('touchmove', manual, { passive: true });
    scroller.addEventListener('keydown', onKey);
    scroller.addEventListener('pointerdown', onPointer);
    return () => {
      scroller.removeEventListener('wheel', manual);
      scroller.removeEventListener('touchmove', manual);
      scroller.removeEventListener('keydown', onKey);
      scroller.removeEventListener('pointerdown', onPointer);
    };
  }

  private render(tick: number, tempo: number, playing: boolean): void {
    const timeline = this.timeline;
    const layout = this.view.layout;
    if (timeline === null || layout === null || this.beatIndex.size === 0) {
      this.hide();
      return;
    }
    const bar = occurrence(timeline, findBarOccurrence(timeline, tick));
    if (bar === null) {
      this.hide();
      return;
    }
    const current = findSlice(timeline, bar, tick);
    if (current === null) return;
    if (this.options.cursorStyle === 'beat') {
      this.renderBeatStep(timeline, bar, tick, playing);
      if (current.index !== this.currentSlice) {
        this.currentSlice = current.index;
        if (playing) this.highlightSlice(timeline, current.index);
      }
      return;
    }
    if (current.index === this.currentSlice) {
      if (playing && this.animation?.playState === 'paused') this.animation.play();
      return;
    }
    if (playing) this.highlightSlice(timeline, current.index);
    const started = this.placementFor(timeline, current);
    if (started === null && this.currentBeat !== null && this.animation !== null) {
      // Only hidden tracks have a beat here: the visible beat still sounds, and the cursor keeps
      // gliding towards the next one instead of starting over from this beat.
      this.currentSlice = current.index;
      if (playing && this.animation.playState === 'paused') this.animation.play();
      return;
    }
    const placement = started ?? this.soundingPlacement(timeline, bar, current);
    if (placement === null) return;
    this.currentSlice = current.index;

    const next = this.nextPlacement(timeline, current);
    const ticksPerMs = (tempo * QUARTER_TICKS) / 60_000;
    const duration = Math.max(0, (next.tick - tick) / ticksPerMs);
    const glide = this.options.cursorStyle === 'smooth';
    this.place(placement, placement.x, glide ? next.placement : null, duration, playing);
    this.followMusic(placement, playing);
  }

  /** Beat by beat: the line sits where the music is at each beat of the meter. */
  private renderBeatStep(timeline: PlaybackTimeline, bar: Occurrence, tick: number, playing: boolean): void {
    const meter = this.meters[bar.masterBarIndex] ?? { numerator: 4, denominator: 4 };
    const beatTicks = (4 * QUARTER_TICKS) / meter.denominator;
    // A bar shorter than its meter (a pickup) counts its beats from the end.
    const missing = Math.max(0, meter.numerator * beatTicks - (bar.endTick - bar.startTick));
    const beat = Math.floor((Math.max(0, tick - bar.startTick) + missing) / beatTicks);
    const step = `${bar.index}:${beat}`;
    if (step === this.currentStep) return;
    const beatTick = Math.max(bar.startTick, bar.startTick + beat * beatTicks - missing);
    const at = findSlice(timeline, bar, beatTick);
    if (at === null) return;
    // The visible beat sounding at the beat tick, and the next one: the line sits in between.
    let from: { tick: number; placement: BeatPlacement } | null = null;
    for (let index = at.index; index >= bar.firstSlice && from === null; index--) {
      const earlier = slice(timeline, index);
      const placement = earlier === null ? null : this.placementFor(timeline, earlier);
      if (earlier !== null && placement !== null) from = { tick: earlier.startTick, placement };
    }
    if (from === null) return;
    this.currentStep = step;
    const next = this.nextPlacement(timeline, at);
    const sameSystem = next.placement !== null && next.placement.systemIndex === from.placement.systemIndex;
    const endX =
      sameSystem && next.placement !== null ? next.placement.x : from.placement.bar.x + from.placement.bar.w;
    const span = next.tick - from.tick;
    const x =
      span > 0
        ? from.placement.x + ((endX - from.placement.x) * (beatTick - from.tick)) / span
        : from.placement.x;
    this.place(from.placement, x, null, 0, playing);
    this.followMusic(from.placement, playing);
  }

  /** Scrolls along, as the options say, when a new system starts (or every beat horizontally). */
  private followMusic(placement: BeatPlacement, playing: boolean): void {
    const newSystem = placement.systemIndex !== this.currentSystem;
    this.currentSystem = placement.systemIndex;
    if (!playing || !this.follow || this.paused || this.options.scrollMode === 'off') return;
    if (newSystem || this.view.layoutKind === 'horizontal') this.scrollIntoView(placement, false);
  }

  /** Placement of the first visible beat starting in `target`, if any. */
  private placementFor(timeline: PlaybackTimeline, target: Slice): BeatPlacement | null {
    const bounds = this.view.bounds;
    if (bounds === null) return null;
    for (const beatId of beatsStartingAt(timeline, target, this.tracks)) {
      const index = this.beatIndex.get(beatId);
      if (index !== undefined) return beatPlacement(bounds, index);
    }
    return null;
  }

  /**
   * The visible beat still sounding at `target` (it started in an earlier slice of the bar), for
   * a position reached by seeking into a held note.
   */
  private soundingPlacement(
    timeline: PlaybackTimeline,
    bar: Occurrence,
    target: Slice,
  ): BeatPlacement | null {
    for (let index = target.index - 1; index >= bar.firstSlice; index--) {
      const earlier = slice(timeline, index);
      if (earlier === null) break;
      const placement = this.placementFor(timeline, earlier);
      if (placement !== null) return placement;
    }
    return this.currentBeat;
  }

  /** Where the cursor should glide to: the next beat on the same system, or the end of the bar. */
  private nextPlacement(
    timeline: PlaybackTimeline,
    current: Slice,
  ): { tick: number; placement: BeatPlacement | null } {
    let candidate = nextSlice(timeline, current);
    for (let guard = 0; candidate !== null && guard < 64; guard++) {
      const placement = this.placementFor(timeline, candidate);
      if (placement !== null) return { tick: candidate.startTick, placement };
      candidate = nextSlice(timeline, candidate);
    }
    return { tick: current.endTick, placement: null };
  }

  /**
   * Shows the bar highlight and the beat line at `x` on `placement`'s system, gliding to `next`
   * over `duration` milliseconds (or still when `next` is null).
   */
  private place(
    placement: BeatPlacement,
    x: number,
    next: BeatPlacement | null,
    duration: number,
    playing: boolean,
  ): void {
    const layout = this.view.layout;
    if (layout === null) return;
    const top = engineToSheet(layout, x, placement.system.y + 1);
    const barTop = engineToSheet(layout, placement.bar.x, placement.bar.y + 1);
    if (top === null || barTop === null) return;
    this.currentBeat = placement;

    this.barElement.hidden = !this.options.barHighlight;
    this.barElement.style.transform = `translate(${barTop.x}px, ${barTop.y - 1}px)`;
    this.barElement.style.width = `${placement.bar.w}px`;
    this.barElement.style.height = `${placement.bar.h}px`;

    this.beatElement.hidden = this.options.cursorStyle === 'hidden';
    this.beatElement.style.height = `${placement.system.h}px`;
    const y = top.y - 1;
    let endX = top.x;
    if (next !== null) {
      const sameSystem = next.systemIndex === placement.systemIndex;
      const end = engineToSheet(
        layout,
        sameSystem ? next.x : placement.bar.x + placement.bar.w,
        placement.system.y + 1,
      );
      endX = end?.x ?? top.x;
    }
    this.animation?.cancel();
    this.animation = this.beatElement.animate(
      [{ transform: `translate(${top.x}px, ${y}px)` }, { transform: `translate(${endX}px, ${y}px)` }],
      { duration: Math.max(1, duration), easing: 'linear', fill: 'forwards' },
    );
    if (!playing) this.animation.pause();
  }

  /** The notes of the visible tracks sounding in slice `index`, in the cursor colour. */
  private highlightSlice(timeline: PlaybackTimeline | null, index: number): void {
    let css = '';
    const target = timeline === null || index < 0 ? null : slice(timeline, index);
    if (target !== null && timeline !== null && this.options.noteHighlight) {
      const beats: string[] = [];
      for (let item = target.firstItem; item < target.firstItem + target.itemCount; item++) {
        const base = item * TIMELINE_ITEM_STRIDE;
        const track = timeline.items[base + 1] ?? -1;
        if (this.tracks.has(track)) beats.push(`b${timeline.items[base] ?? -1}`);
      }
      if (beats.length > 0) {
        const scoped = beats.map(beat => `[data-cursor-scope='${this.scope}'] .${beat}`);
        const fills = scoped.map(selector => `${selector} :is(text, [fill]:not([fill='none']))`).join(',');
        const strokes = scoped.map(selector => `${selector} [stroke]:not([stroke='none'])`).join(',');
        css = `${fills}{fill: var(--ot-cursor) !important}${strokes}{stroke: var(--ot-cursor) !important}`;
      }
    }
    if (css === this.highlighted) return;
    this.highlighted = css;
    this.highlightStyle.textContent = css;
  }

  private scrollIntoView(placement: BeatPlacement, now: boolean): void {
    const layout = this.view.layout;
    if (layout === null) return;
    const scroller = this.view.scrollContainer;
    const zoom = this.view.zoom;
    const top = engineToSheet(layout, placement.x, placement.system.y);
    if (top === null) return;
    const { scrollMode, scrollOffset } = this.options;
    const behavior: ScrollBehavior = now || scrollMode === 'page' ? 'auto' : 'smooth';
    const scrollTo = (options: ScrollToOptions) => {
      scroller.scrollTo({ ...options, behavior });
    };
    if (this.view.layoutKind === 'horizontal') {
      const x = top.x * zoom;
      const left = scroller.scrollLeft;
      const width = scroller.clientWidth;
      if (scrollMode === 'page') {
        // A page further when the line nears the right edge (or is out of view).
        if (now || x < left || x > left + width * 0.9) scrollTo({ left: x - width * 0.05 });
        return;
      }
      if (now || Math.abs(x - (left + width * scrollOffset)) > width * 0.15) {
        scrollTo({ left: x - width * scrollOffset });
      }
      return;
    }
    const systemTop = top.y * zoom;
    const systemBottom = (top.y + placement.system.h) * zoom;
    const viewTop = scroller.scrollTop;
    const height = scroller.clientHeight;
    const page = layout.pages.find(
      box => top.y >= box.y && top.y < box.y + box.height && top.x >= box.x && top.x < box.x + box.width,
    );
    // Pages side by side or in a grid: sideways too, to the page, when the system starts out of view.
    const left = this.systemLeftInView(placement) ? undefined : Math.max(0, ((page?.x ?? top.x) - 12) * zoom);
    if (scrollMode === 'page') {
      if (!now && this.inView(placement)) return;
      // To the top of the page the system is on, if it fits; otherwise to the system.
      const pageTop = page === undefined ? null : page.y * zoom - 12;
      const target = pageTop !== null && systemBottom - pageTop <= height ? pageTop : systemTop - 12;
      scrollTo({ top: Math.max(0, target), ...(left === undefined ? {} : { left }) });
      return;
    }
    const target = Math.max(0, systemTop - height * scrollOffset);
    if (now || Math.abs(target - viewTop) > 4 || left !== undefined)
      scrollTo({ top: target, ...(left === undefined ? {} : { left }) });
  }

  /** Whether the start of the placement's system is in view sideways. */
  private systemLeftInView(placement: BeatPlacement): boolean {
    const layout = this.view.layout;
    const start = layout === null ? null : engineToSheet(layout, placement.system.x, placement.system.y);
    if (start === null) return true;
    const scroller = this.view.scrollContainer;
    const x = start.x * this.view.zoom;
    return x >= scroller.scrollLeft && x < scroller.scrollLeft + scroller.clientWidth;
  }

  /** Whether the placement's system (or, horizontally, its beat) is all in view. */
  private inView(placement: BeatPlacement): boolean {
    const layout = this.view.layout;
    const top = layout === null ? null : engineToSheet(layout, placement.x, placement.system.y);
    if (top === null) return true;
    const scroller = this.view.scrollContainer;
    const zoom = this.view.zoom;
    if (this.view.layoutKind === 'horizontal') {
      const x = top.x * zoom;
      return x >= scroller.scrollLeft && x <= scroller.scrollLeft + scroller.clientWidth;
    }
    const systemTop = top.y * zoom;
    const systemBottom = (top.y + placement.system.h) * zoom;
    return (
      systemTop >= scroller.scrollTop &&
      systemBottom <= scroller.scrollTop + scroller.clientHeight &&
      this.systemLeftInView(placement)
    );
  }

  private hide(): void {
    this.animation?.cancel();
    this.animation = null;
    this.barElement.hidden = true;
    this.beatElement.hidden = true;
    this.highlightSlice(null, -1);
    this.reset();
  }
}
