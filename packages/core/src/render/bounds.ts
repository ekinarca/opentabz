/**
 * Flattens alphaTab's bounds lookup into typed arrays the UI can use for the playback cursor,
 * bar highlighting and click-to-seek without holding the score model.
 */
import type * as alphaTab from '@coderline/alphatab';
import type { ScoreBounds } from '../shared/playback.ts';

export function extractBounds(lookup: alphaTab.rendering.BoundsLookup | null): ScoreBounds {
  const systems: number[] = [];
  const barIndex: number[] = [];
  const barRect: number[] = [];
  const beatIndex: number[] = [];
  const beatRect: number[] = [];
  for (const system of lookup?.staffSystems ?? []) {
    const systemIndex = systems.length / 4;
    const real = system.realBounds;
    systems.push(real.x, real.y, real.w, real.h);
    for (const masterBar of system.bars) {
      const barBoundsIndex = barIndex.length / 2;
      const aligned = masterBar.lineAlignedBounds;
      barIndex.push(masterBar.index, systemIndex);
      barRect.push(aligned.x, aligned.y, aligned.w, aligned.h);
      for (const bar of masterBar.bars) {
        for (const beat of bar.beats) {
          beatIndex.push(beat.beat.id, bar.bar.staff.track.index, bar.bar.staff.index, barBoundsIndex);
          beatRect.push(beat.onNotesX, beat.realBounds.x, beat.realBounds.w);
        }
      }
    }
  }
  return {
    systems: Float32Array.from(systems),
    barIndex: Int32Array.from(barIndex),
    barRect: Float32Array.from(barRect),
    beatIndex: Int32Array.from(beatIndex),
    beatRect: Float32Array.from(beatRect),
  };
}
