import { describe, expect, it } from 'vitest';
import { SvgCache } from './svg-cache.ts';

describe('SvgCache', () => {
  it('stores markup and tracks its total length', () => {
    const cache = new SvgCache(100);
    cache.set('a', 'x'.repeat(10));
    cache.set('b', 'y'.repeat(20));
    expect(cache.get('a')).toBe('x'.repeat(10));
    expect(cache.length).toBe(30);
    cache.set('a', 'z'.repeat(5));
    expect(cache.length).toBe(25);
    expect(cache.count).toBe(2);
  });

  it('evicts the least recently used entries beyond the budget', () => {
    const cache = new SvgCache(30);
    cache.set('a', 'a'.repeat(10));
    cache.set('b', 'b'.repeat(10));
    cache.set('c', 'c'.repeat(10));
    // Reading "a" makes "b" the least recently used.
    cache.get('a');
    expect(cache.set('d', 'd'.repeat(10))).toEqual(['b']);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('a')).toBe(true);
    expect(cache.length).toBe(30);
  });

  it('never evicts entries that are kept (on screen) or the one just stored', () => {
    const cache = new SvgCache(25);
    cache.set('a', 'a'.repeat(10));
    cache.set('b', 'b'.repeat(10));
    const evicted = cache.set('c', 'c'.repeat(20), id => id === 'a');
    expect(evicted).toEqual(['b']);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('c')).toBe(true);
    // Over budget, but everything left is kept: nothing more can go.
    expect(cache.length).toBe(30);
    expect(cache.set('c', 'c'.repeat(20), () => true)).toEqual([]);
  });

  it('clears', () => {
    const cache = new SvgCache();
    cache.set('a', 'a');
    cache.clear();
    expect(cache.count).toBe(0);
    expect(cache.length).toBe(0);
  });
});
