import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generatePlayback, openScore, RenderSession } from '@opentabz/core';
import {
  BOUNDS_BAR_INDEX_STRIDE,
  BOUNDS_BAR_RECT_STRIDE,
  type PlaybackTimeline,
  type ScoreBounds,
} from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
import {
  barRange,
  beatAtPoint,
  beatEndTick,
  beatNearPoint,
  beatPlacement,
  beatsStartingAt,
  beatTicks,
  findBarOccurrence,
  findSlice,
  indexBeats,
  nextSlice,
  occurrence,
  rangeBars,
  rangeBetweenBeats,
  rangeRects,
  tickOfBeat,
} from './timeline-lookup.ts';

const FIXTURES = join(import.meta.dirname, '..', '..', '..', '..', 'fixtures');

function load(path: string): { timeline: PlaybackTimeline; bounds: ScoreBounds } {
  const bytes = new Uint8Array(readFileSync(join(FIXTURES, path)));
  const { score } = openScore(bytes, path);
  const { timeline } = generatePlayback(score, 'test');
  const session = new RenderSession(score, {
    trackIndexes: [0],
    layout: 'page',
    systemsLayout: 'auto',
    staffDisplay: 'default',
    width: 720,
    notationScale: 1,
  });
  const { bounds } = session.layout();
  session.dispose();
  return { timeline, bounds };
}

describe('timeline lookups', () => {
  it('finds the played bar and slice for any tick, in order', () => {
    const { timeline } = load('alphatex/demos/twelve-bar-shuffle.atex');
    expect(findBarOccurrence(timeline, 0)).toBe(0);
    const third = occurrence(timeline, 2);
    expect(third?.masterBarIndex).toBe(2);
    expect(findBarOccurrence(timeline, (third?.startTick ?? 0) + 10)).toBe(2);
    expect(findBarOccurrence(timeline, timeline.endTick + 1000)).toBe(timeline.bars.length / 5 - 1);
    if (third === null) return;
    const slice = findSlice(timeline, third, third.startTick + 1);
    expect(slice?.startTick).toBe(third.startTick);
    const next = slice === null ? null : nextSlice(timeline, slice);
    expect(next?.startTick).toBeGreaterThan(third.startTick);
  });

  it('follows repeats: a repeated bar is played several times', () => {
    const { timeline } = load('alphatab/guitarpro7/repeat-close-multi.gp');
    const played = [];
    for (let index = 0; index < timeline.bars.length / 5; index++)
      played.push(occurrence(timeline, index)?.masterBarIndex);
    expect(played.length).toBeGreaterThan(new Set(played).size);
  });

  it('maps ticks to drawn beats and clicks back to ticks', () => {
    const { timeline, bounds } = load('alphatex/demos/twelve-bar-shuffle.atex');
    const beats = indexBeats(bounds);
    const tracks = new Set([0]);
    const bar = occurrence(timeline, 4);
    expect(bar).not.toBeNull();
    if (bar === null) return;
    const first = findSlice(timeline, bar, bar.startTick);
    expect(first).not.toBeNull();
    if (first === null) return;
    const [beatId] = beatsStartingAt(timeline, first, tracks);
    expect(beatId).toBeDefined();
    const index = beats.get(beatId ?? -1);
    expect(index).toBeDefined();
    const placement = beatPlacement(bounds, index ?? 0);
    expect(placement?.masterBarIndex).toBe(4);
    if (placement === null) return;

    // Clicking where that beat is drawn seeks to the beat's tick.
    const clicked = beatAtPoint(bounds, tracks, placement.x, placement.system.y + placement.system.h / 2);
    expect(clicked).toBe(beatId);
    expect(tickOfBeat(timeline, clicked ?? -1)).toBe(bar.startTick);
    // Clicking outside every system finds nothing.
    expect(beatAtPoint(bounds, tracks, placement.x, -100)).toBeNull();
  });

  it('ignores beats of hidden tracks', () => {
    const { timeline } = load('alphatex/demos/twelve-bar-shuffle.atex');
    const bar = occurrence(timeline, 0);
    const first = bar === null ? null : findSlice(timeline, bar, 0);
    expect(first).not.toBeNull();
    if (first === null) return;
    expect(beatsStartingAt(timeline, first, new Set())).toEqual([]);
    expect(beatsStartingAt(timeline, first, new Set([0, 2])).length).toBeGreaterThanOrEqual(2);
  });
});

describe('playback ranges', () => {
  it('covers two beats in either order and draws whole bars edge to edge', () => {
    const { timeline, bounds } = load('alphatex/demos/twelve-bar-shuffle.atex');
    const tracks = new Set([0]);
    const bar2 = occurrence(timeline, 1);
    const bar5 = occurrence(timeline, 4);
    if (bar2 === null || bar5 === null) throw new Error('missing bars');
    const firstSlice = findSlice(timeline, bar2, bar2.startTick);
    const lastSlice = findSlice(timeline, bar5, bar5.endTick - 1);
    const first = firstSlice === null ? undefined : beatsStartingAt(timeline, firstSlice, tracks)[0];
    const last = lastSlice === null ? undefined : beatsStartingAt(timeline, lastSlice, tracks)[0];
    if (first === undefined || last === undefined) throw new Error('missing beats');

    const forward = rangeBetweenBeats(timeline, first, last);
    expect(rangeBetweenBeats(timeline, last, first)).toEqual(forward);
    expect(forward).toEqual({ startTick: bar2.startTick, endTick: bar5.endTick });
    expect(beatEndTick(timeline, last, tickOfBeat(timeline, last) ?? 0)).toBe(bar5.endTick);
    expect(barRange(timeline, bar2.startTick + 10)).toEqual({
      startTick: bar2.startTick,
      endTick: bar2.endTick,
    });
    if (forward === null) throw new Error('no range');
    expect(rangeBars(timeline, forward)).toEqual({ first: 1, last: 4 });

    // Whole bars: the rectangles are exactly the bars' rectangles, merged per system.
    const rects = rangeRects(bounds, timeline, tracks, forward);
    const expected = new Map<number, { left: number; right: number; y: number }>();
    for (let index = 0; index < bounds.barIndex.length / BOUNDS_BAR_INDEX_STRIDE; index++) {
      const masterBar = bounds.barIndex[index * BOUNDS_BAR_INDEX_STRIDE] ?? -1;
      if (masterBar < 1 || masterBar > 4) continue;
      const system = bounds.barIndex[index * BOUNDS_BAR_INDEX_STRIDE + 1] ?? -1;
      const x = bounds.barRect[index * BOUNDS_BAR_RECT_STRIDE] ?? 0;
      const w = bounds.barRect[index * BOUNDS_BAR_RECT_STRIDE + 2] ?? 0;
      const y = bounds.barRect[index * BOUNDS_BAR_RECT_STRIDE + 1] ?? 0;
      const entry = expected.get(system);
      expected.set(system, {
        left: Math.min(entry?.left ?? x, x),
        right: Math.max(entry?.right ?? x + w, x + w),
        y,
      });
    }
    expect(rects).toHaveLength(expected.size);
    for (const [index, entry] of [...expected.values()].entries()) {
      expect(rects[index]?.x).toBeCloseTo(entry.left, 3);
      expect((rects[index]?.x ?? 0) + (rects[index]?.w ?? 0)).toBeCloseTo(entry.right, 3);
      expect(rects[index]?.y).toBeCloseTo(entry.y, 3);
    }
  });

  it('draws a range inside one bar from beat to beat', () => {
    const { timeline, bounds } = load('alphatex/demos/twelve-bar-shuffle.atex');
    const tracks = new Set([0]);
    const bar = occurrence(timeline, 2);
    if (bar === null) throw new Error('missing bar');
    const middle = findSlice(timeline, bar, bar.startTick + (bar.endTick - bar.startTick) / 2);
    if (middle === null) throw new Error('missing slice');
    const range = { startTick: middle.startTick, endTick: bar.endTick };
    const [rect] = rangeRects(bounds, timeline, tracks, range);
    const whole = rangeRects(bounds, timeline, tracks, { startTick: bar.startTick, endTick: bar.endTick })[0];
    if (rect === undefined || whole === undefined) throw new Error('missing rects');
    expect(rect.x).toBeGreaterThan(whole.x + 1);
    expect(rect.x + rect.w).toBeCloseTo(whole.x + whole.w, 3);
  });

  it('lists every pass of a beat through repeats', () => {
    const tex =
      '\\tempo 120\n\\track "Flute" {instrument flute}\n\\staff {score}\nC4.1 | \\ro D4.1 | \\rc 2 E4.1';
    const { score } = openScore(new TextEncoder().encode(tex), 'repeat.atex');
    const { timeline } = generatePlayback(score, 'test');
    const repeated = score.tracks[0]?.staves[0]?.bars[1]?.voices[0]?.beats[0];
    const once = score.tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats[0];
    if (repeated === undefined || once === undefined) throw new Error('missing beats');
    // Bars 2–3 repeat: D4 plays in bar 2 and again after bar 3.
    expect(beatTicks(timeline, repeated.id)).toEqual([3840, 11520]);
    expect(beatTicks(timeline, once.id)).toEqual([0]);
    expect(beatTicks(timeline, -5)).toEqual([]);
  });

  it('snaps points between systems to the nearest system', () => {
    const { bounds } = load('alphatex/demos/twelve-bar-shuffle.atex');
    const tracks = new Set([0]);
    const firstSystemY = bounds.systems[1] ?? 0;
    const x = (bounds.systems[0] ?? 0) + 40;
    expect(beatAtPoint(bounds, tracks, x, firstSystemY - 30)).toBeNull();
    expect(beatNearPoint(bounds, tracks, x, firstSystemY - 30)).toBe(
      beatAtPoint(bounds, tracks, x, firstSystemY + 5),
    );
  });
});

describe('navigation lookups', () => {
  it('finds the pass through a bar nearest the playback position', async () => {
    const { occurrenceOfMasterBar } = await import('./timeline-lookup.ts');
    const tex =
      '\\tempo 120\n\\track "Flute" {instrument flute}\n\\staff {score}\nC4.1 | \\ro D4.1 | \\rc 2 E4.1 | F4.1';
    const { score } = openScore(new TextEncoder().encode(tex), 'repeat.atex');
    const { timeline } = generatePlayback(score, 'test');
    expect(occurrenceOfMasterBar(timeline, 1)?.startTick).toBe(3840);
    expect(occurrenceOfMasterBar(timeline, 1, 4000)?.startTick).toBe(11520);
    expect(occurrenceOfMasterBar(timeline, 1, 99999)?.startTick).toBe(3840);
    expect(occurrenceOfMasterBar(timeline, 3)?.startTick).toBe(19200);
    expect(occurrenceOfMasterBar(timeline, 9)).toBeNull();
  });

  it('counts beats in the meter, with pickups counted from the end', async () => {
    const { beatInBar } = await import('./timeline-lookup.ts');
    const full = { index: 0, startTick: 0, endTick: 3840, masterBarIndex: 0, firstSlice: 0, sliceCount: 1 };
    expect(beatInBar(full, 0, { numerator: 4, denominator: 4 })).toBe(1);
    expect(beatInBar(full, 959, { numerator: 4, denominator: 4 })).toBe(1);
    expect(beatInBar(full, 2880, { numerator: 4, denominator: 4 })).toBe(4);
    const sixEight = { ...full, endTick: 2880 };
    expect(beatInBar(sixEight, 480, { numerator: 6, denominator: 8 })).toBe(2);
    // A one-quarter pickup in 3/4 is beat 3.
    const pickup = { ...full, endTick: 960 };
    expect(beatInBar(pickup, 0, { numerator: 3, denominator: 4 })).toBe(3);
  });

  it('steps beat by beat in playback order, and finds bar ends and beats at a tick', async () => {
    const { stepBeat, lastBeatTick, beatsAtTick } = await import('./timeline-lookup.ts');
    const { timeline } = load('alphatex/demos/twelve-bar-shuffle.atex');
    const tracks = new Set([0]);
    const second = stepBeat(timeline, 0, tracks, 1);
    expect(second).toBeGreaterThan(0);
    expect(stepBeat(timeline, second ?? 0, tracks, -1)).toBe(0);
    // From inside a beat, "back" returns to its start first; a tick of rounding is not "inside".
    expect(stepBeat(timeline, (second ?? 0) + 10, tracks, -1)).toBe(second);
    expect(stepBeat(timeline, (second ?? 0) + 1, tracks, -1)).toBe(0);
    expect(stepBeat(timeline, 0, tracks, -1)).toBeNull();
    const bar = occurrence(timeline, 0);
    if (bar === null) throw new Error('no bar');
    const last = lastBeatTick(timeline, bar, tracks);
    expect(last).toBeGreaterThan(bar.startTick);
    expect(last).toBeLessThan(bar.endTick);
    expect(stepBeat(timeline, last, tracks, 1)).toBe(bar.endTick);
    expect(beatsAtTick(timeline, 0, tracks)).toHaveLength(1);
    expect(beatsAtTick(timeline, 1, tracks)).toEqual([]);
  });
});
