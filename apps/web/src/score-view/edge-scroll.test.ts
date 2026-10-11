import { describe, expect, it } from 'vitest';
import { EDGE_MAX_SPEED, EDGE_ZONE, edgeVelocity } from './edge-scroll.ts';

describe('edge auto-scroll', () => {
  it('stays still away from the edges', () => {
    expect(edgeVelocity(500, 0, 1000)).toBe(0);
    expect(edgeVelocity(EDGE_ZONE, 0, 1000)).toBe(0);
    expect(edgeVelocity(1000 - EDGE_ZONE, 0, 1000)).toBe(0);
  });

  it('speeds up towards an edge and caps beyond it', () => {
    const near = edgeVelocity(1000 - EDGE_ZONE / 2, 0, 1000);
    const at = edgeVelocity(1000, 0, 1000);
    expect(near).toBeGreaterThan(0);
    expect(at).toBe(EDGE_MAX_SPEED);
    expect(edgeVelocity(1400, 0, 1000)).toBe(EDGE_MAX_SPEED);
    expect(near).toBeLessThan(at);
    expect(edgeVelocity(EDGE_ZONE / 2, 0, 1000)).toBe(-near);
    expect(edgeVelocity(-200, 0, 1000)).toBe(-EDGE_MAX_SPEED);
  });

  it('shrinks the zone in small boxes so the middle never scrolls', () => {
    expect(edgeVelocity(50, 0, 100)).toBe(0);
    expect(edgeVelocity(10, 0, 100)).toBeLessThan(0);
    expect(edgeVelocity(5, 0, 0)).toBe(0);
  });
});
