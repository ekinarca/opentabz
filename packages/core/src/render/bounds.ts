/**
 * Flattens alphaTab's bounds lookup into typed arrays the UI can use for the playback cursor,
 * bar highlighting and click-to-seek without holding the score model.
 */
import type * as alphaTab from '@coderline/alphatab';
import { STAFF_KIND, type ScoreBounds } from '../shared/playback.ts';

/** alphaTab's staff ids (patch 0058), as `ScoreBounds.staffLines` numbers them. */
const KINDS: ReadonlyMap<string, number> = new Map([
  ['score', STAFF_KIND.notation],
  ['tab', STAFF_KIND.tablature],
  ['slash', STAFF_KIND.slash],
  ['numbered', STAFF_KIND.numbered],
]);

export function extractBounds(lookup: alphaTab.rendering.BoundsLookup | null): ScoreBounds {
  const systems: number[] = [];
  const barIndex: number[] = [];
  const barRect: number[] = [];
  const beatIndex: number[] = [];
  const beatRect: number[] = [];
  const staffLines: number[] = [];
  const lines: number[] = [];
  for (const system of lookup?.staffSystems ?? []) {
    const systemIndex = systems.length / 4;
    const real = system.realBounds;
    systems.push(real.x, real.y, real.w, real.h);
    // A staff's lines run through the whole system: the first bar drawn on it gives them.
    const staves = new Set<string>();
    for (const masterBar of system.bars) {
      const barBoundsIndex = barIndex.length / 2;
      const aligned = masterBar.lineAlignedBounds;
      barIndex.push(masterBar.index, systemIndex);
      barRect.push(aligned.x, aligned.y, aligned.w, aligned.h);
      for (const bar of masterBar.bars) {
        const kind = KINDS.get(bar.staffId);
        const staff = bar.bar.staff;
        const key = `${String(staff.track.index)}/${String(staff.index)}/${bar.staffId}`;
        if (kind !== undefined && bar.lineYs !== null && !staves.has(key)) {
          staves.add(key);
          staffLines.push(systemIndex, staff.track.index, staff.index, kind, lines.length, bar.lineYs.length);
          lines.push(...bar.lineYs);
        }
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
    staffLines: Int32Array.from(staffLines),
    lines: Float32Array.from(lines),
  };
}
