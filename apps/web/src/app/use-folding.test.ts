import { describe, expect, it } from 'vitest';
import { foldedCount } from './use-folding.ts';

describe('a toolbar that folds (UX-029)', () => {
  it('keeps every tool when all fit, and leaves a slot for "more" when some do not', () => {
    expect(foldedCount(400, 40, 10)).toBe(10);
    expect(foldedCount(399, 40, 10)).toBe(8);
    expect(foldedCount(120, 40, 10)).toBe(2);
    expect(foldedCount(30, 40, 10)).toBe(0);
    expect(foldedCount(-50, 40, 10)).toBe(0);
  });
});
