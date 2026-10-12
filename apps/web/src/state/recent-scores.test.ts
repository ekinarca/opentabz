import { describe, expect, it } from 'vitest';
import { isRecentScore, keptRecent, type RecentScore } from './recent-scores.ts';

function score(name: string, openedAt: number, size = 1000): RecentScore {
  return { fingerprint: name, name: `${name}.gp`, title: name, artist: '', openedAt, size };
}

describe('the scores kept to open again (LIB-005)', () => {
  it('keeps the latest first, as many as fit', () => {
    const scores = [score('a', 1), score('b', 3), score('c', 2)];
    expect(keptRecent(scores, 2).keep.map(entry => entry.title)).toEqual(['b', 'c']);
    expect(keptRecent(scores, 2).drop.map(entry => entry.title)).toEqual(['a']);
  });

  it('keeps within a size: an older small score may stay where a big one does not', () => {
    const scores = [score('new', 3, 600), score('big', 2, 600), score('small', 1, 300)];
    const { keep, drop } = keptRecent(scores, 10, 1000);
    expect(keep.map(entry => entry.title)).toEqual(['new', 'small']);
    expect(drop.map(entry => entry.title)).toEqual(['big']);
  });

  it('reads back only whole records', () => {
    expect(isRecentScore(score('a', 1))).toBe(true);
    expect(isRecentScore({ ...score('a', 1), size: '1' })).toBe(false);
    expect(isRecentScore(null)).toBe(false);
  });
});
