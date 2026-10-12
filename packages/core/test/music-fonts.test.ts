/**
 * Music fonts in the engine (REND-241): Petaluma's SMuFL metadata registered, a view engraved in
 * it is laid out with Petaluma's metrics; a font the engine does not know is engraved as Bravura;
 * files that are not SMuFL metadata are refused; thicker staff lines go with any font.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it, vi } from 'vitest';
import {
  engravingFor,
  isRegisteredMusicFont,
  MusicFontError,
  registerMusicFont,
} from '../src/render/music-fonts.ts';
import { isMusicFontId, isSmuflMetadata, musicFontFamily } from '../src/shared/music-font.ts';
import { DEFAULT_SCORE_STYLE } from '../src/shared/style.ts';
import { engraveTex, type Engraving } from './engraving.ts';

const require = createRequire(import.meta.url);
const petaluma = JSON.parse(
  readFileSync(
    join(dirname(require.resolve('@vexflow-fonts/petaluma/package.json')), 'metadata.json'),
    'utf8',
  ),
) as unknown;

const TEX = ':8 0.6 2.6 3.6 2.6 0.5 2.5 3.5 2.5 | :4 0.4 2.4 3.4 r |';

/** Where the noteheads of a view sit, left to right. */
function heads(view: Engraving): number[] {
  return view.marks
    .filter(mark => mark.kind === 'glyph' && mark.name.startsWith('Notehead'))
    .map(mark => Math.round(mark.x * 100) / 100);
}

describe('music fonts in the engine (REND-241)', () => {
  it('knows the built-in fonts and one’s own by id, and their families', () => {
    expect(isMusicFontId('bravura')).toBe(true);
    expect(isMusicFontId('petaluma')).toBe(true);
    expect(isMusicFontId(`own:${'ab'.repeat(16)}`)).toBe(true);
    expect(isMusicFontId('own:xyz')).toBe(false);
    expect(isMusicFontId('comic')).toBe(false);
    expect(musicFontFamily('petaluma')).toBe('Petaluma');
    expect(musicFontFamily(`own:${'ab'.repeat(16)}`)).toBe('OpenTabz music abababababab');
    expect(isSmuflMetadata(petaluma)).toBe(true);
    expect(isSmuflMetadata({ fontName: 'x' })).toBe(false);
  });

  it('engraves with a registered font’s metrics, and as Bravura before it is registered', () => {
    const style = { ...DEFAULT_SCORE_STYLE, musicFont: 'petaluma' };
    const bravura = heads(engraveTex(TEX));
    expect(bravura.length).toBeGreaterThan(8);
    // Not known yet: Bravura's.
    expect(isRegisteredMusicFont('petaluma')).toBe(false);
    expect(heads(engraveTex(TEX, { style }))).toEqual(bravura);

    registerMusicFont('petaluma', petaluma);
    expect(isRegisteredMusicFont('petaluma')).toBe(true);
    const written = heads(engraveTex(TEX, { style }));
    expect(written).toHaveLength(bravura.length);
    expect(written).not.toEqual(bravura);
    // Views in Bravura are left as they were.
    expect(heads(engraveTex(TEX))).toEqual(bravura);
    expect(alphaTab.EngravingSettings.bravuraDefaults.musicFontSize).toBe(36);
  });

  it('engraves what a font lacks with Bravura’s metrics, quietly', () => {
    registerMusicFont('petaluma', petaluma);
    const warn = vi.spyOn(console, 'warn');
    try {
      const engraving = engravingFor('petaluma');
      // Petaluma has no chord-diagram dot: Bravura's stands in, at Bravura's size.
      const dot = alphaTab.model.MusicFontSymbol.FretboardFilledCircle;
      expect(engraving?.glyphWidths.get(dot)).toBe(
        alphaTab.EngravingSettings.bravuraDefaults.glyphWidths.get(dot),
      );
      const chords = engraveTex(
        [
          '\\track "Guitar"',
          '\\staff {score tabs}',
          '\\tuning (E4 B3 G3 D3 A2 E2)',
          '\\chord ("E" 0 0 1 2 2 0)',
          ':4 (0.6 2.5 2.4 1.3 0.2 0.1){ch "E"} 0.6 0.6 0.6 |',
        ].join('\n'),
        { style: { ...DEFAULT_SCORE_STYLE, musicFont: 'petaluma' } },
      );
      // The diagram's dots are drawn, Bravura's.
      expect(chords.marks.some(mark => mark.name === 'FretboardFilledCircle')).toBe(true);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('refuses files that are not SMuFL metadata, and Bravura’s id', () => {
    expect(() => {
      registerMusicFont('own:0123456789abcdef', { glyphs: [] });
    }).toThrow(MusicFontError);
    expect(() => {
      registerMusicFont('bravura', petaluma);
    }).toThrow(MusicFontError);
  });

  it('draws any font’s staff lines thicker on request', () => {
    registerMusicFont('petaluma', petaluma);
    const own = engravingFor('petaluma');
    const thick = engravingFor('petaluma', 2);
    expect(own).not.toBeNull();
    expect(thick?.staffLineThickness).toBeCloseTo((own?.staffLineThickness ?? 0) * 2, 5);
    expect(engravingFor('bravura')).toBeNull();
    expect(engravingFor('own:fedcba9876543210')).toBeNull();
    expect(engravingFor('bravura', 2)?.staffLineThickness).toBeCloseTo(
      alphaTab.EngravingSettings.bravuraDefaults.staffLineThickness * 2,
      5,
    );
  });
});
