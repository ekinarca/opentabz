/**
 * Kinds of staff (REND-004, REND-005, REND-031): rhythm slashes and numbered notation are
 * engraved, as files ask or as chosen for each track, alongside or instead of standard notation
 * and tablature; the document keeps its own choices for other views.
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { Engraving, engraveFixture, engraveTex, glyphs, GUITAR, texts } from './engraving.ts';

function count(view: Engraving, name: string): number {
  return glyphs(view.marks).filter(glyph => glyph === name).length;
}

const RIFF = `${GUITAR}\n:4 0.6 2.5 2.4 0.3 | 3.2 0.1 2.4 2.5 |`;

describe('kinds of staff', () => {
  it('engraves the rhythm slashes a Guitar Pro file asks for (REND-004)', () => {
    const view = engraveFixture('alphatab/guitarpro7/slash.gp');
    expect(count(view, 'NoteheadSlashHorizontalEnds')).toBeGreaterThan(0);
    expect(count(view, 'NoteheadSlashWhiteHalf')).toBeGreaterThan(0);
  });

  it('engraves numbered notation (jianpu, REND-005)', () => {
    const view = engraveTex('\\track "Melody"\n\\staff {numbered}\n:4 C4 D4 E4 F4 | G4 A4 B4 C5 |');
    const digits = texts(view.marks).filter(text => /^[1-7]$/.test(text));
    expect(digits.length).toBeGreaterThanOrEqual(8);
    // The key, and the octave above shown by a dot.
    expect(texts(view.marks)).toContain('1 = C');
    expect(count(view, 'AugmentationDot')).toBe(1);
  });

  it('shows the staves chosen for a track instead of the file’s (REND-031)', () => {
    const asWritten = engraveTex(RIFF);
    expect(count(asWritten, 'SixStringTabClef')).toBe(1);
    expect(count(asWritten, 'NoteheadSlashHorizontalEnds')).toBe(0);

    const slashes = engraveTex(RIFF, {
      staves: [{ trackIndex: 0, standard: false, tablature: false, slash: true, numbered: false }],
    });
    expect(count(slashes, 'NoteheadSlashHorizontalEnds')).toBe(8);
    expect(count(slashes, 'SixStringTabClef')).toBe(0);
    expect(count(slashes, 'GClef')).toBe(0);

    const all = engraveTex(RIFF, {
      staves: [{ trackIndex: 0, standard: true, tablature: true, slash: true, numbered: true }],
    });
    expect(count(all, 'GClef')).toBe(1);
    expect(count(all, 'SixStringTabClef')).toBe(1);
    expect(count(all, 'NoteheadSlashHorizontalEnds')).toBe(8);
    expect(texts(all.marks).filter(text => /^[1-7]$/.test(text)).length).toBeGreaterThan(0);
  });

  it('falls back to standard notation when nothing would show, and gives the score its own back', () => {
    const score = openScore(new TextEncoder().encode(RIFF), 'riff.atex').score;
    const none = new Engraving(score, {
      staves: [{ trackIndex: 0, standard: false, tablature: false, slash: false, numbered: false }],
    });
    expect(count(none, 'GClef')).toBe(1);
    expect(count(none, 'SixStringTabClef')).toBe(0);
    const staff = score.tracks[0]?.staves[0];
    expect(staff?.showStandardNotation).toBe(true);
    expect(staff?.showTablature).toBe(true);
    expect(staff?.showSlash).toBe(false);
    expect(staff?.showNumbered).toBe(false);
  });
});

describe('the grand staff (REND-186)', () => {
  it('joins the two staves of a piano with a brace, treble over bass', () => {
    const view = engraveFixture('alphatex/views/keyboard.atex', { trackIndexes: [0] });
    expect(count(view, 'Brace')).toBe(1);
    const treble = view.marks.find(mark => mark.name === 'GClef');
    const bass = view.marks.find(mark => mark.name === 'FClef');
    const brace = view.marks.find(mark => mark.name === 'Brace');
    expect((treble?.y ?? 0) < (bass?.y ?? 0)).toBe(true);
    // The brace stands before both staves, from the top one down past the bottom one's clef.
    expect((brace?.x ?? 0) < (treble?.x ?? 0)).toBe(true);
    expect((brace?.y ?? 0) >= (bass?.y ?? 0)).toBe(true);
  });

  it('gives a single-staff track no brace', () => {
    expect(count(engraveFixture('alphatex/views/keyboard.atex', { trackIndexes: [1] }), 'Brace')).toBe(0);
  });
});
