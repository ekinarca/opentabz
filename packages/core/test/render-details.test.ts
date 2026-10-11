/**
 * Details of the engraving (REND-158…REND-312): pickup bars, every barline style and barlines
 * through all staves, note values from quadruple whole to 256th, accidentals single and double
 * and how they carry through a bar and across ties, slash noteheads, stems forced by the file,
 * releases of bends begun earlier, whammy amounts in quarter tones, piano fingering, string
 * numbers, dead slaps and the extended dynamics; the capo (REND-033).
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { Engraving, engraveFixture, engraveTex, glyphs, type Mark, texts } from './engraving.ts';

const PIANO = '\\track "Piano"\n\\staff {score}';

/** Glyphs each beat draws itself, in beat order. */
function ownGlyphs(view: Engraving, filter: (name: string) => boolean = () => true): string[][] {
  return view.beats().map(beat => glyphs(view.drawnBy(beat)).filter(filter));
}

/** The vertical strokes of a barline at the end of a master bar, on the first staff. */
function barline(view: Engraving, index: number): Mark[] {
  const place = view.bars.find(bar => bar.index === index);
  if (place === undefined) throw new Error(`Bar ${index} was not drawn.`);
  const top = Math.min(
    ...view.marks
      .filter(mark => mark.kind === 'rect' && mark.width > 100 && view.systemOf(mark) === place.system)
      .map(mark => mark.y),
  );
  return view.marks
    .filter(
      mark =>
        (mark.kind === 'rect' || mark.kind === 'path') &&
        mark.partial === 'system' &&
        view.systemOf(mark) === place.system &&
        mark.x > place.right - 14 &&
        mark.x < place.right + 2 &&
        mark.height >= mark.width &&
        mark.y < top + 45,
    )
    .sort((a, b) => a.x - b.x);
}

describe('bars', () => {
  it('REND-158: a pickup bar holds only its upbeat, without rests to fill it', () => {
    const view = engraveFixture('alphatab/guitarpro7/anacrusis.gp');
    const [pickup, first] = view.score.masterBars;
    expect(pickup?.isAnacrusis).toBe(true);
    const beats = view.score.tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats ?? [];
    expect(beats.map(beat => beat.duration)).toEqual([4, 4]);
    expect(
      glyphs(view.marks.filter(mark => view.barOf(mark) === 0)).filter(name => name.startsWith('Rest')),
    ).toEqual([]);
    const width = (index: number) => {
      const bar = view.bars.find(candidate => candidate.index === index);
      return bar === undefined ? 0 : bar.right - bar.left;
    };
    // Narrower than the full bar after it, though the first bar also carries clef and meter.
    expect(width(0)).toBeLessThan(width(first?.index ?? 1));
  });

  it('REND-167: every barline style, and barlines drawn through all staves when the file asks', () => {
    const styles = [
      'regular',
      'dashed',
      'dotted',
      'heavy',
      'heavyheavy',
      'heavylight',
      'lightheavy',
      'lightlight',
      'short',
      'tick',
      'none',
    ];
    const view = engraveTex(
      styles.map((style, index) => `\\barlineright ${style} ${index === 0 ? ':1 ' : ''}3.3`).join(' | '),
    );
    const thin = (mark: Mark) => mark.kind === 'rect' && mark.width < 2;
    const thick = (mark: Mark) => mark.kind === 'rect' && mark.width > 3;
    const full = (barline(view, 0)[0]?.height ?? 0) - 0.5;
    const shapes = styles.map((_, index) => barline(view, index));
    const [
      regular,
      dashed,
      dotted,
      heavy,
      heavyHeavy,
      heavyLight,
      lightHeavy,
      lightLight,
      short,
      tick,
      none,
    ] = shapes;
    expect(regular?.map(thin)).toEqual([true]);
    // Dashed: one stroked line with gaps; dotted: a column of dots.
    expect(dashed?.map(mark => `${mark.kind}:${mark.name}`)).toEqual(['path:stroke']);
    expect(dotted?.length).toBeGreaterThan(2);
    expect(dotted?.every(mark => mark.kind === 'path' && mark.name === 'fill')).toBe(true);
    expect(heavy?.map(thick)).toEqual([true]);
    expect(heavyHeavy?.map(thick)).toEqual([true, true]);
    expect(heavyLight?.map(mark => (thick(mark) ? 'heavy' : 'light'))).toEqual(['heavy', 'light']);
    expect(lightHeavy?.map(mark => (thick(mark) ? 'heavy' : 'light'))).toEqual(['light', 'heavy']);
    expect(lightLight?.map(thin)).toEqual([true, true]);
    // Short and tick barlines do not span the staff.
    expect(short?.every(mark => mark.height < full / 2 + 1)).toBe(true);
    expect(tick?.every(mark => mark.height < full / 2)).toBe(true);
    expect(none).toEqual([]);

    // Guitar Pro's "extend barlines": one line through every staff of the system.
    const extended = engraveFixture('alphatab/guitarpro8/extended-barlines.gp', { trackIndexes: [0, 1] });
    expect(extended.score.stylesheet.extendBarLines).toBe(true);
    const first = extended.bars[0];
    if (first === undefined) throw new Error('A bar expected.');
    const pieces = extended.marks
      .filter(
        mark =>
          mark.kind === 'rect' &&
          mark.partial === 'system' &&
          Math.abs(mark.x - first.right) < 6 &&
          mark.height > mark.width,
      )
      .sort((a, b) => a.y - b.y);
    expect(pieces.length).toBeGreaterThan(2);
    // Each piece starts where the one above ends.
    for (let index = 1; index < pieces.length; index++) {
      const above = pieces[index - 1];
      const piece = pieces[index];
      if (above === undefined || piece === undefined) continue;
      expect(piece.y).toBeLessThanOrEqual(above.y + above.height + 1);
    }
  });
});

describe('notes', () => {
  it('REND-189: note values from quadruple whole to 256th', () => {
    const view = engraveTex(`${PIANO}\n:-4 C4 | :-2 C4 | :1 C4 | :2 C4 r | :256 A4 r | C5 r`);
    const heads = ownGlyphs(view, name => name.startsWith('Notehead'));
    expect(heads.slice(0, 4)).toEqual([
      ['NoteheadDoubleWholeSquare'],
      ['NoteheadDoubleWhole'],
      ['NoteheadWhole'],
      ['NoteheadHalf'],
    ]);
    // 256ths with their stems up and down.
    const [up, , down] = view.beats().slice(-4);
    if (up === undefined || down === undefined) throw new Error('256ths expected.');
    expect(glyphs(view.over(up)).filter(name => name.startsWith('Flag'))).toEqual(['Flag256thUp']);
    expect(glyphs(view.over(down)).filter(name => name.startsWith('Flag'))).toEqual(['Flag256thDown']);
    expect(glyphs(view.marks)).toContain('Rest256th');
  });

  it('REND-192, REND-193, REND-195: sharps, flats, naturals and doubles, carried through the bar and across ties', () => {
    const accidentals = (name: string) => name.startsWith('Accidental');
    const plain = engraveTex(`${PIANO}\n:4 C#4 Db4 C4 F##4 | Gbb4 G4 r r`);
    // C after C sharp in the same bar needs its natural.
    expect(ownGlyphs(plain, accidentals)).toEqual([
      ['AccidentalSharp'],
      ['AccidentalFlat'],
      ['AccidentalNatural'],
      ['AccidentalDoubleSharp'],
      ['AccidentalDoubleFlat'],
      ['AccidentalNatural'],
      [],
      [],
    ]);
    // In D major: F# needs nothing, F a natural that lasts the bar, C a natural; a sharp tied over
    // the barline is not repeated.
    const keyed = engraveTex(`${PIANO}\n\\ks D\n:4 F#4 F4 F4 C4 | :2 G#4 G#4{t} | :4 G#4{t} A4 G#4 r`);
    expect(ownGlyphs(keyed, accidentals)).toEqual([
      [],
      ['AccidentalNatural'],
      [],
      ['AccidentalNatural'],
      ['AccidentalSharp'],
      [],
      [],
      [],
      ['AccidentalSharp'],
      [],
    ]);
  });

  it('REND-196: slash noteheads keep the pitches underneath', () => {
    const view = engraveTex(`${PIANO}\n:4 C4{slashed} (E4 G4){slashed} C4 C4`);
    expect(ownGlyphs(view, name => name.startsWith('Notehead'))).toEqual([
      ['NoteheadSlashHorizontalEnds'],
      ['NoteheadSlashHorizontalEnds'],
      ['NoteheadBlack'],
      ['NoteheadBlack'],
    ]);
    expect(view.beats()[1]?.notes.map(note => note.realValue)).toEqual([64, 67]);
  });

  it('REND-198: stems forced up or down by the file', () => {
    const view = engraveTex(`${PIANO}\n:8 C5{beam up} r C5{beam down} r C5 r A4 r`);
    const notes = view.beats().filter(beat => !beat.isRest);
    expect(notes.map(beat => glyphs(view.over(beat)).filter(name => name.startsWith('Flag')))).toEqual([
      ['Flag8thUp'],
      ['Flag8thDown'],
      // C5 sits above the middle line: down by default; A4 below it: up.
      ['Flag8thDown'],
      ['Flag8thUp'],
    ]);
  });

  it('REND-203, REND-204: piano fingering 1–5 stacked over a chord, circled string numbers', () => {
    const piano = engraveTex(
      '\\track "Piano" {instrument acousticgrandpiano}\n\\staff {score}\n:4 C4{lf 1} E4{lf 3} (C4{lf 1} E4{lf 3} G4{lf 5}) C4',
    );
    const fingering = ownGlyphs(piano, name => name.startsWith('Fingering'));
    expect(fingering).toEqual([
      ['Fingering1'],
      ['Fingering3'],
      ['Fingering1', 'Fingering3', 'Fingering5'],
      [],
    ]);
    // On a chord the numbers do not share a position.
    const chord = piano.beats()[2];
    if (chord === undefined) throw new Error('A chord expected.');
    const ys = piano
      .drawnBy(chord)
      .filter(mark => mark.name.startsWith('Fingering'))
      .map(mark => mark.y);
    expect(new Set(ys.map(y => Math.round(y))).size).toBe(3);
    const strings = engraveTex(':4 3.3{string} 5.2{string} 0.1 r');
    expect(ownGlyphs(strings, name => name.startsWith('GuitarString'))).toEqual([
      ['GuitarString3'],
      ['GuitarString2'],
      [],
      [],
    ]);
  });

  it('REND-205: a dead slap is a cross over the staff where the beat falls', () => {
    const view = engraveTex(':4 r{ds} 3.3 r r');
    const [slap] = view.beats();
    if (slap === undefined) throw new Error('A beat expected.');
    const strokes = view.drawnBy(slap).filter(mark => mark.kind === 'path' && mark.name === 'stroke');
    expect(strokes.length).toBeGreaterThanOrEqual(2);
    expect(glyphs(view.drawnBy(slap)).filter(name => name.startsWith('Rest'))).toEqual([]);
  });
});

describe('bends and whammy', () => {
  it('REND-201: a release of a bend begun on an earlier, tied note points down from the bent pitch', () => {
    const { BendType } = alphaTab.model;
    const view = engraveFixture('alphatab/guitarpro7/bends-advanced.gp');
    const releases = view
      .beats()
      .filter(beat => beat.notes.some(note => note.bendType === BendType.Release && note.isTieDestination));
    expect(releases.length).toBeGreaterThan(0);
    for (const beat of releases) {
      const heads = view
        .drawnBy(beat)
        .filter(mark => mark.kind === 'path' && mark.name === 'fill' && mark.commands === 'MLLz')
        .map(mark => ((mark.points?.[0]?.y ?? 0) < (mark.points?.[1]?.y ?? 0) ? 'up' : 'down'));
      expect(heads, `${beat.voice.bar.index}:${beat.index}`).toEqual(['down']);
    }
  });

  it('REND-202: whammy amounts in quarter tones', () => {
    const view = engraveTex(':2 3.3{tb (0 -1)} 3.3{tb (0 -2 0)}');
    expect(texts(view.marks)).toEqual(expect.arrayContaining(['w/bar', '-¼', '-½']));
  });
});

describe('dynamics', () => {
  it('REND-312: pppp to ffff, sf, sfz, sffz, fp, rf, rfz, fz, pf and niente', () => {
    const marks = ['pppp', 'ffff', 'sf', 'sfz', 'sffz', 'fp', 'rf', 'rfz', 'fz', 'pf', 'n'];
    const view = engraveTex(`:4 ${marks.map(mark => `3.3{dy ${mark}}`).join(' ')} r`);
    expect(
      view
        .beats()
        .slice(0, marks.length)
        .map(beat => glyphs(view.over(beat)).filter(name => name.startsWith('Dynamic'))),
    ).toEqual([
      ['DynamicPPPP'],
      ['DynamicFFFF'],
      ['DynamicSforzando1'],
      ['DynamicSforzato'],
      ['DynamicSforzatoFF'],
      ['DynamicFortePiano'],
      ['DynamicRinforzando1'],
      ['DynamicRinforzando2'],
      ['DynamicForzando'],
      ['DynamicPF'],
      ['DynamicNiente'],
    ]);
  });
});

describe('capo', () => {
  /** Ten bars of a guitar capoed at the third fret, showing `staves`. */
  const capoed = (staves: string, capo = '\\capo 3') =>
    [
      '\\track "Guitar"',
      `\\staff {${staves}}`,
      '\\tuning (E4 B3 G3 D3 A2 E2)',
      capo,
      `:1 ${Array.from({ length: 10 }, () => '0.6').join(' | ')} |`,
    ].join('\n');

  it('REND-033: the capo written once over the first bar, whatever staves the track shows', () => {
    for (const staves of ['score tabs', 'tabs', 'score', 'slash', 'numbered']) {
      const view = engraveTex(capoed(staves), { width: 500 });
      const labels = view.find('text', 'Capo. fret 3');
      expect(labels, staves).toHaveLength(1);
      const [label] = labels;
      expect(label === undefined ? -1 : view.systemOf(label), staves).toBe(0);
      // Later systems start without it.
      expect(Math.max(...view.bars.map(bar => bar.system)), staves).toBeGreaterThan(0);
    }
    const plain = texts(engraveTex(capoed('score tabs', '')).marks);
    expect(plain.filter(text => text.startsWith('Capo'))).toEqual([]);
  });

  it('REND-033: a Guitar Pro file keeps its capo', () => {
    const tex = engraveTex(capoed('score tabs'));
    const saved = new alphaTab.exporter.Gp7Exporter().export(tex.score, new alphaTab.Settings());
    const { score } = openScore(saved, 'capo.gp');
    expect(score.tracks[0]?.staves[0]?.capo).toBe(3);
    expect(new Engraving(score).find('text', 'Capo. fret 3')).toHaveLength(1);
  });
});
