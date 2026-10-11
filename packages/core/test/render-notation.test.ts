/**
 * How rhythm, meter and form are engraved (REND-146…REND-168), from Guitar Pro files, MusicXML and
 * alphaTex: octave lines above and below the staff, tuplets of any ratio, ties, dots, rests of
 * every value, fermatas, time and key signatures, tempo marks, triplet feel, free time, repeats,
 * endings, jumps and their targets, sections and texts, each where the score has it.
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import {
  type Engraving,
  Engraving as EngravingOf,
  engraveFixture,
  engraveTex,
  glyphs,
  type Mark,
  texts,
} from './engraving.ts';

type Beat = alphaTab.model.Beat;
const { Ottavia } = alphaTab.model;

function at(beats: readonly Beat[]): string[] {
  return beats.map(beat => `${beat.voice.bar.index}:${beat.index}`);
}

function placedAt(view: Engraving, kind: 'glyph' | 'text', name: string): string[] {
  const beats = view.beats();
  const placed = new Set(view.placed(kind, name, beats));
  return at(beats.filter(beat => placed.has(beat)));
}

function runStarts(view: Engraving, predicate: (beat: Beat) => boolean): string[] {
  const beats = view.beats();
  return at(
    beats.filter((beat, index) => {
      const previous = beats[index - 1];
      const continued =
        previous !== undefined &&
        predicate(previous) &&
        view.span(previous).system === view.span(beat).system;
      return predicate(beat) && !continued;
    }),
  );
}

/** Glyphs side by side on one line read as one label, e.g. `Tuplet5 TupletColon Tuplet2` → "5:2". */
function tupletLabels(view: Engraving): { text: string; mark: Mark }[] {
  const parts = view.marks
    .filter(mark => mark.kind === 'glyph' && /^Tuplet(\d|Colon)$/.test(mark.name))
    .sort((a, b) => a.y - b.y || a.x - b.x);
  const labels: { text: string; mark: Mark }[] = [];
  for (const part of parts) {
    const symbol = part.name === 'TupletColon' ? ':' : part.name.slice('Tuplet'.length);
    const last = labels.at(-1);
    if (
      last !== undefined &&
      Math.abs(last.mark.y - part.y) < 0.5 &&
      part.x - (last.mark.x + last.mark.width) < 1
    ) {
      last.text += symbol;
      last.mark = { ...last.mark, width: part.x + part.width - last.mark.x };
    } else labels.push({ text: symbol, mark: part });
  }
  return labels;
}

/** The y of a beat's noteheads on the standard staff. */
function noteheadY(view: Engraving, beat: Beat): number {
  const heads = view.drawnBy(beat).filter(mark => mark.kind === 'glyph' && mark.name.startsWith('Notehead'));
  return Math.min(...heads.map(mark => mark.y));
}

describe('octaves', () => {
  it('REND-146: 8va and 15ma above the staff, 8vb and 15mb below, octave clefs', () => {
    const view = engraveFixture('alphatab/guitarpro7/ottavia.gp');
    const signs: [alphaTab.model.Ottavia, string, 'above' | 'below'][] = [
      [Ottavia._8va, 'OttavaAlta', 'above'],
      [Ottavia._15ma, 'QuindicesimaAlta', 'above'],
      [Ottavia._8vb, 'OttavaBassaVb', 'below'],
      [Ottavia._15mb, 'OctaveBaselineM', 'below'],
    ];
    for (const [ottava, sign, side] of signs) {
      const starts = runStarts(view, beat => beat.ottava === ottava);
      expect(starts.length, sign).toBeGreaterThan(0);
      expect(placedAt(view, 'glyph', sign), sign).toEqual(starts);
      for (const mark of view.find('glyph', sign)) {
        const beat = view.nearest(mark, view.beats());
        if (beat === null) throw new Error(`${sign} placed nowhere`);
        expect(mark.y < noteheadY(view, beat), `${sign} ${side}`).toBe(side === 'above');
      }
    }
    // 15mb is written "15mb".
    expect(view.find('glyph', 'Quindicesima').length).toBe(view.find('glyph', 'OctaveBaselineB').length);
    // A line runs on to the end of each octave passage (8vb in bar 7: four beats).
    const clefs: [alphaTab.model.Ottavia, string][] = [
      [Ottavia._8va, 'GClef8va'],
      [Ottavia._8vb, 'GClef8vb'],
      [Ottavia._15ma, 'GClef15ma'],
      [Ottavia._15mb, 'GClef15mb'],
    ];
    const bars = view.score.tracks[0]?.staves[0]?.bars ?? [];
    for (const [ottava, clef] of clefs) {
      const withClef = bars.filter(bar => bar.clefOttava === ottava).map(bar => bar.index);
      expect(withClef.length, clef).toBeGreaterThan(0);
      expect(view.barsWith('glyph', clef), clef).toEqual(withClef.slice(0, 1));
    }
  });
});

describe('rhythm', () => {
  it('REND-147: tuplets of any ratio carry their number, and their ratio when it is not the usual one', () => {
    const views = [
      engraveTex(
        ':8 3.3{tu 3} 3.3{tu 3} 3.3{tu 3} :16 3.3{tu 5} 3.3{tu 5} 3.3{tu 5} 3.3{tu 5} 3.3{tu 5} | :8 3.3{tu 7} 3.3{tu 7} 3.3{tu 7} 3.3{tu 7} 3.3{tu 7} 3.3{tu 7} 3.3{tu 7} :16 3.3{tu 6} 3.3{tu 6} 3.3{tu 6} 3.3{tu 6} 3.3{tu 6} 3.3{tu 6}',
      ),
      engraveFixture('alphatab/guitarpro7/tuplets.gp'),
      engraveFixture('alphatab/guitarpro7/effects.gp'),
    ];
    const seen = new Set<string>();
    for (const view of views) {
      const labels = tupletLabels(view);
      const groups = new Map<alphaTab.model.TupletGroup, Beat[]>();
      for (const beat of view.beats()) {
        if (beat.tupletGroup === null || beat.tupletNumerator <= 0) continue;
        groups.set(beat.tupletGroup, [...(groups.get(beat.tupletGroup) ?? []), beat]);
      }
      expect(groups.size).toBeGreaterThan(0);
      for (const beats of groups.values()) {
        const first = beats[0];
        const last = beats.at(-1);
        if (first === undefined || last === undefined) continue;
        const left = view.span(first).left;
        const right = view.span(last).right;
        const over = labels.filter(
          label =>
            view.systemOf(label.mark) === view.span(first).system &&
            label.mark.x + label.mark.width / 2 >= left &&
            label.mark.x + label.mark.width / 2 <= right,
        );
        const numerator = String(first.tupletNumerator);
        const ratio = `${numerator}:${first.tupletDenominator}`;
        expect(
          over.map(label => label.text).some(text => text === numerator || text === ratio),
          `${at([first])[0]} ${ratio}`,
        ).toBe(true);
        for (const label of over) seen.add(label.text);
      }
    }
    expect([...seen]).toEqual(expect.arrayContaining(['3', '5', '6', '7', '5:2']));
  });

  it('REND-149: ties join their notes; a note tied over the barline is bracketed on the tab', () => {
    const view = engraveTex(':2 3.3 -.3 | :1 -.3');
    const [first, inBar, overBar] = view.beats();
    if (first === undefined || inBar === undefined || overBar === undefined)
      throw new Error('Three beats expected.');
    // The tied note within the bar is not repeated on the tab; over the barline it is, bracketed.
    expect(texts(view.drawnBy(first))).toEqual(['3']);
    expect(texts(view.drawnBy(inBar))).toEqual([]);
    expect(texts(view.drawnBy(overBar))).toEqual(['(3)']);
    // A tie: a filled curve from one notehead to the next.
    const ties = view.marks.filter(
      mark => mark.kind === 'path' && mark.name === 'fill' && (mark.commands ?? '').includes('C'),
    );
    expect(ties.length).toBeGreaterThanOrEqual(2);
  });

  it('REND-150: dotted and double-dotted notes and rests', () => {
    const view = engraveTex(':4 3.3{d} 3.3.8 3.3{dd} 3.3.16 | r.4{d} r.8 r.2');
    const dots = view
      .beats()
      .map(beat => glyphs(view.drawnBy(beat)).filter(name => name === 'AugmentationDot').length);
    expect(dots).toEqual([1, 0, 2, 0, 1, 0, 0]);
  });

  it('REND-151: rests of every value from whole to 128th; each voice keeps its rests to its side', () => {
    const view = engraveTex(
      ':1 r | :2 r r | :4 r r r r | :8 r r r r r r r r | :16 r | :32 r | :64 r | :128 r',
    );
    const names = [
      'RestWhole',
      'RestHalf',
      'RestQuarter',
      'Rest8th',
      'Rest16th',
      'Rest32nd',
      'Rest64th',
      'Rest128th',
    ];
    const durations = [1, 2, 4, 8, 16, 32, 64, 128];
    for (const beat of view.beats()) {
      const name = names[durations.indexOf(beat.duration)];
      expect(glyphs(view.drawnBy(beat)), at([beat])[0]).toEqual([name]);
    }
    // A lower voice's rest moves below what the first voice holds at that moment: its rest of
    // another length, or its note.
    const piano = (first: string, second: string) =>
      engraveTex(`\\track "Piano"\n\\staff {score}\n\\voice\n${first}\n\\voice\n${second}`);
    const firstOf = (view: Engraving, voice: number) => {
      const beat = view.beats(0, 0, voice)[0];
      if (beat === undefined) throw new Error('A beat expected.');
      const mark = view.drawnBy(beat).find(candidate => candidate.kind === 'glyph');
      if (mark === undefined) throw new Error('A glyph expected.');
      return mark;
    };
    const rests = piano(':2 r :4 C5 C5', ':4 r r :2 C4');
    const half = firstOf(rests, 0);
    const quarter = firstOf(rests, 1);
    expect([half.name, quarter.name]).toEqual(['RestHalf', 'RestQuarter']);
    // Below it by at least two staff spaces (they shared one position before).
    const space = (view: Engraving) => {
      const lines = view.marks
        .filter(mark => mark.kind === 'rect' && mark.width > 100 && mark.height < 2)
        .map(mark => mark.y)
        .sort((a, b) => a - b);
      return (lines[1] ?? 0) - (lines[0] ?? 0);
    };
    expect(quarter.y - half.y).toBeGreaterThanOrEqual(2 * space(rests));
    const underNote = piano(':4 B4 B4 B4 B4', ':4 r E4 E4 E4');
    expect(firstOf(underNote, 1).name).toBe('RestQuarter');
    expect(firstOf(underNote, 1).y - firstOf(underNote, 0).y).toBeGreaterThanOrEqual(2 * space(underNote));
  });

  it('REND-152: fermatas short, medium and long over their beats', () => {
    const { FermataType } = alphaTab.model;
    const view = engraveFixture('alphatab/guitarpro7/fermata.gp');
    const names = new Map([
      [FermataType.Short, 'FermataShortAbove'],
      [FermataType.Medium, 'FermataAbove'],
      [FermataType.Long, 'FermataLongAbove'],
    ]);
    const beats = view.beats();
    for (const [type, name] of names) {
      const expected = at(beats.filter(beat => beat.fermata?.type === type));
      expect(expected.length, name).toBeGreaterThan(0);
      expect([...new Set(placedAt(view, 'glyph', name))], name).toEqual(expected);
    }
  });
});

describe('meter and tempo', () => {
  it('REND-153: time signature changes, common time and cut time', () => {
    const view = engraveFixture('alphatab/guitarpro7/time-signatures.gp');
    const masterBars = view.score.masterBars;
    for (const masterBar of masterBars) {
      const previous = masterBar.previousMasterBar;
      const changed =
        previous?.timeSignatureNumerator !== masterBar.timeSignatureNumerator ||
        previous.timeSignatureDenominator !== masterBar.timeSignatureDenominator;
      const digits = glyphs(
        view.marks.filter(mark => view.barOf(mark) === masterBar.index && mark.name.startsWith('TimeSig')),
      )
        .map(name => name.slice('TimeSig'.length))
        .join('');
      // Numerator over denominator, where the meter changes (on the staff; tablature under a
      // staff does not repeat it, as in Guitar Pro).
      const expected = changed
        ? `${masterBar.timeSignatureNumerator}${masterBar.timeSignatureDenominator}`
        : '';
      expect(digits, `bar ${masterBar.index}`).toBe(expected);
    }
    const xml = (symbol: string, beats: number, type: number) =>
      new TextEncoder().encode(
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time symbol="${symbol}"><beats>${beats}</beats><beat-type>${type}</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>5</octave></pitch><duration>${(4 * beats) / type}</duration><type>whole</type></note></measure></part></score-partwise>`,
      );
    const common = new EngravingOf(openScore(xml('common', 4, 4), 'common.musicxml').score);
    const cut = new EngravingOf(openScore(xml('cut', 2, 2), 'cut.musicxml').score);
    expect(glyphs(common.marks).filter(name => name.startsWith('TimeSig'))).toEqual(['TimeSigCommon']);
    expect(glyphs(cut.marks).filter(name => name.startsWith('TimeSig'))).toEqual(['TimeSigCutCommon']);
  });

  it('REND-154: key signature changes, major and minor, with their sharps and flats', () => {
    const view = engraveFixture('alphatab/guitarpro7/key-signatures.gp');
    const bars = view.score.tracks[0]?.staves[0]?.bars ?? [];
    for (const bar of bars) {
      const previous = bar.previousBar;
      const key = bar.keySignature;
      if (previous !== null && previous.keySignature === key) continue;
      const accidentals = glyphs(
        view.marks.filter(mark => mark.beat === -1 && view.barOf(mark) === bar.index),
      );
      const sharps = accidentals.filter(name => name === 'AccidentalSharp').length;
      const flats = accidentals.filter(name => name === 'AccidentalFlat').length;
      expect([sharps, flats], `bar ${bar.index} key ${key}`).toEqual([Math.max(0, key), Math.max(0, -key)]);
    }
    // Every key from 7 flats to 7 sharps, major and minor.
    const keys = new Set(bars.map(bar => `${bar.keySignature}/${bar.keySignatureType}`));
    expect(keys.size).toBe(30);
  });

  it('REND-155: tempo changes are metronome marks where they happen, with tempo texts', () => {
    const view = engraveFixture('alphatab/guitarpro8/beat-tempo-change.gp');
    const marks = view.marks.filter(mark => mark.kind === 'text' && /^= \d+$/.test(mark.name));
    const expected = view.score.masterBars.flatMap(masterBar =>
      masterBar.tempoAutomations
        .filter(automation => automation.isVisible)
        .map(automation => `= ${automation.value}`),
    );
    expect(marks.map(mark => mark.name)).toEqual(expected);
    expect(view.find('glyph', 'MetNoteQuarterUp')).toHaveLength(expected.length);
    const named = engraveTex('\\tempo (90 "Andante")\n:4 3.3 3.3 3.3 3.3');
    expect(texts(named.marks)).toEqual(expect.arrayContaining(['Andante', '= 90']));
  });

  it('REND-211: tempo marks against any beat unit, played at the right speed', () => {
    const xml = (unit: string, dots: number, perMinute: number) =>
      new TextEncoder().encode(
        `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction placement="above"><direction-type><metronome><beat-unit>${unit}</beat-unit>${'<beat-unit-dot/>'.repeat(dots)}<per-minute>${perMinute}</per-minute></metronome></direction-type></direction><note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note></measure></part></score-partwise>`,
      );
    const marks = (view: Engraving) => ({
      notes: glyphs(view.marks).filter(name => name.startsWith('MetNote') || name === 'MetAugmentationDot'),
      text: texts(view.marks).filter(text => text.startsWith('= ')),
    });
    const cases: [string, number, number, number, string[]][] = [
      ['eighth', 0, 120, 60, ['MetNote8thUp']],
      ['quarter', 0, 96, 96, ['MetNoteQuarterUp']],
      ['quarter', 1, 60, 90, ['MetNoteQuarterUp', 'MetAugmentationDot']],
      ['half', 0, 60, 120, ['MetNoteHalfUp']],
      ['half', 1, 40, 120, ['MetNoteHalfUp', 'MetAugmentationDot']],
    ];
    for (const [unit, dots, perMinute, quarters, notes] of cases) {
      const label = `${unit}${'.'.repeat(dots)} = ${perMinute}`;
      const { score } = openScore(xml(unit, dots, perMinute), 'tempo.musicxml');
      // Played in quarters a minute…
      expect(score.tempo, label).toBe(quarters);
      // …written as in the file.
      expect(marks(new EngravingOf(score)), label).toEqual({ notes, text: [`= ${perMinute}`] });
    }
    // A Guitar Pro 7+ file keeps the unit when saved and opened again.
    const { score } = openScore(xml('quarter', 1, 60), 'tempo.musicxml');
    const saved = new alphaTab.exporter.Gp7Exporter().export(score, new alphaTab.Settings());
    const reopened = openScore(saved, 'tempo.gp').score;
    expect(reopened.tempo).toBe(90);
    expect(marks(new EngravingOf(reopened))).toEqual({
      notes: ['MetNoteQuarterUp', 'MetAugmentationDot'],
      text: ['= 60'],
    });
  });

  it('REND-157: triplet feel is shown as two eighths equal to a triplet', () => {
    const view = engraveTex('\\tf triplet-8th\n:8 3.3 3.3 3.3 3.3 3.3 3.3 3.3 3.3');
    expect(glyphs(view.marks)).toEqual(
      expect.arrayContaining(['MetNoteQuarterUp', 'MetNote8thUp', 'Tuplet3']),
    );
    expect(texts(view.marks)).toEqual(expect.arrayContaining(['(', '=', ')']));
  });

  it('REND-159: free time is written where it starts', () => {
    const view = engraveTex('\\ft\n:4 3.3 3.3 3.3 3.3 3.3 3.3');
    expect(view.barsWith('text', 'Free time')).toEqual([0]);
  });
});

describe('form', () => {
  it('REND-160: repeats show their dots and how many times they are played', () => {
    const view = engraveFixture('alphatab/guitarpro7/repeat-close-multi.gp');
    const closing = view.score.masterBars.filter(masterBar => masterBar.repeatCount > 0);
    expect(closing.map(masterBar => masterBar.repeatCount)).toEqual([4]);
    // "x4" over the closing repeat, on both staves.
    expect(view.barsWith('text', 'x4')).toEqual([1, 1]);
    // Two dots on each staff at each end of the repeated passage.
    expect(view.find('glyph', 'RepeatDot')).toHaveLength(8);
  });

  it('REND-161: alternate endings are bracketed and numbered', () => {
    const view = engraveFixture('alphatab/guitarpro7/repeat-close-alternate-endings.gp');
    const labels = view.score.masterBars
      .filter(masterBar => masterBar.alternateEndings !== 0)
      .map(masterBar => {
        const endings: number[] = [];
        for (let bit = 0; bit < 8; bit++)
          if ((masterBar.alternateEndings & (1 << bit)) !== 0) endings.push(bit + 1);
        return { bar: masterBar.index, text: endings.map(ending => `${ending}.`).join(' ') };
      });
    expect(labels).toEqual([
      { bar: 1, text: '1. 3.' },
      { bar: 2, text: '2.' },
    ]);
    for (const { bar, text } of labels) expect(view.barsWith('text', text)).toEqual([bar]);
  });

  it('REND-162…REND-165: segno, coda and their doubles, Fine, To Coda, and every D.C. and D.S.', () => {
    const { Direction } = alphaTab.model;
    const view = engraveFixture('alphatab/guitarpro8/directions.gp');
    const words = new Map<number, string>([
      [Direction.TargetFine, 'Fine'],
      [Direction.JumpDaCapo, 'D.C.'],
      [Direction.JumpDaCapoAlCoda, 'D.C. al Coda'],
      [Direction.JumpDaCapoAlDoubleCoda, 'D.C. al Double Coda'],
      [Direction.JumpDaCapoAlFine, 'D.C. al Fine'],
      [Direction.JumpDalSegno, 'D.S.'],
      [Direction.JumpDalSegnoAlCoda, 'D.S. al Coda'],
      [Direction.JumpDalSegnoAlDoubleCoda, 'D.S. al Double Coda'],
      [Direction.JumpDalSegnoAlFine, 'D.S. al Fine'],
      [Direction.JumpDalSegnoSegno, 'D.S.S.'],
      [Direction.JumpDalSegnoSegnoAlCoda, 'D.S.S. al Coda'],
      [Direction.JumpDalSegnoSegnoAlDoubleCoda, 'D.S.S. al Double Coda'],
      [Direction.JumpDalSegnoSegnoAlFine, 'D.S.S. al Fine'],
      [Direction.JumpDaCoda, 'To Coda'],
      [Direction.JumpDaDoubleCoda, 'To Double Coda'],
    ]);
    const signs = new Map<number, [string, number]>([
      [Direction.TargetSegno, ['Segno', 1]],
      [Direction.TargetSegnoSegno, ['Segno', 2]],
      [Direction.TargetCoda, ['Coda', 1]],
      [Direction.TargetDoubleCoda, ['Coda', 2]],
    ]);
    const seen = new Set<number>();
    for (const masterBar of view.score.masterBars) {
      const expectedSigns = new Map<string, number>();
      for (const direction of masterBar.directions ?? []) {
        seen.add(direction);
        // Jumps are written at the end of their bar, targets where the bar starts.
        const word = words.get(direction);
        const by = direction === Direction.TargetFine ? 'centre' : 'end';
        if (word !== undefined) expect(view.barsWith('text', word, by), word).toContain(masterBar.index);
        const sign = signs.get(direction);
        if (sign !== undefined) expectedSigns.set(sign[0], (expectedSigns.get(sign[0]) ?? 0) + sign[1]);
      }
      // Segno and coda signs stand on the bar's opening barline.
      for (const name of ['Segno', 'Coda']) {
        const drawn = view
          .find('glyph', name)
          .filter(mark => view.barStartNear(mark) === masterBar.index).length;
        expect(drawn, `bar ${masterBar.index} ${name}`).toBe(expectedSigns.get(name) ?? 0);
      }
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([...words.keys(), ...signs.keys()].sort((a, b) => a - b));
  });

  it('REND-166, REND-168: sections are named where they start, texts over their beats', () => {
    const view = engraveTex(
      '\\section "Intro"\n:4 3.3 3.3 3.3 3.3 | \\section B "Verse" 3.3 3.3{txt "hello"} 3.3 3.3',
    );
    expect(view.barsWith('text', 'Intro')).toEqual([0]);
    expect(view.barsWith('text', '[B] Verse')).toEqual([1]);
    expect(placedAt(view, 'text', 'hello')).toEqual(['1:1']);
    const file = engraveFixture('alphatab/guitarpro7/other-effects.gp');
    expect(placedAt(file, 'text', 'Text')).toEqual(at(file.beats().filter(beat => beat.text === 'Text')));
  });
});
