/**
 * Theming of engine-rendered notation (ADR-0006).
 *
 * The engine renders each colour role with a unique near-black sentinel. The view maps every
 * sentinel to a CSS custom property, so switching themes never re-renders. Glyphs in the main
 * colour carry no fill attribute in alphaTab's SVG and inherit `fill` from the container.
 *
 * This module is alphaTab-free and safe to import on the main thread.
 */

export const SCORE_COLOR_ROLES = [
  'ink',
  'ink-secondary',
  'staff-line',
  'barline',
  'bar-number',
  'info',
] as const;
export type ScoreColorRole = (typeof SCORE_COLOR_ROLES)[number];

/** Sentinel colour per role, as alphaTab serializes it (`#RRGGBB`, upper case). */
export const SCORE_COLOR_SENTINELS: Readonly<Record<ScoreColorRole, string>> = {
  ink: '#000000',
  'ink-secondary': '#010101',
  'staff-line': '#020202',
  barline: '#030303',
  'bar-number': '#040404',
  info: '#050505',
};

/** CSS custom property that holds the themed colour of a role. */
export function scoreColorVar(role: ScoreColorRole): string {
  return `--score-${role}`;
}

/**
 * CSS that applies the theme variables to rendered SVG inside `scope` (a selector).
 * Emitted once by the view; the variables themselves are defined per theme.
 */
export function scoreThemeCss(scope: string): string {
  const rules = [`${scope} svg { fill: var(${scoreColorVar('ink')}); }`];
  for (const role of SCORE_COLOR_ROLES) {
    const sentinel = SCORE_COLOR_SENTINELS[role];
    const value = `var(${scoreColorVar(role)})`;
    rules.push(`${scope} [fill="${sentinel}"] { fill: ${value}; }`);
    rules.push(`${scope} [stroke="${sentinel}"] { stroke: ${value}; }`);
  }
  return rules.join('\n');
}

/**
 * Replaces sentinel colours in SVG markup with concrete colours, for exports and print where
 * CSS variables are not available. Glyphs without a fill attribute inherit the root's fill,
 * which is set to the ink colour.
 */
export function resolveScoreColors(svg: string, palette: Readonly<Record<ScoreColorRole, string>>): string {
  let result = svg;
  for (const role of SCORE_COLOR_ROLES) {
    const sentinel = SCORE_COLOR_SENTINELS[role];
    result = result.replaceAll(`"${sentinel}"`, `"${palette[role]}"`);
  }
  return result.replace(/<svg\b(?![^>]*\sfill=)/, `<svg fill="${palette.ink}"`);
}
