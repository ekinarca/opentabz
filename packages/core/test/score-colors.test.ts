import { describe, expect, it } from 'vitest';
import {
  resolveScoreColors,
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
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#020202"/><path stroke="#000000"/></svg>';
    const resolved = resolveScoreColors(svg, palette);
    expect(resolved).toBe(
      '<svg fill="#111111" xmlns="http://www.w3.org/2000/svg"><rect fill="#999999"/><path stroke="#111111"/></svg>',
    );
  });
});
