/**
 * What the stylesheet shows or leaves out (REND-207, REND-210, REND-240, REND-248, REND-249,
 * REND-250), and transposing instruments written at concert pitch or as their parts read
 * (REND-032).
 */
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { RenderSession } from '../src/render/session.ts';
import { readScoreStyle } from '../src/render/style.ts';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveFixture, engraveTex, glyphs, GUITAR, texts, type Engraving } from './engraving.ts';

function count(view: Engraving, name: string): number {
  return glyphs(view.marks).filter(glyph => glyph === name).length;
}

describe('notation shown or left out', () => {
  it('leaves the bracketed comments of lyrics out of the score (REND-207)', () => {
    const written = texts(engraveFixture('alphatex/views/lyrics.atex').marks);
    expect(written).toContain('Morn-');
    expect(written.some(text => /Verse|Chorus|\[/.test(text))).toBe(false);
  });

  it('shows or hides tempo marks (REND-210)', () => {
    const tex = `\\tempo 120\n${GUITAR}\n:4 0.6 0.6 0.6 0.6 | \\tempo 90 0.6 0.6 0.6 0.6 |`;
    expect(count(engraveTex(tex), 'MetNoteQuarterUp')).toBe(2);
    const hidden = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, tempoMarks: false } });
    expect(count(hidden, 'MetNoteQuarterUp')).toBe(0);
    expect(texts(hidden.marks).some(text => text.includes('= 90'))).toBe(false);
  });

  it('writes tempo marks with their decimals, or rounded (REND-240)', () => {
    const tex = `\\tempo 92.5\n${GUITAR}\n:4 0.6 0.6 0.6 0.6 | \\tempo 120.25 0.6 0.6 0.6 0.6 |`;
    const tempos = (view: Engraving) => texts(view.marks).filter(text => text.startsWith('= '));
    expect(tempos(engraveTex(tex))).toEqual(['= 92.5', '= 120.25']);
    const rounded = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, tempoDecimals: false } });
    expect(tempos(rounded)).toEqual(['= 93', '= 120']);
    // The music plays at the tempo written all the same.
    expect(rounded.score.masterBars[0]?.tempoAutomations[0]?.value).toBe(92.5);
  });

  it('shows or hides lyrics', () => {
    const hidden = engraveFixture('alphatex/views/lyrics.atex', {
      style: { ...DEFAULT_SCORE_STYLE, lyrics: false },
    });
    expect(texts(hidden.marks)).not.toContain('Morn-');
  });
});

describe('the stylesheet’s notation switches (REND-248)', () => {
  const PIANO = '\\track "Piano"\n\\staff {score}';

  it('writes 4/4 and 2/2 as C and cut C, or in numbers, as asked', () => {
    const tex = `${PIANO}\n\\ts (4 4)\n:4 C4 C4 C4 C4 | \\ts (2 2) :2 C4 C4 | \\ts (3 4) :4 C4 C4 C4 |`;
    const signs = (view: Engraving) => glyphs(view.marks).filter(name => name.startsWith('TimeSig'));
    expect(signs(engraveTex(tex))).toEqual([
      'TimeSig4',
      'TimeSig4',
      'TimeSig2',
      'TimeSig2',
      'TimeSig3',
      'TimeSig4',
    ]);
    const symbols = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, commonTime: true } });
    expect(signs(symbols)).toEqual(['TimeSigCommon', 'TimeSigCutCommon', 'TimeSig3', 'TimeSig4']);
    // The score keeps what it was given.
    expect(symbols.score.masterBars.map(bar => bar.timeSignatureCommon)).toEqual([false, false, false]);
    // A file that writes C keeps it, unless the stylesheet says numbers.
    const written = `${PIANO}\n\\ts common\n:4 C4 C4 C4 C4 |`;
    expect(signs(engraveTex(written))).toEqual(['TimeSigCommon']);
    const numbers = engraveTex(written, { style: { ...DEFAULT_SCORE_STYLE, commonTime: false } });
    expect(readScoreStyle(numbers.score).commonTime).toBe(true);
    expect(signs(numbers)).toEqual(['TimeSig4', 'TimeSig4']);
  });

  it('writes the pitch a bend reaches, or only the note played', () => {
    const tex = ':4 7.3{b (0 4)} 7.3 7.3 7.3 |';
    const heads = (view: Engraving) => glyphs(view.marks).filter(name => name === 'NoteheadBlack').length;
    const reached = engraveTex(tex);
    const played = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, bentPitch: false } });
    // The bent note's target, a small note after it, is left out.
    expect(heads(played)).toBe(4);
    expect(heads(reached)).toBeGreaterThan(4);
  });

  it('leaves out the rests of voices 2 to 4 on request, and keeps the first voice’s', () => {
    const tex = `${PIANO}\n\\voice\n:4 C5 D5 r F5 |\n\\voice\n:4 r r C4 r |`;
    const rests = (view: Engraving) => glyphs(view.marks).filter(name => name.startsWith('Rest')).length;
    expect(rests(engraveTex(tex))).toBe(4);
    const hidden = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, hideExtraRests: true } });
    expect(rests(hidden)).toBe(1);
    expect(hidden.score.tracks[0]?.staves[0]?.bars[0]?.voices[1]?.beats.some(beat => beat.isEmpty)).toBe(
      false,
    );
  });

  it('brackets tuplets, or writes their numbers alone', () => {
    const tex = `${PIANO}\n:8 C5{tu 3} r{tu 3} E5{tu 3} :4 C5 C5 C5 |`;
    const brackets = (view: Engraving) =>
      view.marks.filter(mark => mark.kind === 'path' && mark.name === 'stroke' && mark.commands === 'MLLMLL')
        .length;
    const bracketed = engraveTex(tex);
    const bare = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, tupletBrackets: false } });
    expect(brackets(bracketed)).toBe(1);
    expect(brackets(bare)).toBe(0);
    expect(glyphs(bare.marks)).toContain('Tuplet3');
  });
});

describe('the stylesheet’s technique and tablature switches (REND-249, REND-250)', () => {
  const style = (changes: Partial<ScoreStyle>) => ({ style: { ...DEFAULT_SCORE_STYLE, ...changes } });

  it('draws arpeggios with or without arrowheads; strums keep theirs (REND-249)', () => {
    const tex = ':4 (0.6 2.5 2.4){au} (0.6 2.5 2.4){ad} (0.6 2.5 2.4){bu} r |';
    const arrowheads = (view: Engraving) =>
      view.marks.filter(mark => mark.kind === 'path' && mark.name === 'fill' && mark.commands === 'MLLz')
        .length;
    // Arpeggios up and down on the staff and the tablature, and the strum on the tablature.
    expect(arrowheads(engraveTex(tex))).toBe(5);
    expect(arrowheads(engraveTex(tex, style({ arpeggioArrows: false })))).toBe(1);
  });

  it('writes a trill’s second note and "sl." over slides, or leaves them out (REND-249)', () => {
    const trill = ':4 3.3{tr (5 16)} 3.3 3.3 3.3 |';
    expect(texts(engraveTex(trill).marks)).toContain('(5)');
    expect(texts(engraveTex(trill, style({ trillNote: false })).marks)).not.toContain('(5)');
    const slide = ':4 5.3{sl} 7.3 5.3 5.3 |';
    expect(texts(engraveTex(slide).marks).filter(text => text === 'sl.')).toHaveLength(2);
    expect(texts(engraveTex(slide, style({ slideLabel: false })).marks)).not.toContain('sl.');
  });

  it('writes every tied note’s fret in the tablature on request (REND-250)', () => {
    const tex = ':2 5.3 -.3 | 5.3 5.3 |';
    expect(texts(engraveTex(tex).marks)).not.toContain('(5)');
    expect(texts(engraveTex(tex, style({ tiedTabNotes: true })).marks)).toContain('(5)');
  });

  it('writes quarter rests in the tablature as a dash on request (REND-250)', () => {
    const tex = '\\track "Guitar"\n\\staff {tabs}\n\\tuning (E4 B3 G3 D3 A2 E2)\n:4 5.3 r 5.3 r |';
    const rests = (view: Engraving) => glyphs(view.marks).filter(name => name === 'RestQuarter');
    expect(rests(engraveTex(tex))).toHaveLength(2);
    const dashed = engraveTex(tex, style({ dashQuarterRests: true }));
    expect(rests(dashed)).toHaveLength(0);
    // Two short dashes where the rests were, on the tablature's middle.
    const dashes = dashed.marks.filter(
      mark => mark.kind === 'rect' && mark.width > 4 && mark.width < 20 && mark.height < 4,
    );
    expect(dashes).toHaveLength(2);
  });

  it('colours the tablature frets of voices 2 to 4, the first voice’s staying as they are (REND-250)', () => {
    const tex = `${GUITAR.replace('{score tabs}', '{tabs}')}\n\\voice\n:2 5.3 7.3 |\n\\voice\n:2 0.6 3.6 |`;
    const { score } = openScore(new TextEncoder().encode(tex), 'voices.atex');
    const svg = (voiceColors: boolean) => {
      const session = new RenderSession(score, {
        trackIndexes: [0],
        layout: 'page',
        systemsLayout: 'auto',
        staffDisplay: 'default',
        width: 900,
        notationScale: 1,
        style: { ...DEFAULT_SCORE_STYLE, voiceColors },
      });
      try {
        const layout = session.layout();
        return session
          .paint(layout.partials.map(partial => partial.id))
          .map(painted => painted.svg)
          .join('');
      } finally {
        session.dispose();
      }
    };
    expect(svg(false)).not.toContain('#2E9B4F');
    const colored = svg(true);
    // Voice 2's two frets in green.
    expect(colored.match(/fill="#2E9B4F"[^>]*>[03]</g)).toHaveLength(2);
    // The score keeps its notes' own styles.
    expect(score.tracks[0]?.staves[0]?.bars[0]?.voices[1]?.beats[0]?.notes[0]?.style).toBeUndefined();
  });
});

describe('level beams (REND-246)', () => {
  /** The rise of each beam from its left end to its right, in pixels. */
  function slopes(view: Engraving): number[] {
    return view.marks
      .filter(mark => mark.kind === 'path' && mark.name === 'fill' && mark.commands === 'MLLLz')
      .map(mark => {
        const [first, second] = mark.points ?? [];
        return Math.round(((second?.y ?? 0) - (first?.y ?? 0)) * 100) / 100;
      });
  }
  const style = (changes: Partial<ScoreStyle>) => ({ style: { ...DEFAULT_SCORE_STYLE, ...changes } });

  it('draws the staff’s beams level on request, the drums’ apart', () => {
    const staff = '\\track "Flute"\n\\staff {score}\n:8 C4 E4 G4 C5 C5 G4 E4 C4 |';
    expect(slopes(engraveTex(staff)).some(rise => rise !== 0)).toBe(true);
    const level = slopes(engraveTex(staff, style({ flatBeams: true })));
    expect(level.length).toBeGreaterThan(1);
    expect(level.every(rise => rise === 0)).toBe(true);
    // Drum beams follow their own switch.
    const drums =
      '\\track "Drums" {instrument percussion}\n\\articulation defaults\n:8 KickHit SnareHit CrashHighHit KickHit SnareHit KickHit CrashHighHit SnareHit |';
    expect(slopes(engraveTex(drums, style({ flatBeams: true }))).some(rise => rise !== 0)).toBe(true);
    expect(slopes(engraveTex(drums, style({ flatDrumBeams: true }))).every(rise => rise === 0)).toBe(true);
  });
});

describe('clefs and time signatures at the start of systems and sections (REND-231)', () => {
  // Twelve bars of 3/4 over several systems, a section from the seventh.
  const bars = Array.from(
    { length: 12 },
    (_, index) => `${index === 6 ? '\\section "Bridge" ' : ''}C4 D4 E4 |`,
  );
  const tex = `\\track "Flute"\n\\staff {score}\n\\ts (3 4)\n:4 ${bars.join(' ')}`;
  const view = (changes: Partial<ScoreStyle> = {}) =>
    engraveTex(tex, { width: 500, style: { ...DEFAULT_SCORE_STYLE, ...changes } });
  const count = (engraving: Engraving, name: string) =>
    glyphs(engraving.marks).filter(glyph => glyph === name).length;
  const systems = (engraving: Engraving) => new Set(engraving.bars.map(bar => bar.system)).size;

  it('writes the clef on every system, or on the first only', () => {
    const usual = view();
    expect(systems(usual)).toBeGreaterThan(2);
    expect(count(usual, 'GClef')).toBe(systems(usual));
    expect(count(view({ clefOnEverySystem: false }), 'GClef')).toBe(1);
  });

  it('writes the time signature where it starts, on every system, or at sections too', () => {
    const usual = view();
    // A 3 over a 4, once.
    expect(count(usual, 'TimeSig3')).toBe(1);
    const every = view({ timeSignatureOnEverySystem: true });
    expect(count(every, 'TimeSig3')).toBe(systems(every));
    const sections = view({ timeSignatureAtSections: true });
    expect(count(sections, 'TimeSig3')).toBe(2);
    const seventh = sections.bars.find(bar => bar.index === 6);
    const signs = sections.marks.filter(mark => mark.name === 'TimeSig3');
    expect(
      signs.some(sign => seventh !== undefined && sign.x >= seventh.left && sign.x < seventh.right),
    ).toBe(true);
  });
});

describe('transposing instruments (REND-032)', () => {
  // A B♭ clarinet's part is written a whole tone above what sounds: C major sounds, D major reads.
  const clarinet = [
    '\\track "Clarinet"',
    '\\staff {score}',
    '\\displaytranspose 2',
    '\\ks C',
    ':4 C4 D4 E4 F4 | G4 A4 B4 C5 |',
  ].join('\n');

  it('writes the part as it reads, or at concert pitch', () => {
    const written = engraveTex(clarinet);
    const concert = engraveTex(clarinet, { concertPitch: true });
    // D major: two sharps in the key signature (and none needed in concert C).
    expect(count(written, 'AccidentalSharp')).toBeGreaterThanOrEqual(2);
    expect(count(concert, 'AccidentalSharp')).toBe(0);
    // The notes themselves sit a step higher in the part.
    const heads = (view: Engraving) =>
      view.marks.filter(mark => mark.name === 'NoteheadBlack').map(mark => mark.y);
    const [firstWritten] = heads(written);
    const [firstConcert] = heads(concert);
    expect((firstWritten ?? 0) < (firstConcert ?? 0)).toBe(true);
  });

  it('keeps the octave an instrument reads in, a guitar’s', () => {
    // A guitar's part reads an octave above what sounds: that stays at concert pitch.
    const guitar = `${GUITAR}\n\\displaytranspose -12\n:4 0.6 2.5 2.4 0.3 |`;
    const heads = (view: Engraving) =>
      view.marks.filter(mark => mark.name === 'NoteheadBlack').map(mark => mark.y);
    expect(heads(engraveTex(guitar, { concertPitch: true }))).toEqual(heads(engraveTex(guitar)));
  });

  it('writes every transposing track of a Guitar Pro file at concert pitch', () => {
    const path = 'alphatab/guitarpro8/transposition-tonality-a.gp';
    const tracks = [0, 1, 2, 3, 4, 5];
    const written = engraveFixture(path, { trackIndexes: tracks });
    const concert = engraveFixture(path, { trackIndexes: tracks, concertPitch: true });
    const heads = (view: Engraving) =>
      view.marks.filter(mark => mark.name === 'NoteheadBlack').map(mark => mark.y);
    expect(heads(concert)).not.toEqual(heads(written));
  });
});
