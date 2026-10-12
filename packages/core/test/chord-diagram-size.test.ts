/**
 * Chord diagrams at the size and spacing asked (REND-227), above the music and above their beats,
 * and kept at their size, with the text, when the whole score is scaled (REND-223).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveTex, GUITAR, type Engraving, type Mark } from './engraving.ts';

/** Three chords on three eighths in a row: close together. */
const TEX = [
  GUITAR,
  '\\chord ("A7" 0 2 0 2 0 x)',
  '\\chord ("D7" 2 1 2 0 x x)',
  '\\chord ("E7" 0 0 1 0 2 0)',
  ':8 (0.5 2.4 0.3 2.2 0.1){ch "A7"} (0.4 2.3 1.2 2.1){ch "D7"} (0.6 2.5 0.4 1.3 0.2 0.1){ch "E7"} r r r r r |',
].join('\n');

function engrave(style: Partial<ScoreStyle> = {}): Engraving {
  return engraveTex(TEX, { style: { ...DEFAULT_SCORE_STYLE, ...style } });
}

const inPart = (view: Engraving, partial: Mark['partial']) =>
  view.marks.filter(mark => mark.partial === partial);

/** The space between two strings of the diagrams above the music. */
function stringSpacing(view: Engraving): number {
  const lines = inPart(view, 'header')
    .filter(mark => mark.kind === 'rect' && mark.width <= 3 && mark.height > 25)
    .map(mark => mark.x)
    .sort((a, b) => a - b);
  return Math.min(...lines.slice(1).map((x, index) => x - (lines[index] ?? 0)));
}

/** Where the diagrams are, by their names' centres, in a part of the page. */
function centres(view: Engraving, partial: Mark['partial']): number[] {
  return inPart(view, partial)
    .filter(mark => mark.kind === 'text' && /^[ADE]7$/.test(mark.name))
    .map(mark => mark.x + mark.width / 2);
}

/** The smallest distance between two diagrams next to each other. */
function closest(view: Engraving, partial: Mark['partial']): number {
  const at = centres(view, partial);
  expect(at).toHaveLength(3);
  return Math.min(...at.slice(1).map((x, index) => x - (at[index] ?? 0)));
}

function widths(marks: readonly Mark[], name: string): number[] {
  return marks.filter(mark => mark.name === name).map(mark => mark.width);
}

describe('chord diagrams at the size and spacing asked (REND-227)', () => {
  it('draws the diagrams above the music at their size: strings, dots and numbers', () => {
    const usual = engrave();
    const large = engrave({ chordDiagramsOnTopSize: 1.5 });
    expect(stringSpacing(large)).toBeCloseTo(stringSpacing(usual) * 1.5, 1);
    const [dot = 0] = widths(inPart(usual, 'header'), 'FretboardFilledCircle');
    expect(widths(inPart(large, 'header'), 'FretboardFilledCircle')[0]).toBeCloseTo(dot * 1.5, 1);
    const fret = (view: Engraving) =>
      inPart(view, 'header').find(mark => mark.kind === 'text' && mark.name === '2')?.height ?? 0;
    expect(fret(large)).toBeCloseTo(fret(usual) * 1.5, 1);
  });

  it('spaces the diagrams above the music as asked, touching at none', () => {
    const touching = closest(engrave({ chordDiagramsOnTopSpacing: 0 }), 'header');
    const usual = closest(engrave(), 'header');
    const twice = closest(engrave({ chordDiagramsOnTopSpacing: 2 }), 'header');
    expect(usual).toBeGreaterThan(touching);
    expect(twice - usual).toBeCloseTo(usual - touching, 1);
  });

  it('draws the diagrams above their beats at their size, the others as they were', () => {
    const usual = engrave({ chordDiagramsInScore: true });
    const large = engrave({ chordDiagramsInScore: true, chordDiagramsInScoreSize: 1.5 });
    const [dot = 0] = widths(inPart(usual, 'system'), 'FretboardFilledCircle');
    expect(dot).toBeGreaterThan(0);
    expect(widths(inPart(large, 'system'), 'FretboardFilledCircle')[0]).toBeCloseTo(dot * 1.5, 1);
    expect(stringSpacing(large)).toBeCloseTo(stringSpacing(usual), 3);
  });

  it('keeps the diagrams of beats close together apart, as far as asked', () => {
    // A diagram's width: how far apart the diagrams above the music are when they touch.
    const width = closest(engrave({ chordDiagramsOnTopSpacing: 0 }), 'header');
    const at = (spacing: number) =>
      closest(engrave({ chordDiagramsInScore: true, chordDiagramsInScoreSpacing: spacing }), 'system');
    // Without room of their own they overlap, as alphaTab draws them.
    expect(at(0)).toBeLessThan(width);
    expect(at(1)).toBeGreaterThanOrEqual(width);
    expect(at(2)).toBeGreaterThanOrEqual(2 * width);
  });
});

describe('chord diagrams kept at their size when the score is scaled (REND-223)', () => {
  it('scales the diagrams with the music, or keeps them with the text', () => {
    const usual = engrave();
    const scaled = engrave({ scale: 0.7 });
    const kept = engrave({ scale: 0.7, keepTextSize: true });
    expect(stringSpacing(scaled)).toBeCloseTo(stringSpacing(usual) * 0.7, 1);
    expect(stringSpacing(kept)).toBeCloseTo(stringSpacing(usual), 1);
    const [dot = 0] = widths(inPart(usual, 'header'), 'FretboardFilledCircle');
    expect(widths(inPart(kept, 'header'), 'FretboardFilledCircle')[0]).toBeCloseTo(dot, 1);
    // The diagrams' numbers keep their size once, not twice.
    const fret = (view: Engraving) =>
      inPart(view, 'header').find(mark => mark.kind === 'text' && mark.name === '2')?.height ?? 0;
    expect(fret(kept)).toBeCloseTo(fret(usual), 1);
    // The music is smaller either way.
    const end = (view: Engraving) => Math.max(...view.bars.map(bar => bar.right));
    expect(end(kept)).toBeLessThan(end(usual) * 0.8);
  });
});
