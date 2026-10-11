import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { collectScoreOverview } from '../src/playback/score-overview.ts';
import { playsIn } from '../src/shared/overview.ts';
import { readFixture } from './helpers.ts';

function overviewOf(path: string) {
  return collectScoreOverview(openScore(readFixture(path), path.split('/').at(-1) ?? path).score);
}

/** A track's bars as a string: "x" where it plays, "." where it rests. */
function row(overview: ReturnType<typeof overviewOf>, track: number): string {
  return Array.from({ length: overview.barCount }, (_, bar) =>
    playsIn(overview, track, bar) ? 'x' : '.',
  ).join('');
}

describe('the song overview (VIEW-015)', () => {
  it('marks the bars each track plays in, track by track', () => {
    const overview = overviewOf('alphatex/demos/twelve-bar-shuffle.atex');
    expect(overview.trackCount).toBe(4);
    expect(overview.barCount).toBe(13);
    expect(overview.played).toHaveLength(4 * 13);
    expect(row(overview, 0)).toBe('xxxxxxxxxxxxx');
    // The lead guitar comes in after a bar's rest.
    expect(row(overview, 1)).toBe('.xxxxxxxxxxxx');
    expect(row(overview, 2)).toBe('xxxxxxxxxxxxx');
    expect(row(overview, 3)).toBe('xxxxxxxxxxxxx');
  });

  it('counts every staff of a track, and a bar of rests as empty', () => {
    const overview = overviewOf('alphatex/views/keyboard.atex');
    // The piano plays on two staves; the flute rests in the second bar.
    expect(row(overview, 0)).toBe('xx');
    expect(row(overview, 1)).toBe('x.');
    expect(row(overview, 2)).toBe('xx');
  });
});
