import { cx } from '../cx.ts';

/*
 * The OpenTabz logo.
 *
 * Mark — "the open string": one tablature string with a 0 on it. In tab, 0 means "play this string
 * open", the first thing every guitarist learns to read, and it is the O of OpenTabz. The string is
 * interrupted around the numeral exactly as engraved tablature does it, and runs off both edges of
 * the tile like a string seen through a window. The tile is also the favicon and app icon, so it
 * keeps its colours in every theme.
 *
 * Wordmark — "OpenTabz" set in Instrument Sans SemiBold (SIL OFL 1.1) with -0.02 em tracking and the
 * font's kerning, converted to outlines so it renders identically everywhere and never waits for a
 * font to load.
 */

/** Brand colours of the tile: they never follow the theme. */
const TILE = { background: '#161519', string: '#f3eee6', zero: '#ff7a2f' } as const;

/** 32 × 32 grid. The zero is its outer contour followed by the counter, wound the other way. */
const MARK_ZERO =
  'M21.456 16C21.456 21.892 19.928 24.184 16 24.184C12.072 24.184 10.544 21.892 10.544 16C10.544 10.108 12.072 7.816 16 7.816C19.928 7.816 21.456 10.108 21.456 16ZM18.948 16C18.948 11.657 18.064 9.796 16 9.796C13.936 9.796 13.052 11.657 13.052 16C13.052 20.343 13.936 22.204 16 22.204C18.064 22.204 18.948 20.343 18.948 16Z';
const MARK_STRING = 'M0 15.2H9.19V16.8H0ZM22.81 15.2H32V16.8H22.81Z';

/** Cap height spans y = 0…100; the view box pads it symmetrically so the caps sit on the centre. */
const WORDMARK_VIEWBOX = { x: 5.14, y: -28.5, width: 623.06, height: 157 } as const;
const WORDMARK_PATH =
  'M55 101Q44 101 35 98Q26 94 19 87Q13 80 9 70Q5 61 5 50Q5 34 12 23Q18 12 29 5Q41 -1 55 -1Q70 -1 81 5Q92 12 99 23Q105 35 105 50Q105 61 101 71Q98 80 91 87Q84 94 75 98Q66 101 55 101ZM55 87Q64 87 72 82Q79 77 83 69Q87 60 87 49Q87 39 83 30Q79 22 72 18Q65 13 55 13Q46 13 38 18Q31 22 27 30Q23 38 23 49Q23 61 27 69Q31 77 39 82Q46 87 55 87ZM157 101Q147 101 141 97Q134 92 133 83L134 83L134 128L117 128L117 29L134 29L134 45L133 45Q134 37 141 32Q148 28 158 28Q168 28 175 32Q182 37 186 45Q190 53 190 64Q190 76 186 84Q182 92 174 97Q167 101 157 101ZM153 87Q161 87 166 81Q171 75 171 64Q171 54 166 48Q161 42 153 42Q144 42 139 48Q134 54 134 65Q134 75 139 81Q144 87 153 87ZM233 101Q222 101 213 97Q205 92 200 84Q196 75 196 64Q196 54 200 45Q205 37 213 32Q222 28 233 28Q243 28 251 32Q259 37 263 44Q268 52 268 63Q268 65 267 67Q267 68 267 70L207 70L207 58L253 58L250 61Q250 51 245 46Q241 41 233 41Q224 41 218 47Q213 53 213 65Q213 76 218 82Q224 88 233 88Q239 88 243 86Q247 84 249 80L266 80Q262 90 254 96Q246 101 233 101ZM278 100L278 29L295 29L295 46L295 46L295 100ZM328 100L328 55Q328 49 324 45Q321 42 314 42Q309 42 305 45Q300 47 298 52Q295 56 295 62L293 45Q297 37 304 32Q311 28 321 28Q332 28 339 34Q345 41 345 52L345 100ZM372 100L372 14L339 14L339 0L423 0L423 14L390 14L390 100ZM461 100Q461 97 460 94Q460 91 460 86L459 86L459 52Q459 47 456 44Q453 41 447 41Q440 41 437 43Q433 46 432 50L415 50Q417 40 425 34Q433 28 447 28Q462 28 469 34Q477 41 477 54L477 86Q477 89 477 93Q478 96 479 100ZM437 101Q426 101 420 96Q413 91 413 82Q413 72 420 66Q428 61 440 59L463 55L463 66L443 69Q437 70 434 73Q431 75 431 80Q431 84 434 86Q437 88 442 88Q449 88 454 84Q459 81 459 75L461 86Q458 93 452 97Q446 101 437 101ZM532 101Q522 101 516 97Q509 92 508 83L509 83L509 100L492 100L492 0L509 0L509 45L508 45Q510 37 517 32Q523 28 533 28Q543 28 550 32Q557 37 561 45Q565 53 565 64Q565 76 561 84Q557 92 549 97Q542 101 532 101ZM528 87Q536 87 541 81Q546 75 546 64Q546 54 541 48Q536 42 528 42Q519 42 514 48Q509 54 509 65Q509 75 514 81Q519 87 528 87ZM569 100L569 88L610 36L614 43L571 43L571 29L627 29L627 42L587 92L583 86L628 86L628 100Z';

export interface LogoMarkProps {
  /** Rendered width and height in CSS pixels. */
  readonly size?: number;
  /** Accessible name. Without it the mark is decorative (`aria-hidden`). */
  readonly title?: string;
  readonly className?: string;
}

export function LogoMark({ size = 28, title, className }: LogoMarkProps) {
  const labelled = title !== undefined;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cx('shrink-0', className)}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      {labelled && <title>{title}</title>}
      <rect width="32" height="32" rx="7.5" fill={TILE.background} />
      {/* A hairline edge keeps the tile distinct on dark backgrounds. */}
      <rect
        x="0.375"
        y="0.375"
        width="31.25"
        height="31.25"
        rx="7.125"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.12"
        strokeWidth="0.75"
      />
      <path d={MARK_STRING} fill={TILE.string} />
      <path d={MARK_ZERO} fill={TILE.zero} />
    </svg>
  );
}

export interface WordmarkProps {
  /** Rendered height in CSS pixels; the width follows the wordmark's proportions. */
  readonly height?: number;
  /** Accessible name. Without it the wordmark is decorative (`aria-hidden`). */
  readonly title?: string;
  readonly className?: string;
}

export function Wordmark({ height = 20, title, className }: WordmarkProps) {
  const labelled = title !== undefined;
  const { x, y, width, height: boxHeight } = WORDMARK_VIEWBOX;
  return (
    <svg
      height={height}
      width={Math.round((height * width) / boxHeight)}
      viewBox={`${x} ${y} ${width} ${boxHeight}`}
      className={cx('shrink-0', className)}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      {labelled && <title>{title}</title>}
      <path d={WORDMARK_PATH} fill="currentColor" />
    </svg>
  );
}
