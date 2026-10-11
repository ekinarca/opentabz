import { describe, expect, it } from 'vitest';
import {
  PRINT_PALETTE,
  resolveScoreColor,
  SCORE_COLOR_ROLES,
  SCORE_COLOR_SENTINELS,
  scoreThemeCss,
} from '../src/shared/score-colors.ts';

describe('score colour theming', () => {
  it('uses unique sentinels per role', () => {
    const values = SCORE_COLOR_ROLES.map(role => SCORE_COLOR_SENTINELS[role]);
    expect(new Set(values).size).toBe(values.length);
    for (const value of values) expect(value).toMatch(/^#[0-9]{6}$/);
  });

  it('emits fill and stroke rules for every role', () => {
    const css = scoreThemeCss('.ot-score');
    for (const role of SCORE_COLOR_ROLES) {
      expect(css).toContain(
        `.ot-score [fill="${SCORE_COLOR_SENTINELS[role]}"] { fill: var(--score-${role}); }`,
      );
      expect(css).toContain(
        `.ot-score [stroke="${SCORE_COLOR_SENTINELS[role]}"] { stroke: var(--score-${role}); }`,
      );
    }
    expect(css).toContain('.ot-score svg { fill: var(--score-ink); }');
  });

  it('resolves sentinels to concrete colours for export', () => {
    const palette = {
      ink: '#111111',
      'ink-secondary': '#777777',
      'staff-line': '#999999',
      barline: '#222222',
      'bar-number': '#aa0000',
      info: '#333333',
    };
    expect(resolveScoreColor('#020202', palette)).toBe('#999999');
    expect(resolveScoreColor('#000000', palette)).toBe('#111111');
    // No colour: drawn in the main colour.
    expect(resolveScoreColor(null, palette)).toBe('#111111');
    // Colours from the file are kept.
    expect(resolveScoreColor('#FF0000', palette)).toBe('#FF0000');
    expect(resolveScoreColor('rgba(255,0,0,0.5)', palette)).toBe('rgba(255,0,0,0.5)');
  });

  it('prints black on white', () => {
    for (const role of SCORE_COLOR_ROLES) expect(PRINT_PALETTE[role]).toMatch(/^#[0-9A-F]{6}$/);
    expect(PRINT_PALETTE.ink).toBe('#000000');
  });
});
