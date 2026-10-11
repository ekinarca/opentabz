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
  let systemIndex = -1;
  for (let index = 0; index < systemCount; index++) {
    const rect = rectAt(bounds.systems, index, BOUNDS_SYSTEM_STRIDE);
    if (y >= rect.y && y <= rect.y + rect.h) {
      systemIndex = index;
      break;
    }
  }
  if (systemIndex < 0) return null;

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

/** Index (in playback order) of the slice that follows `current`, or null at the end. */
export function nextSlice(timeline: PlaybackTimeline, current: Slice): Slice | null {
  return slice(timeline, current.index + 1);
}
