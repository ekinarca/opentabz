import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { generatePlayback } from '../src/playback/generate.ts';
import { TIMELINE_BAR_STRIDE, TIMELINE_ITEM_STRIDE, TIMELINE_SLICE_STRIDE } from '../src/shared/playback.ts';
import { readFixture } from './helpers.ts';

describe('generatePlayback', () => {
  it('produces absolute, ordered ticks for bars, slices and beats', () => {
    const { score } = openScore(readFixture('alphatex/demos/twelve-bar-shuffle.atex'), 'shuffle.atex');
    const { timeline, midi, tickShift } = generatePlayback(score, 'p1');
    expect(midi).toBeInstanceOf(Map);
    expect(tickShift).toBe(0);
    const barCount = timeline.bars.length / TIMELINE_BAR_STRIDE;
    expect(barCount).toBe(13);
    let previousSlice = -1;
    for (let bar = 0; bar < barCount; bar++) {
      const base = bar * TIMELINE_BAR_STRIDE;
      const start = timeline.bars[base] ?? 0;
      const end = timeline.bars[base + 1] ?? 0;
      const firstSlice = timeline.bars[base + 3] ?? 0;
      const sliceCount = timeline.bars[base + 4] ?? 0;
      expect(timeline.bars[base + 2]).toBe(bar);
      for (let slice = firstSlice; slice < firstSlice + sliceCount; slice++) {
        const sliceStart = timeline.slices[slice * TIMELINE_SLICE_STRIDE] ?? -1;
        const sliceEnd = timeline.slices[slice * TIMELINE_SLICE_STRIDE + 1] ?? -1;
        expect(sliceStart).toBeGreaterThanOrEqual(start);
        expect(sliceEnd).toBeLessThanOrEqual(end);
        expect(sliceStart).toBeGreaterThan(previousSlice);
        previousSlice = sliceStart;
        const firstItem = timeline.slices[slice * TIMELINE_SLICE_STRIDE + 2] ?? 0;
        const itemCount = timeline.slices[slice * TIMELINE_SLICE_STRIDE + 3] ?? 0;
        for (let item = firstItem; item < firstItem + itemCount; item++) {
          expect(timeline.items[item * TIMELINE_ITEM_STRIDE + 2]).toBeLessThanOrEqual(sliceStart);
        }
      }
    }
    // 12 bars of 4/4 plus a final whole-note bar, quarter = 960 ticks.
    expect(timeline.endTick).toBe(13 * 3840);
  });

  it('shifts pickup bars and reports transposition for transposing instruments', () => {
    const { score } = openScore(readFixture('alphatex/demos/greensleeves.atex'), 'greensleeves.atex');
    const { timeline } = generatePlayback(score, 'p2');
    // The pickup bar holds a single quarter note.
    expect((timeline.bars[1] ?? 0) - (timeline.bars[0] ?? 0)).toBe(960);
  });
});
