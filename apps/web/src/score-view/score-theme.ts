/**
 * Installs the CSS that maps the engine's sentinel colours to theme variables (ADR-0006) and the
 * SMuFL music font. Idempotent.
 */
import { scoreThemeCss } from '@opentabz/core/shared';
import bravuraWoff2 from '@coderline/alphatab/font/Bravura.woff2?url';
import bravuraWoff from '@coderline/alphatab/font/Bravura.woff?url';

const STYLE_ID = 'ot-score-theme';
let musicFont: FontFace | null = null;

export function installScoreTheme(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = scoreThemeCss('.ot-partial');
  document.head.append(style);
}

/**
 * Starts downloading the music font so the first score paints without waiting for it. Resolves
 * when the font is ready (or immediately if loading fails; glyphs then use the fallback).
 */
export function loadMusicFont(): Promise<void> {
  if (musicFont === null) {
    musicFont = new FontFace(
      'Bravura',
      `url(${bravuraWoff2}) format('woff2'), url(${bravuraWoff}) format('woff')`,
      {
        display: 'block',
      },
    );
    document.fonts.add(musicFont);
  }
  return musicFont.load().then(
    () => undefined,
    () => undefined,
  );
}
