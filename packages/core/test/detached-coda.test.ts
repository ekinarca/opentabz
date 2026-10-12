/**
 * A detached coda (REND-200): the coda starts a system of its own, set apart from the music before
 * it by the space the stylesheet asks, in millimetres, as Guitar Pro draws it; attached, it runs
 * on. Both when the score is laid out and when only its width changes.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { RenderSession } from '../src/render/session.ts';
import { BOUNDS_BAR_INDEX_STRIDE, BOUNDS_SYSTEM_STRIDE } from '../src/shared/playback.ts';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { engraveFixture } from './engraving.ts';
import { readFixture } from './helpers.ts';

/** coda-march.atex's Coda, bar 7, after its bridge's bar 6. */
const CODA = 6;
const PX_PER_MM = 96 / 25.4;

function view(style: Partial<ScoreStyle>, width: number): ViewOptions {
  return {
    trackIndexes: [0],
    layout: 'page',
    systemsLayout: 'auto',
    staffDisplay: 'default',
    width,
    notationScale: 1,
    style: { ...DEFAULT_SCORE_STYLE, ...style },
  };
}

/** Each bar's system, and each system's top and bottom, of a layout. */
function systems(session: RenderSession, options: ViewOptions) {
  const { bounds } = session.layout(options);
  const systemOf = new Map<number, number>();
  for (let i = 0; i * BOUNDS_BAR_INDEX_STRIDE < bounds.barIndex.length; i++) {
    systemOf.set(
      bounds.barIndex[i * BOUNDS_BAR_INDEX_STRIDE] ?? -1,
      bounds.barIndex[i * BOUNDS_BAR_INDEX_STRIDE + 1] ?? -1,
    );
  }
  const places: { top: number; bottom: number }[] = [];
  for (let i = 0; i * BOUNDS_SYSTEM_STRIDE < bounds.systems.length; i++) {
    const top = bounds.systems[i * BOUNDS_SYSTEM_STRIDE + 1] ?? 0;
    places.push({ top, bottom: top + (bounds.systems[i * BOUNDS_SYSTEM_STRIDE + 3] ?? 0) });
  }
  return { systemOf, places };
}

/** The space between the coda's system and the one before it. */
function gapAbove(laid: ReturnType<typeof systems>): number {
  const coda = laid.systemOf.get(CODA) ?? 0;
  return (laid.places[coda]?.top ?? 0) - (laid.places[coda - 1]?.bottom ?? 0);
}

const sessions: RenderSession[] = [];

function session(): RenderSession {
  const { score } = openScore(readFixture('alphatex/playback/coda-march.atex'), 'coda-march.atex');
  const opened = new RenderSession(score, view({}, 3000));
  sessions.push(opened);
  return opened;
}

afterEach(() => {
  for (const opened of sessions.splice(0)) opened.dispose();
});

describe('a detached coda (REND-200)', () => {
  it('starts the coda on a system of its own, the space above it as asked', () => {
    // Wide enough for every bar on one system: attached, the coda runs on.
    const attached = systems(session(), view({ detachedCoda: false }, 3000));
    expect(attached.systemOf.get(CODA)).toBe(attached.systemOf.get(CODA - 1));

    const near = systems(session(), view({ detachedCoda: true, codaGap: 0 }, 3000));
    const far = systems(session(), view({ detachedCoda: true, codaGap: 20 }, 3000));
    for (const laid of [near, far])
      expect(laid.systemOf.get(CODA)).toBe((laid.systemOf.get(CODA - 1) ?? 0) + 1);
    expect(gapAbove(far) - gapAbove(near)).toBeCloseTo(20 * PX_PER_MM, 0);
  });

  it('keeps the coda apart when only the width changes', () => {
    const resized = session();
    systems(resized, view({ detachedCoda: true, codaGap: 20 }, 3000));
    const narrower = systems(resized, view({ detachedCoda: true, codaGap: 20 }, 2600));
    expect(narrower.systemOf.get(CODA)).toBe((narrower.systemOf.get(CODA - 1) ?? 0) + 1);
    const fresh = systems(session(), view({ detachedCoda: true, codaGap: 20 }, 2600));
    expect(gapAbove(narrower)).toBeCloseTo(gapAbove(fresh), 0);
  });

  it('writes the coda’s sign over the start of its system, the segno’s over its barline', () => {
    const view = engraveFixture('alphatex/playback/coda-march.atex', {
      style: { ...DEFAULT_SCORE_STYLE, detachedCoda: true },
      width: 900,
    });
    const sign = (name: string) => view.marks.find(mark => mark.kind === 'glyph' && mark.name === name);
    const coda = sign('Coda');
    const codaBar = view.bars.find(bar => bar.index === CODA);
    expect(coda).toBeDefined();
    expect(codaBar?.left).toBe(0);
    // Within the system, from its start: not half out of it.
    expect(coda?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect(coda?.x ?? 99).toBeLessThan(5);
    // The segno, over bar 2's barline inside the first system, stays centred on it.
    const segno = sign('Segno');
    const segnoBar = view.bars.find(bar => bar.index === 1);
    const centre = (segno?.x ?? 0) + (segno?.width ?? 0) / 2;
    expect(Math.abs(centre - (segnoBar?.left ?? 0))).toBeLessThan(3);
  });
});
