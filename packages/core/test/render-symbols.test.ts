/**
 * Chords, lyrics, drums and the other symbols of a score (REND-169…REND-185), from Guitar Pro
 * files and alphaTex: chord names and diagrams in the staff and in a block at the top, lyrics
 * on several lines, drum noteheads on their lines, clefs, multi-bar rests, simile marks, golpe,
 * wah, sustain pedal, barré, ornaments, slurs, bar numbers and beat timers.
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { type Engraving, engraveFixture, engraveTex, glyphs, type Mark, texts } from './engraving.ts';

type Beat = alphaTab.model.Beat;

function at(beats: readonly Beat[]): string[] {
  return beats.map(beat => `${beat.voice.bar.index}:${beat.index}`);
}

function placedAt(view: Engraving, kind: 'glyph' | 'text', name: string, marks?: readonly Mark[]): string[] {
  const beats = view.beats();
  const chosen = (marks ?? view.find(kind, name)).filter(mark => mark.kind === kind && mark.name === name);
  const placed = new Set(chosen.flatMap(mark => view.nearest(mark, beats) ?? []));
  return at(beats.filter(beat => placed.has(beat)));
}

const inSystems = (view: Engraving) => view.marks.filter(mark => mark.partial === 'system');
const inHeader = (view: Engraving) => view.marks.filter(mark => mark.partial === 'header');

/** Chord diagram dots in a set of marks. */
const dots = (marks: readonly Mark[]) => marks.filter(mark => mark.name === 'FretboardFilledCircle');

describe('chords', () => {
  it('REND-169: chord names over the beats that hold them', () => {
    for (const path of ['alphatab/guitarpro7/chords.gp', 'alphatab/guitarpro7/chord-no-diagram.gp']) {
      const view = engraveFixture(path);
      const chords = view.score.tracks[0]?.staves[0]?.chords ?? new Map<string, alphaTab.model.Chord>();
      const withChord = view.beats().filter(beat => beat.chordId !== null);
      expect(withChord.length, path).toBeGreaterThan(0);
      for (const beat of withChord) {
        const chord = chords.get(beat.chordId ?? '');
        if (!chord?.showName) continue;
        expect(placedAt(view, 'text', chord.name, inSystems(view)), `${path} ${chord.name}`).toContain(
          at([beat])[0],
        );
      }
    }
  });

  it('REND-170: chord diagrams in the staff where the file asks for them', () => {
    const shown = engraveFixture('alphatab/guitarpro8/show-diagrams-in-score.gp');
    const chord = shown.score.tracks[0]?.staves[0]?.chords?.get(shown.beats()[0]?.chordId ?? '');
    expect(chord?.name).toBe('C');
    // C: three fretted strings, two open, one not played, over the first beat.
    const inStaff = inSystems(shown);
    expect(dots(inStaff)).toHaveLength(3);
    expect(glyphs(inStaff).filter(name => name === 'FretboardO')).toHaveLength(2);
    expect(glyphs(inStaff).filter(name => name === 'FretboardX')).toHaveLength(1);
    for (const mark of dots(inStaff)) expect(shown.barOf(mark)).toBe(0);
    // Without the setting the staff carries names only.
    expect(dots(inSystems(engraveFixture('alphatab/guitarpro7/chords.gp')))).toEqual([]);
    expect(dots(engraveFixture('alphatab/guitarpro7/chord-no-diagram.gp').marks)).toEqual([]);
  });

  it('REND-171: a block of the chord diagrams at the top of the score, or none when hidden', () => {
    const view = engraveFixture('alphatab/guitarpro7/chords.gp');
    const chords = [...(view.score.tracks[0]?.staves[0]?.chords?.values() ?? [])];
    // Every chord, named, with a dot for each fretted string.
    const header = inHeader(view);
    for (const name of new Set(chords.map(chord => chord.name))) {
      expect(texts(header).filter(text => text === name).length, name).toBe(
        chords.filter(chord => chord.name === name).length,
      );
    }
    const fretted = chords.reduce((sum, chord) => sum + chord.strings.filter(fret => fret > 0).length, 0);
    expect(dots(header)).toHaveLength(fretted);
    expect(dots(inHeader(engraveFixture('alphatab/guitarpro8/hide-diagrams.gp')))).toEqual([]);
  });
});

describe('lyrics', () => {
  it('REND-172: lyrics on several lines, syllables under their notes', () => {
    const view = engraveTex(
      '\\track "Voice"\n\\staff {score}\n\\lyrics "Hel-lo my dear friend"\n\\lyrics "Se-cond line here too"\n:4 C4 D4 E4 F4 | G4 A4 B4 C5',
    );
    const lines = [
      ['Hel-', 'lo', 'my', 'dear', 'friend'],
      ['Se-', 'cond', 'line', 'here', 'too'],
    ];
    const beats = view.beats();
    const ys: number[] = [];
    for (const line of lines) {
      const marks = line.map(word => view.find('text', word)[0]);
      // Syllable by syllable, under the beats in order.
      expect(
        marks.map(mark => {
          const beat = mark === undefined ? null : view.nearest(mark, beats);
          return beat === null ? null : at([beat])[0];
        }),
      ).toEqual(['0:0', '0:1', '0:2', '0:3', '1:0']);
      // One line: one baseline.
      expect(new Set(marks.map(mark => mark?.y)).size).toBe(1);
      ys.push(marks[0]?.y ?? Number.NaN);
    }
    // The second line under the first, both under the staff.
    expect(ys[1]).toBeGreaterThan(ys[0] ?? Number.POSITIVE_INFINITY);
    const file = engraveFixture('alphatab/guitarpro7/beat-lyrics.gp');
    expect(texts(file.marks)).toEqual(
      expect.arrayContaining(['This', 'is', 'a', 'test file', 'for', 'lyrics']),
    );
  });
});

describe('drums', () => {
  it('REND-173: every drum sound has its notehead, on its line', () => {
    const view = engraveFixture('alphatex/demos/twelve-bar-shuffle.atex', { trackIndexes: [3] });
    const track = view.score.tracks[3];
    if (track === undefined) throw new Error('A drum track expected.');
    expect(track.staves[0]?.isPercussion).toBe(true);
    const lineOf = new Map<number, number>();
    for (const beat of view.beats(3)) {
      const heads = view
        .drawnBy(beat)
        .filter(mark => mark.kind === 'glyph' && mark.name.startsWith('Notehead'))
        .sort((a, b) => a.y - b.y);
      const notes = [...beat.notes]
        .map(note => track.percussionArticulations[note.percussionArticulation])
        .filter(articulation => articulation !== undefined)
        .sort((a, b) => a.staffLine - b.staffLine);
      expect(
        heads.map(mark => mark.name),
        at([beat])[0],
      ).toEqual(
        notes.map(articulation => alphaTab.model.MusicFontSymbol[articulation.getSymbol(beat.duration)]),
      );
      notes.forEach((articulation, index) => {
        const y = heads[index]?.y ?? Number.NaN;
        // The same line every time: y less half a staff space per line is constant.
        lineOf.set(articulation.staffLine, y);
      });
    }
    const lines = [...lineOf.entries()].sort((a, b) => a[0] - b[0]);
    expect(lines.length).toBeGreaterThan(2);
    const [firstLine, firstY] = lines[0] ?? [0, 0];
    const [lastLine, lastY] = lines.at(-1) ?? [0, 0];
    const halfSpace = (lastY - firstY) / (lastLine - firstLine);
    for (const [line, y] of lines) expect(y).toBeCloseTo(firstY + (line - firstLine) * halfSpace, 0);

    // Guitar Pro 5 drums map to the same noteheads every time they sound.
    const gp5 = engraveFixture('alphatab/guitarpro5/percussion-all.gp5');
    const headOf = new Map<number, string>();
    for (const beat of gp5.beats()) {
      const heads = gp5
        .drawnBy(beat)
        .filter(mark => mark.kind === 'glyph' && mark.name.startsWith('Notehead'));
      if (beat.notes.length !== 1 || heads.length !== 1) continue;
      const articulation = beat.notes[0]?.percussionArticulation ?? -1;
      const name = heads[0]?.name ?? '';
      expect(headOf.get(articulation) ?? name, `articulation ${articulation}`).toBe(name);
      headOf.set(articulation, name);
    }
    expect(new Set(headOf.values()).size).toBeGreaterThan(4);
  });
});

describe('staff symbols', () => {
  it('REND-174: treble, bass, alto, tenor and neutral clefs, and octave clefs', () => {
    const view = engraveTex(
      '\\track "Piano"\n\\staff {score}\n\\clef G2 :1 C4 | \\clef F4 C4 | \\clef C3 C4 | \\clef C4 C4 | \\clef Neutral C4',
    );
    expect(
      view.bars.map(bar =>
        glyphs(
          view.marks.filter(mark => mark.name.includes('Clef') && view.barStartNear(mark) === bar.index),
        ),
      ),
    ).toEqual([['GClef'], ['FClef'], ['CClef'], ['CClef'], ['UnpitchedPercussionClef1']]);
    // Alto and tenor clefs sit on different lines.
    const [alto, tenor] = view.find('glyph', 'CClef');
    expect(alto && tenor && tenor.y < alto.y).toBe(true);
    const octaves = engraveTex(
      '\\track "Piano"\n\\staff {score}\n\\clef G2 \\ottava 8vb :1 C4 | \\ottava 15ma C4',
    );
    expect(glyphs(octaves.marks).filter(name => name.includes('Clef'))).toEqual(['GClef8vb', 'GClef15ma']);
  });

  it('REND-176: empty bars in a row become one multi-bar rest with their count', () => {
    const view = engraveTex(
      '\\track "Guitar" { multiBarRest }\n\\staff {score tabs}\n\\tuning (E4 B3 G3 D3 A2 E2)\n:1 3.3 | r | r | r | r | 3.3',
    );
    expect(view.bars.map(bar => bar.index)).toEqual([0, 1, 5]);
    expect(glyphs(view.marks.filter(mark => view.barOf(mark) === 1))).toEqual(
      expect.arrayContaining(['RestHBarLeft', 'RestHBarMiddle', 'RestHBarRight', 'TimeSig4']),
    );
    expect(view.find('glyph', 'RestWhole')).toEqual([]);
  });

  it('REND-177: simile marks for one and two bars', () => {
    const { SimileMark } = alphaTab.model;
    const view = engraveFixture('alphatab/guitarpro7/simile-mark.gp');
    const bars = view.score.tracks[0]?.staves[0]?.bars ?? [];
    const single = bars.filter(bar => bar.simileMark === SimileMark.Simple).map(bar => bar.index);
    const double = bars.filter(bar => bar.simileMark === SimileMark.SecondOfDouble).map(bar => bar.index);
    expect(single.length).toBeGreaterThan(0);
    expect(double.length).toBeGreaterThan(0);
    // One sign per bar on each staff; the two-bar sign stands on the barline between its bars.
    expect([...new Set(view.barsWith('glyph', 'Repeat1Bar'))]).toEqual(single);
    expect([...new Set(view.find('glyph', 'Repeat2Bars').map(mark => view.barStartNear(mark)))]).toEqual(
      double,
    );
  });

  it('REND-178…REND-180: golpe above (finger) or below (thumb), wah open and closed, sustain pedal', () => {
    const golpe = engraveTex(':4 3.3{glpf} 3.3{glpt} 3.3 3.3');
    const [finger, thumb] = golpe.beats();
    if (finger === undefined || thumb === undefined) throw new Error('Two beats expected.');
    const noteY = (beat: Beat) =>
      golpe.drawnBy(beat).find(mark => mark.name.startsWith('Notehead'))?.y ?? Number.NaN;
    const golpeY = (beat: Beat) =>
      golpe.over(beat).find(mark => mark.name === 'GuitarGolpe')?.y ?? Number.NaN;
    expect(golpeY(finger)).toBeLessThan(noteY(finger));
    expect(golpeY(thumb)).toBeGreaterThan(noteY(thumb));
    expect(placedAt(golpe, 'glyph', 'GuitarGolpe')).toEqual(['0:0', '0:1']);

    const { WahPedal } = alphaTab.model;
    const wah = engraveFixture('alphatab/guitarpro5/wah-wah.gp5');
    const open = at(wah.beats().filter(beat => beat.wahPedal === WahPedal.Open));
    const closed = at(wah.beats().filter(beat => beat.wahPedal === WahPedal.Closed));
    expect(open.length).toBeGreaterThan(0);
    expect(closed.length).toBeGreaterThan(0);
    expect(placedAt(wah, 'glyph', 'GuitarOpenPedal')).toEqual(open);
    expect(placedAt(wah, 'glyph', 'GuitarClosePedal')).toEqual(closed);

    const pedal = engraveTex(':4 3.3{spd} 3.3 3.3{spu} 3.3');
    expect(placedAt(pedal, 'glyph', 'KeyboardPedalPed')).toEqual(['0:0']);
    expect(placedAt(pedal, 'glyph', 'KeyboardPedalUp')).toEqual(['0:2']);
  });

  it('REND-181: barré over its beats, with the fret in Roman numerals and half barrés marked', () => {
    const view = engraveTex(':4 3.3{barre 3} 3.3{barre 3} 3.3{barre 5 half} 3.3');
    expect(placedAt(view, 'text', 'B III')).toEqual(['0:0']);
    expect(placedAt(view, 'text', '1/2B V')).toEqual(['0:2']);
  });

  it('REND-182: turns, inverted turns and mordents', () => {
    const view = engraveTex(':4 3.3{turn} 3.3{iturn} 3.3{umordent} 3.3{lmordent}');
    expect(
      view.beats().map(beat => glyphs(view.over(beat)).filter(name => name.startsWith('Ornament'))),
    ).toEqual([['OrnamentTurn'], ['OrnamentTurnInverted'], ['OrnamentShortTrill'], ['OrnamentMordent']]);
  });

  it('REND-183: a slur reaches from its first note to its last', () => {
    const view = engraveTex(':4 3.3{slur s1} 5.3 7.3{slur s1} 5.3');
    const slurs = view.marks.filter(
      mark =>
        mark.kind === 'path' &&
        mark.name === 'fill' &&
        (mark.commands ?? '').includes('C') &&
        mark.width > 20,
    );
    expect(slurs).toHaveLength(1);
    const [slur] = slurs;
    const [first, , third, fourth] = view.beats();
    if (slur === undefined || first === undefined || third === undefined || fourth === undefined) return;
    expect(slur.x).toBeLessThanOrEqual(view.span(first).notes + 1);
    expect(slur.x + slur.width).toBeGreaterThan(view.span(third).left);
    expect(slur.x + slur.width).toBeLessThan(view.span(fourth).notes);
  });
});

describe('numbers and times', () => {
  it('REND-184: bar numbers on every bar, on the first bar of each system, or not at all', () => {
    const numbers = (path: string) => {
      const view = engraveFixture(path);
      return view.marks
        .filter(mark => mark.kind === 'text' && /^\d+$/.test(mark.name) && mark.beat === -1)
        .map(mark => Number(mark.name));
    };
    expect(numbers('alphatab/guitarpro8/barnumbers-all.gp')).toEqual([1, 2, 3, 4, 5, 6]);
    expect(numbers('alphatab/guitarpro8/barnumbers-first.gp')).toEqual([1]);
    expect(numbers('alphatab/guitarpro8/barnumbers-hide.gp')).toEqual([]);
  });

  it('REND-185: beat timers show when each beat is first played, repeats and jumps included', () => {
    const view = engraveFixture('alphatab/guitarpro8/timer.gp');
    const shown = view.marks.filter(mark => mark.kind === 'text' && /^\d+:\d\d$/.test(mark.name));
    expect(shown.map(mark => `${view.barOf(mark)} ${mark.name}`)).toEqual([
      '0 0:00',
      '1 0:02',
      '2 0:04',
      '3 0:06',
      '4 0:08',
      '5 0:16',
      '6 0:26',
      '7 0:28',
      '8 0:00',
    ]);
    // alphaTex asks for timers without times: they are worked out when the score opens.
    const tex = engraveTex(':4 3.3{timer} 3.3 3.3 3.3 | 3.3{timer} 3.3 3.3 3.3 | 3.3 3.3 3.3{timer} 3.3');
    expect(texts(tex.marks).filter(text => /^\d+:\d\d$/.test(text))).toEqual(['0:00', '0:02', '0:05']);
  });
});
