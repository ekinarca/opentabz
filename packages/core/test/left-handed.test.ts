/**
 * Chord diagrams for left-handed players (REND-314): mirrored, the highest string on the left, as
 * a left-handed player looks down at the neck: the open and muted strings' marks, the dots and the
 * barres change sides, above the music and above the beats; the rest is engraved as before.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE } from '../src/shared/style.ts';
import type { PartialKind, ViewOptions } from '../src/shared/view.ts';
import { engraveTex, GUITAR, type Engraving } from './engraving.ts';

/** A7 (x 0 2 0 2 0 from the lowest string) and Bm, barred at the second fret (x 2 4 4 3 2). */
const CHORDS = ['A7', 'Bm'];
const TEX = [
  GUITAR,
  '\\chord ("A7" 0 2 0 2 0 x)',
  '\\chord {barre 2} ("Bm" 2 3 4 4 2 x)',
  // A bar each, so that the diagrams above the beats lie well apart.
  ':1 (0.5 2.4 0.3 2.2 0.1){ch "A7"} | (2.5 4.4 4.3 3.2 2.1){ch "Bm"} |',
].join('\n');

/** Room for a string's line being drawn from its left edge, as alphaTab draws the open strings. */
const LINE = 1.5;

/** Diagrams above the beats as well as above the music. */
const IN_SCORE: Partial<ViewOptions> = { style: { ...DEFAULT_SCORE_STYLE, chordDiagramsInScore: true } };

interface DiagramMark {
  readonly chord: string;
  readonly name: string;
  /** From the centre of its diagram, across. */
  readonly across: number;
  readonly row: number;
}

/** The chord names of the diagrams in a part of the page: where each diagram's centre is. */
function centres(view: Engraving, partial: PartialKind) {
  return view.marks
    .filter(mark => mark.partial === partial && mark.kind === 'text' && CHORDS.includes(mark.name))
    .map(mark => ({ chord: mark.name, x: mark.x + mark.width / 2, y: mark.y }));
}

/** The marks of the chord diagrams in a part of the page, each by the diagram it belongs to. */
function diagramMarks(view: Engraving, partial: PartialKind): DiagramMark[] {
  const diagrams = centres(view, partial);
  return view.marks
    .filter(mark => mark.partial === partial && mark.kind === 'glyph' && mark.name.startsWith('Fretboard'))
    .map(mark => {
      const x = mark.x + mark.width / 2;
      const diagram = diagrams.reduce((best, candidate) =>
        Math.abs(candidate.x - x) + Math.abs(candidate.y - mark.y) <
        Math.abs(best.x - x) + Math.abs(best.y - mark.y)
          ? candidate
          : best,
      );
      return {
        chord: diagram.chord,
        name: mark.name,
        across: x - diagram.x,
        row: Math.round(mark.y - diagram.y),
      };
    });
}

/** Whether every mark of `right` has its mirror image in `left`: as far across, the other way. */
function mirrored(right: readonly DiagramMark[], left: readonly DiagramMark[]): boolean {
  return (
    left.length === right.length &&
    right.every(mark =>
      left.some(
        other =>
          other.chord === mark.chord &&
          other.name === mark.name &&
          other.row === mark.row &&
          Math.abs(other.across + mark.across) <= LINE,
      ),
    )
  );
}

/** The barre of the Bm diagram in a part of the page, from the diagram's centre across. */
function barre(view: Engraving, partial: PartialKind) {
  const bm = centres(view, partial).find(diagram => diagram.chord === 'Bm');
  // As high as a dot and wider than a string: no string line (one wide), fret or nut (thin).
  const bar = view.marks.find(
    mark =>
      mark.partial === partial &&
      mark.kind === 'rect' &&
      mark.height > 4 &&
      mark.width > 2 &&
      bm !== undefined &&
      Math.abs(mark.x + mark.width / 2 - bm.x) < 30,
  );
  if (bm === undefined || bar === undefined) throw new Error('No barre was drawn.');
  return { from: bar.x - bm.x, to: bar.x + bar.width - bm.x };
}

describe('chord diagrams for left-handed players (REND-314)', () => {
  it('mirrors the diagrams above the music: open and muted strings, dots change sides', () => {
    const right = diagramMarks(engraveTex(TEX), 'header');
    const left = diagramMarks(engraveTex(TEX, { leftHanded: true }), 'header');
    // Both diagrams' marks: A7's muted, open and held strings, Bm's muted and held ones.
    expect(right.filter(mark => mark.chord === 'A7')).toHaveLength(6);
    expect(right.filter(mark => mark.chord === 'Bm')).toHaveLength(6);
    expect(mirrored(right, left)).toBe(true);
    // Not symmetric diagrams: the marks did move.
    expect(left.map(mark => mark.across)).not.toEqual(right.map(mark => mark.across));
    // A7's muted lowest string: on the left for right-handed players, on the right when mirrored.
    const muted = (marks: readonly DiagramMark[]) =>
      marks.find(mark => mark.chord === 'A7' && mark.name === 'FretboardX')?.across ?? 0;
    expect(muted(right)).toBeLessThan(-20);
    expect(muted(left)).toBeGreaterThan(20);
  });

  it('draws the barre across the strings it holds, on the other side', () => {
    const right = barre(engraveTex(TEX), 'header');
    const left = barre(engraveTex(TEX, { leftHanded: true }), 'header');
    // From the fifth string to the first: right of centre for right-handed players.
    expect(right.to).toBeGreaterThan(20);
    expect(Math.abs(left.from + right.to)).toBeLessThanOrEqual(LINE);
    expect(Math.abs(left.to + right.from)).toBeLessThanOrEqual(LINE);
  });

  it('mirrors the diagrams above their beats too', () => {
    const right = diagramMarks(engraveTex(TEX, IN_SCORE), 'system');
    const left = diagramMarks(engraveTex(TEX, { ...IN_SCORE, leftHanded: true }), 'system');
    expect(right.length).toBe(12);
    expect(mirrored(right, left)).toBe(true);
    expect(left.map(mark => mark.across)).not.toEqual(right.map(mark => mark.across));
  });

  it('engraves the rest of the score as before', () => {
    const others = (view: Engraving) =>
      view.marks
        .filter(mark => !mark.name.startsWith('Fretboard') && mark.partial === 'system')
        .map(mark => `${mark.kind}:${mark.name}:${mark.x.toFixed(2)}:${mark.y.toFixed(2)}`);
    const right = others(engraveTex(TEX));
    expect(right.length).toBeGreaterThan(20);
    expect(others(engraveTex(TEX, { leftHanded: true }))).toEqual(right);
  });
});
