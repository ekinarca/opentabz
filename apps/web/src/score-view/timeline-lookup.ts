/**
 * Pure lookups over the playback timeline and score bounds (no DOM): which beat sounds at a tick,
 * where it is drawn, and which tick a click on the score corresponds to.
 */
import {
  BOUNDS_BAR_INDEX_STRIDE,
  BOUNDS_BAR_RECT_STRIDE,
  BOUNDS_BEAT_INDEX_STRIDE,
  BOUNDS_BEAT_RECT_STRIDE,
  BOUNDS_SYSTEM_STRIDE,
  TIMELINE_BAR_STRIDE,
  TIMELINE_ITEM_STRIDE,
  TIMELINE_SLICE_STRIDE,
  type PlaybackTimeline,
  type ScoreBounds,
  type TickRange,
} from '@opentabz/core/shared';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Index of the played bar (in playback order) containing `tick`, or -1 outside the song. */
export function findBarOccurrence(timeline: PlaybackTimeline, tick: number): number {
  const { bars } = timeline;
  const count = bars.length / TIMELINE_BAR_STRIDE;
  let low = 0;
  let high = count - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const start = bars[middle * TIMELINE_BAR_STRIDE] ?? 0;
    if (start <= tick) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  if (found < 0) return count > 0 ? 0 : -1;
  return found;
}

export interface Occurrence {
  readonly index: number;
  readonly startTick: number;
  readonly endTick: number;
  readonly masterBarIndex: number;
  readonly firstSlice: number;
  readonly sliceCount: number;
}

export function occurrence(timeline: PlaybackTimeline, index: number): Occurrence | null {
  const base = index * TIMELINE_BAR_STRIDE;
  if (index < 0 || base >= timeline.bars.length) return null;
  const { bars } = timeline;
  return {
    index,
    startTick: bars[base] ?? 0,
    endTick: bars[base + 1] ?? 0,
    masterBarIndex: bars[base + 2] ?? 0,
    firstSlice: bars[base + 3] ?? 0,
    sliceCount: bars[base + 4] ?? 0,
  };
}

export interface Slice {
  readonly index: number;
  readonly startTick: number;
  readonly endTick: number;
  readonly firstItem: number;
  readonly itemCount: number;
}

export function slice(timeline: PlaybackTimeline, index: number): Slice | null {
  const base = index * TIMELINE_SLICE_STRIDE;
  if (index < 0 || base >= timeline.slices.length) return null;
  const { slices } = timeline;
  return {
    index,
    startTick: slices[base] ?? 0,
    endTick: slices[base + 1] ?? 0,
    firstItem: slices[base + 2] ?? 0,
    itemCount: slices[base + 3] ?? 0,
  };
}

/** The slice of `bar` that contains `tick` (the last one that started at or before it). */
export function findSlice(timeline: PlaybackTimeline, bar: Occurrence, tick: number): Slice | null {
  let result: Slice | null = null;
  for (let index = bar.firstSlice; index < bar.firstSlice + bar.sliceCount; index++) {
    const candidate = slice(timeline, index);
    if (candidate === null) break;
    if (candidate.startTick > tick) break;
    result = candidate;
  }
  return result ?? slice(timeline, bar.firstSlice);
}

/**
 * Beat ids of the visible tracks that start at the beginning of `slice`, in timeline order.
 * A slice where every visible beat was already sounding (a held note) returns an empty list.
 */
export function beatsStartingAt(
  timeline: PlaybackTimeline,
  target: Slice,
  tracks: ReadonlySet<number>,
): number[] {
  const result: number[] = [];
  for (let item = target.firstItem; item < target.firstItem + target.itemCount; item++) {
    const base = item * TIMELINE_ITEM_STRIDE;
    const beatId = timeline.items[base] ?? -1;
    const track = timeline.items[base + 1] ?? -1;
    const start = timeline.items[base + 2] ?? -1;
    if (tracks.has(track) && start === target.startTick) result.push(beatId);
  }
  return result;
}

/** Position of every bounds entry, keyed by beat id. */
export function indexBeats(bounds: ScoreBounds): Map<number, number> {
  const map = new Map<number, number>();
  const count = bounds.beatIndex.length / BOUNDS_BEAT_INDEX_STRIDE;
  for (let index = 0; index < count; index++) {
    const beatId = bounds.beatIndex[index * BOUNDS_BEAT_INDEX_STRIDE] ?? -1;
    if (!map.has(beatId)) map.set(beatId, index);
  }
  return map;
}

export interface BeatPlacement {
  /** x of the beat's notes (engine coordinates). */
  readonly x: number;
  readonly system: Rect;
  readonly bar: Rect;
  readonly systemIndex: number;
  readonly masterBarIndex: number;
}

export function beatPlacement(bounds: ScoreBounds, beatBoundsIndex: number): BeatPlacement | null {
  const barBoundsIndex = bounds.beatIndex[beatBoundsIndex * BOUNDS_BEAT_INDEX_STRIDE + 3];
  if (barBoundsIndex === undefined) return null;
  const systemIndex = bounds.barIndex[barBoundsIndex * BOUNDS_BAR_INDEX_STRIDE + 1] ?? 0;
  const masterBarIndex = bounds.barIndex[barBoundsIndex * BOUNDS_BAR_INDEX_STRIDE] ?? 0;
  return {
    x: bounds.beatRect[beatBoundsIndex * BOUNDS_BEAT_RECT_STRIDE] ?? 0,
    system: rectAt(bounds.systems, systemIndex, BOUNDS_SYSTEM_STRIDE),
    bar: rectAt(bounds.barRect, barBoundsIndex, BOUNDS_BAR_RECT_STRIDE),
    systemIndex,
    masterBarIndex,
  };
}

function rectAt(values: Float32Array, index: number, stride: number): Rect {
  const base = index * stride;
  return {
    x: values[base] ?? 0,
    y: values[base + 1] ?? 0,
    w: values[base + 2] ?? 0,
    h: values[base + 3] ?? 0,
  };
}

/** The beat of a visible track drawn closest to the engine point (x, y), or null outside the music. */
export function beatAtPoint(
  bounds: ScoreBounds,
  tracks: ReadonlySet<number>,
  x: number,
  y: number,
): number | null {
  const systemCount = bounds.systems.length / BOUNDS_SYSTEM_STRIDE;
  for (let index = 0; index < systemCount; index++) {
    const rect = rectAt(bounds.systems, index, BOUNDS_SYSTEM_STRIDE);
    if (y >= rect.y && y <= rect.y + rect.h) return beatInSystem(bounds, tracks, index, x);
  }
  return null;
}

/**
 * Like `beatAtPoint`, but a point between or beyond systems snaps to the nearest one (for drags
 * that leave the music).
 */
export function beatNearPoint(
  bounds: ScoreBounds,
  tracks: ReadonlySet<number>,
  x: number,
  y: number,
): number | null {
  const systemCount = bounds.systems.length / BOUNDS_SYSTEM_STRIDE;
  let nearest = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < systemCount; index++) {
    const rect = rectAt(bounds.systems, index, BOUNDS_SYSTEM_STRIDE);
    const distance = y < rect.y ? rect.y - y : y > rect.y + rect.h ? y - (rect.y + rect.h) : 0;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  }
  return nearest < 0 ? null : beatInSystem(bounds, tracks, nearest, x);
}

function beatInSystem(
  bounds: ScoreBounds,
  tracks: ReadonlySet<number>,
  systemIndex: number,
  x: number,
): number | null {
  let best: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const beatCount = bounds.beatIndex.length / BOUNDS_BEAT_INDEX_STRIDE;
  for (let index = 0; index < beatCount; index++) {
    const base = index * BOUNDS_BEAT_INDEX_STRIDE;
    const track = bounds.beatIndex[base + 1] ?? -1;
    const barBoundsIndex = bounds.beatIndex[base + 3] ?? -1;
    if (!tracks.has(track)) continue;
    if ((bounds.barIndex[barBoundsIndex * BOUNDS_BAR_INDEX_STRIDE + 1] ?? -1) !== systemIndex) continue;
    const realX = bounds.beatRect[index * BOUNDS_BEAT_RECT_STRIDE + 1] ?? 0;
    const realW = bounds.beatRect[index * BOUNDS_BEAT_RECT_STRIDE + 2] ?? 0;
    const distance = x < realX ? realX - x : x > realX + realW ? x - (realX + realW) : 0;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = bounds.beatIndex[base] ?? null;
    }
  }
  return best;
}

/**
 * The tick at which `beatId` is played. With several passes (repeats), the first pass at or
 * after `preferAfterTick` wins, otherwise the first pass of the song.
 */
export function tickOfBeat(timeline: PlaybackTimeline, beatId: number, preferAfterTick = 0): number | null {
  let first: number | null = null;
  const barCount = timeline.bars.length / TIMELINE_BAR_STRIDE;
  for (let barIndex = 0; barIndex < barCount; barIndex++) {
    const bar = occurrence(timeline, barIndex);
    if (bar === null) break;
    for (let sliceIndex = bar.firstSlice; sliceIndex < bar.firstSlice + bar.sliceCount; sliceIndex++) {
      const target = slice(timeline, sliceIndex);
      if (target === null) break;
      for (let item = target.firstItem; item < target.firstItem + target.itemCount; item++) {
        const base = item * TIMELINE_ITEM_STRIDE;
        if (timeline.items[base] !== beatId) continue;
        const start = timeline.items[base + 2] ?? target.startTick;
        if (start >= preferAfterTick) return start;
        first ??= start;
      }
    }
  }
  return first;
}

/** Every tick at which `beatId` starts playing (one per pass through repeats), ascending. */
export function beatTicks(timeline: PlaybackTimeline, beatId: number): number[] {
  const ticks: number[] = [];
  const itemCount = timeline.items.length / TIMELINE_ITEM_STRIDE;
  for (let item = 0; item < itemCount; item++) {
    const base = item * TIMELINE_ITEM_STRIDE;
    if (timeline.items[base] !== beatId) continue;
    const start = timeline.items[base + 2] ?? -1;
    if (start >= 0 && ticks.at(-1) !== start) ticks.push(start);
  }
  return ticks;
}

/** Index (in playback order) of the slice that follows `current`, or null at the end. */
export function nextSlice(timeline: PlaybackTimeline, current: Slice): Slice | null {
  return slice(timeline, current.index + 1);
}

/**
 * The tick at which a beat that starts at `startTick` stops sounding: the end of the last
 * consecutive slice that still lists it.
 */
export function beatEndTick(timeline: PlaybackTimeline, beatId: number, startTick: number): number {
  const bar = occurrence(timeline, findBarOccurrence(timeline, startTick));
  if (bar === null) return startTick;
  let current = findSlice(timeline, bar, startTick);
  let end = current?.endTick ?? startTick;
  while (current !== null && listsBeat(timeline, current, beatId, startTick)) {
    end = current.endTick;
    current = nextSlice(timeline, current);
  }
  return end;
}

function listsBeat(timeline: PlaybackTimeline, target: Slice, beatId: number, startTick: number): boolean {
  for (let item = target.firstItem; item < target.firstItem + target.itemCount; item++) {
    const base = item * TIMELINE_ITEM_STRIDE;
    if (timeline.items[base] === beatId && timeline.items[base + 2] === startTick) return true;
  }
  return false;
}

/**
 * The playback range covering two beats (in either order): from the start of the earlier one to
 * the end of the later one. Null if either beat is never played.
 */
export function rangeBetweenBeats(
  timeline: PlaybackTimeline,
  beatA: number,
  beatB: number,
  preferAfterTick = 0,
): TickRange | null {
  const startA = tickOfBeat(timeline, beatA, preferAfterTick);
  const startB = tickOfBeat(timeline, beatB, preferAfterTick);
  if (startA === null || startB === null) return null;
  const [startTick, lastBeat, lastStart] =
    startA <= startB ? [startA, beatB, startB] : [startB, beatA, startA];
  return { startTick, endTick: beatEndTick(timeline, lastBeat, lastStart) };
}

/** The whole played bar containing `tick`. */
export function barRange(timeline: PlaybackTimeline, tick: number): TickRange | null {
  const bar = occurrence(timeline, findBarOccurrence(timeline, tick));
  return bar === null ? null : { startTick: bar.startTick, endTick: bar.endTick };
}

/**
 * Grows (`direction` 1) or shrinks (-1) a range by one played bar at its end. Without a range,
 * selects the bar playing at `tick`. A range never shrinks below its first bar.
 */
export function resizeRangeByBar(
  timeline: PlaybackTimeline,
  range: TickRange | null,
  tick: number,
  direction: 1 | -1,
): TickRange | null {
  if (range === null) return barRange(timeline, tick);
  const first = findBarOccurrence(timeline, range.startTick);
  const last = findBarOccurrence(timeline, range.endTick - 1);
  if (direction < 0 && last <= first) return range;
  const target = occurrence(timeline, last + direction);
  return target === null ? range : { startTick: range.startTick, endTick: target.endTick };
}

/** First and last played bar of a range, as master bar indexes (for labels). */
export function rangeBars(
  timeline: PlaybackTimeline,
  range: TickRange,
): { first: number; last: number } | null {
  const first = occurrence(timeline, findBarOccurrence(timeline, range.startTick));
  const last = occurrence(
    timeline,
    findBarOccurrence(timeline, Math.max(range.startTick, range.endTick - 1)),
  );
  if (first === null || last === null) return null;
  return { first: first.masterBarIndex, last: last.masterBarIndex };
}

/**
 * Rectangles (engine coordinates) covering `range` for the visible tracks, one per run of bars on
 * a staff system: whole bars edge to edge, partly covered bars from beat to beat.
 */
export function rangeRects(
  bounds: ScoreBounds,
  timeline: PlaybackTimeline,
  tracks: ReadonlySet<number>,
  range: TickRange,
): Rect[] {
  const barBounds = new Map<number, number>();
  const barCount = bounds.barIndex.length / BOUNDS_BAR_INDEX_STRIDE;
  for (let index = 0; index < barCount; index++) {
    const masterBar = bounds.barIndex[index * BOUNDS_BAR_INDEX_STRIDE] ?? -1;
    if (!barBounds.has(masterBar)) barBounds.set(masterBar, index);
  }
  const beats = indexBeats(bounds);

  const rects: { system: number; rect: Rect }[] = [];
  for (let index = Math.max(0, findBarOccurrence(timeline, range.startTick)); ; index++) {
    const bar = occurrence(timeline, index);
    if (bar === null || bar.startTick >= range.endTick) break;
    if (bar.endTick <= range.startTick) continue;
    const boundsIndex = barBounds.get(bar.masterBarIndex);
    if (boundsIndex === undefined) continue;
    const barRect = rectAt(bounds.barRect, boundsIndex, BOUNDS_BAR_RECT_STRIDE);
    const system = bounds.barIndex[boundsIndex * BOUNDS_BAR_INDEX_STRIDE + 1] ?? 0;
    let left = barRect.x;
    let right = barRect.x + barRect.w;
    if (range.startTick > bar.startTick || range.endTick < bar.endTick) {
      // Partly covered: span the visible beats that start inside the range.
      let beatLeft = Number.POSITIVE_INFINITY;
      let beatRight = Number.NEGATIVE_INFINITY;
      for (let sliceIndex = bar.firstSlice; sliceIndex < bar.firstSlice + bar.sliceCount; sliceIndex++) {
        const target = slice(timeline, sliceIndex);
        if (target === null) break;
        for (let item = target.firstItem; item < target.firstItem + target.itemCount; item++) {
          const base = item * TIMELINE_ITEM_STRIDE;
          const start = timeline.items[base + 2] ?? -1;
          if (start < range.startTick || start >= range.endTick || start !== target.startTick) continue;
          if (!tracks.has(timeline.items[base + 1] ?? -1)) continue;
          const beat = beats.get(timeline.items[base] ?? -1);
          if (beat === undefined) continue;
          const realX = bounds.beatRect[beat * BOUNDS_BEAT_RECT_STRIDE + 1] ?? 0;
          const realW = bounds.beatRect[beat * BOUNDS_BEAT_RECT_STRIDE + 2] ?? 0;
          beatLeft = Math.min(beatLeft, realX);
          beatRight = Math.max(beatRight, realX + realW);
        }
      }
      if (beatLeft > beatRight) continue;
      if (range.startTick > bar.startTick) left = beatLeft;
      if (range.endTick < bar.endTick) right = beatRight;
    }
    const previous = rects.at(-1);
    if (previous?.system === system && Math.abs(previous.rect.x + previous.rect.w - left) < 1) {
      previous.rect = { ...previous.rect, w: right - previous.rect.x };
    } else {
      rects.push({ system, rect: { x: left, y: barRect.y, w: right - left, h: barRect.h } });
    }
  }
  return rects.map(entry => entry.rect);
}
