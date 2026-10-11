/**
 * Notes coloured to read the music by (REND-300…REND-303, REND-316).
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { RenderSession } from '../src/render/session.ts';
import {
  CHORD_TONE_COLORS,
  chordToneOf,
  DEGREE_COLORS,
  degreeOf,
  INTERVAL_COLORS,
  noteColors,
  rootPitchClass,
  STRING_COLORS,
  tonicOf,
  type NoteColoring,
} from '../src/shared/note-colors.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { GUITAR } from './engraving.ts';

/** A score painted with notes coloured, as one string of SVG, and the score afterwards. */
function paint(tex: string, noteColors?: NoteColoring) {
  const { score } = openScore(new TextEncoder().encode(tex), 'score.atex');
  const options: ViewOptions = {
    trackIndexes: [0],
    layout: 'page',
    systemsLayout: 'auto',
    staffDisplay: 'default',
    width: 1200,
    notationScale: 1,
    ...(noteColors === undefined ? {} : { noteColors }),
  };
  const session = new RenderSession(score, options);
  try {
    const layout = session.layout();
    const svg = session
      .paint(layout.partials.map(partial => partial.id))
      .map(partial => partial.svg)
      .join('\n')
      .toUpperCase();
    return { svg, score };
  } finally {
    session.dispose();
  }
}

describe('what notes are, for colouring them', () => {
  it('finds the tonic of a key from its sharps or flats', () => {
    expect(tonicOf(0, false)).toBe(0);
    expect(tonicOf(1, false)).toBe(7);
    expect(tonicOf(-1, false)).toBe(5);
    expect(tonicOf(0, true)).toBe(9);
    expect(tonicOf(3, true)).toBe(6);
  });

  it('finds a note’s degree in a major or minor key', () => {
    expect([60, 62, 64, 65, 67, 69, 71].map(pitch => degreeOf(pitch, 0, false))).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(degreeOf(61, 0, false)).toBeNull();
    expect(degreeOf(72, 9, true)).toBe(2);
  });

  it('finds the part a note plays in a chord', () => {
    const cMajor = new Set([0, 4, 7]);
    expect(rootPitchClass('C')).toBe(0);
    expect(rootPitchClass('Bbm7')).toBe(10);
    expect(rootPitchClass('F#/A#')).toBe(6);
    expect(rootPitchClass('N.C.')).toBeNull();
    expect([60, 64, 67].map(pitch => chordToneOf(pitch, 0, cMajor))).toEqual(['root', 'third', 'fifth']);
    expect(chordToneOf(71, 0, cMajor)).toBeNull();
    expect(chordToneOf(70, 0, new Set([0, 4, 7, 10]))).toBe('seventh');
    expect(chordToneOf(62, 0, new Set([0, 2, 4, 7]))).toBe('other');
  });

  it('has colour-blind safe palettes and string colours of one’s own (REND-316)', () => {
    expect(noteColors('string', 'colorBlind', [])).toEqual(STRING_COLORS.colorBlind);
    expect(noteColors('string', 'custom', ['#123456'])).toEqual(['#123456']);
    // One's own colours are the strings': other modes keep the standard ones.
    expect(noteColors('degree', 'custom', ['#123456'])).toEqual(DEGREE_COLORS.standard);
    for (const palette of [STRING_COLORS, INTERVAL_COLORS, DEGREE_COLORS, CHORD_TONE_COLORS]) {
      expect(new Set(palette.colorBlind).size).toBe(palette.colorBlind.length);
      // No black: the notes must show on a dark page too.
      expect(palette.colorBlind).not.toContain('#000000');
    }
  });
});

describe('notes coloured in the score', () => {
  const RIFF = `${GUITAR}\n:4 0.6 3.6 0.5 2.4 |`;

  it('colours notes by string, from the lowest (REND-300)', () => {
    const coloring = { mode: 'string', colors: STRING_COLORS.standard } as const;
    const { svg, score } = paint(RIFF, coloring);
    // Low E, A and D strings: the first three colours, the others nowhere.
    for (const color of STRING_COLORS.standard.slice(0, 3)) expect(svg).toContain(color);
    for (const color of STRING_COLORS.standard.slice(3)) expect(svg).not.toContain(color);
    expect(paint(RIFF).svg).not.toContain(STRING_COLORS.standard[0] ?? '');
    // The score keeps its own styles.
    expect(score.tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats[0]?.notes[0]?.style).toBeUndefined();
  });

  it('colours notes by their interval above the tonic (REND-301)', () => {
    const { svg } = paint('\\track "M"\n\\staff {score}\n\\ks C\n:4 C4 G4 C5 G4 |', {
      mode: 'interval',
      colors: INTERVAL_COLORS.standard,
    });
    expect(svg).toContain(INTERVAL_COLORS.standard[0]);
    expect(svg).toContain(INTERVAL_COLORS.standard[7]);
    expect(svg).not.toContain(INTERVAL_COLORS.standard[4]);
  });

  it('colours notes by their degree in the key, and the notes outside it (REND-302)', () => {
    const { svg } = paint('\\track "M"\n\\staff {score}\n\\ks G\n:8 G4 A4 B4 C5 D5 E5 F#5 F5 |', {
      mode: 'degree',
      colors: DEGREE_COLORS.standard,
    });
    for (const color of DEGREE_COLORS.standard) expect(svg).toContain(color);
  });

  it('colours notes by the part they play in the chord over them (REND-303)', () => {
    const tex = `${GUITAR}\n\\chord ("C" 0 1 0 2 3 x)\n:4 3.5{ch "C"} 2.4 0.3 0.2 |`;
    // C (root), E (third), G (fifth), B (not in the chord: uncoloured).
    const { svg } = paint(tex, { mode: 'chordTone', colors: CHORD_TONE_COLORS.standard });
    expect(svg).toContain(CHORD_TONE_COLORS.standard[0]);
    expect(svg).toContain(CHORD_TONE_COLORS.standard[1]);
    expect(svg).toContain(CHORD_TONE_COLORS.standard[2]);
    expect(svg).not.toContain(CHORD_TONE_COLORS.standard[3]);
  });
});
