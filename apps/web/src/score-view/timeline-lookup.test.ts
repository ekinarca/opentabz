import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generatePlayback, openScore, RenderSession } from '@opentabz/core';
import type { PlaybackTimeline, ScoreBounds } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';
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
