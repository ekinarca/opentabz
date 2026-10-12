/**
 * Slash notation as the stylesheet asks (REND-229): the line behind the slashes or none, its plain
 * barlines or none (the closing barline stays), and a single note's fret and string under its
 * slash.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveTex, type Engraving, type Mark } from './engraving.ts';

/** Two chords, a G-string 5 and a B-string 7; then a chord and a rest. */
const TEX = [
  '\\track "Guitar"',
  '\\staff {slash}',
  '\\tuning (E4 B3 G3 D3 A2 E2)',
  ':4 (0.6 2.5 2.4) (0.6 2.5 2.4) 5.3 7.2 | (0.6 2.5 2.4).2 r |',
].join('\n');

function engrave(style: Partial<ScoreStyle> = {}): Engraving {
  return engraveTex(TEX, { style: { ...DEFAULT_SCORE_STYLE, ...style } });
}

const system = (view: Engraving): Mark[] => view.marks.filter(mark => mark.partial === 'system');
/** The line: long and thin. */
const lines = (view: Engraving) =>
  system(view).filter(mark => mark.kind === 'rect' && mark.width > 100 && mark.height < 3);
/** Barlines: as tall as the staff. */
const barlines = (view: Engraving) =>
  system(view).filter(mark => mark.kind === 'rect' && mark.height > 30 && mark.height < 45);

describe('slash notation as the stylesheet asks (REND-229)', () => {
  it('draws the line behind the slashes, or none', () => {
    expect(lines(engrave()).length).toBeGreaterThan(0);
    expect(lines(engrave({ slashStaffLines: false }))).toEqual([]);
  });

  it('draws the plain barlines, or leaves them out but the closing one', () => {
    const usual = barlines(engrave());
    const plain = barlines(engrave({ slashBarLines: false }));
    expect(plain.length).toBeGreaterThan(0);
    expect(plain.length).toBeLessThan(usual.length);
    // What is left closes the piece: the last barlines, a thin and a thick one.
    const last = Math.max(...usual.map(bar => bar.x));
    expect(plain.every(bar => bar.x > last - 10)).toBe(true);
  });

  it('writes a single note’s fret and its string, circled, under its slash', () => {
    const written = system(engrave({ slashSingleNoteFrets: true }));
    const slash = written.find(mark => mark.name === 'NoteheadSlashHorizontalEnds');
    const frets = written.filter(mark => mark.kind === 'text' && (mark.name === '5' || mark.name === '7'));
    expect(frets.map(fret => fret.name)).toEqual(['5', '7']);
    for (const fret of frets) expect(fret.y).toBeGreaterThan(slash?.y ?? 0);
    expect(written.filter(mark => mark.name.startsWith('GuitarString')).map(mark => mark.name)).toEqual([
      'GuitarString3',
      'GuitarString2',
    ]);
    // Not by default.
    expect(system(engrave()).filter(mark => mark.name.startsWith('GuitarString'))).toEqual([]);
  });
});
