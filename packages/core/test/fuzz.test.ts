import { describe, expect, it } from 'vitest';
import { OpenFailure, openScore } from '../src/open/open.ts';
import { OPEN_ERROR_CODES } from '../src/shared/open-error.ts';
import { readFixture } from './helpers.ts';

/** Deterministic xorshift PRNG so failures are reproducible. */
function random(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

const SOURCES = [
  'alphatab/guitarpro3/effects.gp3',
  'alphatab/guitarpro4/effects.gp4',
  'alphatab/guitarpro5/effects.gp5',
  'alphatab/guitarpro6/effects.gpx',
  'alphatab/guitarpro7/effects.gp',
  'alphatab/guitarpro8/directions.gp',
  'musicxml-testsuite/23d-Tuplets-Nested.xml',
];

/**
 * Every mutated input must produce either a score or a typed OpenFailure — never an untyped
 * exception — and must finish quickly (no hang).
 */
describe('open pipeline fuzzing', () => {
  for (const source of SOURCES) {
    it(`survives truncations and bit flips of ${source}`, () => {
      const original = readFixture(source);
      const next = random(source.length * 7919);
      const outcomes = { opened: 0, failed: 0 };
      for (let iteration = 0; iteration < 60; iteration++) {
        let bytes: Uint8Array;
        if (iteration % 3 === 0) {
          bytes = original.slice(0, Math.floor(next() * original.length));
        } else {
          bytes = original.slice();
          const flips = 1 + Math.floor(next() * 16);
          for (let i = 0; i < flips; i++) {
            const index = Math.floor(next() * bytes.length);
            bytes[index] = (bytes[index] ?? 0) ^ (1 << Math.floor(next() * 8));
          }
        }
        const started = performance.now();
        try {
          openScore(bytes, 'fuzz');
          outcomes.opened++;
        } catch (error) {
          if (!(error instanceof OpenFailure)) {
            throw new Error(`iteration ${iteration} of ${source} threw an untyped error: ${String(error)}`);
          }
          expect(OPEN_ERROR_CODES).toContain(error.error.code);
          expect(error.error.detail.length).toBeGreaterThan(0);
          outcomes.failed++;
        }
        expect(performance.now() - started, `iteration ${iteration} took too long`).toBeLessThan(2000);
      }
      expect(outcomes.opened + outcomes.failed).toBe(60);
    });
  }
});
