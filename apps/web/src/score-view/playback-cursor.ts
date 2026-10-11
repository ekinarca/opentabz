/**
 * Playback cursor: a beat line that glides between beats (Web Animations, compositor-driven) and
 * a highlight on the current bar, plus auto-scroll that keeps the playing system in view.
 * Positions come from the synthesizer ~45 times per second; DOM work happens only when the
 * playing beat changes.
 */
import type { PlaybackTimeline } from '@opentabz/core/shared';
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
  tickOfBeat,
  type BeatPlacement,
  type Slice,
} from './timeline-lookup.ts';

/** Ticks per quarter note in alphaTab's MIDI. */
const QUARTER_TICKS = 960;
/** Where the playing system is placed when auto-scrolling (fraction of the viewport height). */
const SCROLL_ANCHOR = 0.18;

export class PlaybackCursor {
  private readonly view: ScoreView;
  private readonly barElement: HTMLDivElement;
  private readonly beatElement: HTMLDivElement;
  private timeline: PlaybackTimeline | null = null;
  private beatIndex = new Map<number, number>();
  private tracks = new Set<number>();
  private currentSlice = -1;
  private currentBeat: BeatPlacement | null = null;
  private currentSystem = -1;
  private animation: Animation | null = null;
  private lastTick = 0;
  private lastTempo = 120;
  private playing = false;
  private follow = true;

  public constructor(view: ScoreView) {
    this.view = view;
    this.barElement = document.createElement('div');
    this.barElement.className = 'ot-cursor-bar';
    this.beatElement = document.createElement('div');
    this.beatElement.className = 'ot-cursor-beat';
    this.barElement.hidden = true;
    this.beatElement.hidden = true;
    view.overlay.append(this.barElement, this.beatElement);
  }

  public setTimeline(timeline: PlaybackTimeline | null): void {
    this.timeline = timeline;
    this.reset();
    this.render(this.lastTick, this.lastTempo, false);
  }

  /** Call after every layout: bounds and visible tracks may have changed. */
  public onLayout(): void {
    const bounds = this.view.bounds;
    this.beatIndex = bounds === null ? new Map<number, number>() : indexBeats(bounds);
    this.tracks = new Set(this.view.trackIndexes);
    this.reset();
    this.render(this.lastTick, this.lastTempo, this.playing);
  }

  /** Whether the view scrolls along with playback. */
  public setFollow(follow: boolean): void {
    this.follow = follow;
  }

  public update(tick: number, tempo: number, playing: boolean): void {
    const wasPlaying = this.playing;
    this.lastTick = tick;
    this.lastTempo = tempo > 0 ? tempo : this.lastTempo;
    this.playing = playing;
    if (wasPlaying && !playing) this.animation?.pause();
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
    this.animation?.cancel();
    this.barElement.remove();
    this.beatElement.remove();
  }

  private reset(): void {
    this.currentSlice = -1;
    this.currentBeat = null;
    this.currentSystem = -1;
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
    if (current.index === this.currentSlice) {
      if (playing && this.animation?.playState === 'paused') this.animation.play();
      return;
    }
    const placement = this.placementFor(timeline, current);
    if (placement === null) return;
    this.currentSlice = current.index;

    const next = this.nextPlacement(timeline, current);
    const ticksPerMs = (tempo * QUARTER_TICKS) / 60_000;
    const duration = Math.max(0, (next.tick - tick) / ticksPerMs);
    this.place(placement, next.placement, duration, playing);
    // A horizontal layout is a single system: check on every beat, the scroll keeps a margin.
    const newSystem = placement.systemIndex !== this.currentSystem;
    if (playing && this.follow && (newSystem || this.view.layoutKind === 'horizontal')) {
      this.scrollIntoView(placement);
    }
    this.currentSystem = placement.systemIndex;
  }

  /** Placement of the first visible beat starting in `target`, or of the beat still sounding. */
  private placementFor(timeline: PlaybackTimeline, target: Slice): BeatPlacement | null {
    const bounds = this.view.bounds;
    if (bounds === null) return null;
    for (const beatId of beatsStartingAt(timeline, target, this.tracks)) {
      const index = this.beatIndex.get(beatId);
      if (index !== undefined) return beatPlacement(bounds, index);
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
      if (placement !== null && placement !== this.currentBeat) {
        return { tick: candidate.startTick, placement };
      }
      candidate = nextSlice(timeline, candidate);
    }
    return { tick: current.endTick, placement: null };
  }

  private place(
    placement: BeatPlacement,
    next: BeatPlacement | null,
    duration: number,
    playing: boolean,
  ): void {
    const layout = this.view.layout;
    if (layout === null) return;
    const top = engineToSheet(layout, placement.x, placement.system.y + 1);
    const barTop = engineToSheet(layout, placement.bar.x, placement.bar.y + 1);
    if (top === null || barTop === null) return;
    this.currentBeat = placement;

    this.barElement.hidden = false;
    this.barElement.style.transform = `translate(${barTop.x}px, ${barTop.y - 1}px)`;
    this.barElement.style.width = `${placement.bar.w}px`;
    this.barElement.style.height = `${placement.bar.h}px`;

    this.beatElement.hidden = false;
    this.beatElement.style.height = `${placement.system.h}px`;
    const y = top.y - 1;
    const sameSystem = next !== null && next.systemIndex === placement.systemIndex;
    const endX = sameSystem ? next.x : placement.bar.x + placement.bar.w;
    const end = engineToSheet(layout, endX, placement.system.y + 1);
    this.animation?.cancel();
    this.animation = this.beatElement.animate(
      [
        { transform: `translate(${top.x}px, ${y}px)` },
        { transform: `translate(${end?.x ?? top.x}px, ${y}px)` },
      ],
      { duration: Math.max(1, duration), easing: 'linear', fill: 'forwards' },
    );
    if (!playing) this.animation.pause();
  }

  private scrollIntoView(placement: BeatPlacement): void {
    const layout = this.view.layout;
    if (layout === null) return;
    const scroller = this.view.scrollContainer;
    const zoom = this.view.zoom;
    const top = engineToSheet(layout, placement.x, placement.system.y);
    if (top === null) return;
    if (this.view.layoutKind === 'horizontal') {
      const x = top.x * zoom;
      if (
        x < scroller.scrollLeft + scroller.clientWidth * 0.1 ||
        x > scroller.scrollLeft + scroller.clientWidth * 0.7
      ) {
        scroller.scrollTo({ left: x - scroller.clientWidth * 0.25, behavior: 'smooth' });
      }
      return;
    }
    const systemTop = top.y * zoom;
    const systemBottom = (top.y + placement.system.h) * zoom;
    const viewTop = scroller.scrollTop;
    const viewBottom = viewTop + scroller.clientHeight;
    if (systemTop < viewTop || systemBottom > viewBottom - scroller.clientHeight * 0.1) {
      scroller.scrollTo({
        top: Math.max(0, systemTop - scroller.clientHeight * SCROLL_ANCHOR),
        behavior: 'smooth',
      });
    }
  }

  private hide(): void {
    this.animation?.cancel();
    this.animation = null;
    this.barElement.hidden = true;
    this.beatElement.hidden = true;
    this.reset();
  }
}
