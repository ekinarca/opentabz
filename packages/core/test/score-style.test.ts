/**
 * The stylesheet (REND-218…): what a Guitar Pro file asks for is read and honoured (REND-219), and
 * each setting changed for a view shows in the engraving: brackets (REND-233), barlines through
 * the staves (REND-230), the system separator (REND-234), track names (REND-235), multi-bar rests
 * (REND-311), staves left out while they rest (REND-320), dynamics, the tuning legend, chord
 * diagrams, the overall scale and the rhythmic spacing (REND-223, REND-224), the staff lines'
 * thickness, the space between systems and the first system's indent (REND-228).
 */
import * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { RenderSession } from '../src/render/session.ts';
import { readScoreStyle } from '../src/render/style.ts';
import { BOUNDS_SYSTEM_STRIDE } from '../src/shared/playback.ts';
import { DEFAULT_SCORE_STYLE, type ScoreStyle } from '../src/shared/style.ts';
import { engraveFixture, engraveTex, glyphs, GUITAR, texts, type Engraving } from './engraving.ts';
import { readFixture } from './helpers.ts';

function fileStyle(path: string): ScoreStyle {
  return readScoreStyle(openScore(readFixture(path), path.split('/').at(-1) ?? path).score);
}

/** A fixture engraved with its own style, changed as given. */
function engraveStyled(path: string, changes: Partial<ScoreStyle>, trackIndexes = [0]): Engraving {
  return engraveFixture(path, { trackIndexes, style: { ...fileStyle(path), ...changes } });
}

function count(view: Engraving, name: string): number {
  return glyphs(view.marks).filter(glyph => glyph === name).length;
}

function textCount(view: Engraving, text: string): number {
  return texts(view.marks).filter(candidate => candidate === text).length;
}

/** Systems of the view (bars carry the system they are on). */
function systems(view: Engraving): number {
  return new Set(view.bars.map(bar => bar.system)).size;
}

describe('the stylesheet a file brings (REND-219)', () => {
  it('reads Guitar Pro 8 stylesheets', () => {
    expect(fileStyle('alphatab/guitarpro8/extended-barlines.gp')).toMatchObject({
      extendBarLines: true,
      brackets: 'none',
      hideDynamics: true,
    });
    expect(fileStyle('alphatab/guitarpro8/hide-tuning.gp').tuning).toBe(false);
    expect(fileStyle('alphatab/guitarpro8/hide-diagrams.gp').chordDiagramsOnTop).toBe(false);
    expect(fileStyle('alphatab/guitarpro8/show-diagrams-in-score.gp').chordDiagramsInScore).toBe(true);
    expect(fileStyle('alphatab/guitarpro8/multibar-rest.gp').multiBarRests).toBe(true);
    expect(fileStyle('alphatab/guitarpro8/track-names-hidden.gp').singleTrackNames).toBe('hidden');
    expect(fileStyle('alphatab/guitarpro8/track-names.gp')).toMatchObject({
      singleTrackNames: 'all',
      firstSystemNames: 'full',
      firstSystemNamesOrientation: 'horizontal',
    });
  });

  it('takes alphaTab’s defaults for a score without one, but its own title block lines', () => {
    const style = fileStyle('alphatex/demos/twelve-bar-shuffle.atex');
    expect({ ...style, titleBlock: DEFAULT_SCORE_STYLE.titleBlock }).toEqual(DEFAULT_SCORE_STYLE);
    expect(style.titleBlock.copyright2.template).toBe('Free to play, share and adapt.');
  });

  it('engraves as the file says when the view asks for nothing else', () => {
    expect(texts(engraveFixture('alphatab/guitarpro8/hide-tuning.gp').marks)).not.toContain(
      'Guitar Standard Tuning',
    );
    expect(textCount(engraveFixture('alphatab/guitarpro8/track-names.gp'), 'Steel Guitar')).toBe(1);
  });
});

describe('settings changed for a view (REND-218)', () => {
  it('shows or hides the tuning legend', () => {
    const shown = engraveStyled('alphatab/guitarpro8/hide-tuning.gp', { tuning: true });
    expect(texts(shown.marks)).toContain('Guitar Standard Tuning');
  });

  it('writes track names on every system, the first only, or nowhere; full or short (REND-235)', () => {
    const path = 'alphatab/guitarpro8/track-names.gp';
    expect(textCount(engraveStyled(path, {}), 'Steel Guitar')).toBe(1);
    expect(textCount(engraveStyled(path, { singleTrackNames: 'hidden' }), 'Steel Guitar')).toBe(0);
    const short = engraveStyled(path, { firstSystemNames: 'short' });
    expect(textCount(short, 'Steel Guitar')).toBe(0);
    expect(textCount(short, 's.guit.')).toBe(1);
  });

  it('hides dynamics', () => {
    const tex = `${GUITAR}\n:4 0.6{dy ff} 0.6 0.6{dy pp} 0.6 |`;
    expect(count(engraveTex(tex), 'DynamicFF')).toBe(1);
    const hidden = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, hideDynamics: true } });
    expect(count(hidden, 'DynamicFF')).toBe(0);
    expect(count(hidden, 'DynamicPP')).toBe(0);
  });

  it('draws brackets around a track’s staves, or none (REND-233)', () => {
    const tex = `${GUITAR}\n:4 0.6 0.6 0.6 0.6 |`;
    expect(count(engraveTex(tex), 'BracketTop')).toBe(1);
    expect(
      count(engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, brackets: 'none' } }), 'BracketTop'),
    ).toBe(0);
  });

  it('runs barlines through all the staves of a system (REND-230)', () => {
    const path = 'alphatab/guitarpro8/extended-barlines.gp';
    // Barlines are thin rectangles: through the staves they reach down to the next staff.
    const tallest = (view: Engraving) =>
      Math.max(...view.marks.filter(mark => mark.kind === 'rect' && mark.width < 3).map(mark => mark.height));
    const through = engraveStyled(path, {}, [0, 1]);
    const apart = engraveStyled(path, { extendBarLines: false }, [0, 1]);
    expect(tallest(through)).toBeGreaterThan(tallest(apart) + 10);
  });

  it('separates the systems of several tracks with the // sign (REND-234)', () => {
    const path = 'alphatab/guitarpro8/extended-barlines.gp';
    const narrow = (style: Partial<ScoreStyle>) =>
      engraveFixture(path, { trackIndexes: [0, 1], width: 500, style: { ...fileStyle(path), ...style } });
    expect(systems(narrow({}))).toBeGreaterThan(1);
    expect(count(narrow({}), 'SystemDivider')).toBe(0);
    expect(count(narrow({ systemSeparator: true }), 'SystemDivider')).toBe(systems(narrow({})));
  });

  it('gathers bars of rest into multi-bar rests, or not (REND-311)', () => {
    const tex = [
      '\\track "Lead"',
      '\\staff {score}',
      ':4 C4 D4 E4 F4 |',
      'r.1 | r.1 | r.1 | r.1 |',
      ':4 C4 D4 E4 F4 |',
    ].join('\n');
    const apart = engraveTex(tex);
    const gathered = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, multiBarRests: true } });
    expect(count(apart, 'RestWhole')).toBe(4);
    expect(count(gathered, 'RestWhole')).toBe(0);
    expect(count(gathered, 'RestHBarLeft')).toBe(1);
    expect(gathered.bars).toHaveLength(3);
    expect(apart.bars).toHaveLength(6);
  });

  it('leaves out staves that rest for a whole system (REND-320)', () => {
    // Two tracks; the second rests from the third bar on.
    const tex = [
      '\\track "Lead"',
      '\\staff {score}',
      ...Array.from({ length: 12 }, () => ':4 C4 D4 E4 F4 |'),
      '\\track "Rhythm"',
      '\\staff {score}',
      ':4 C3 D3 E3 F3 |',
      ':4 C3 D3 E3 F3 |',
      ...Array.from({ length: 10 }, () => 'r.1 |'),
    ].join('\n');
    const height = (view: Engraving) => {
      const top = Math.min(...view.marks.filter(mark => mark.partial === 'system').map(mark => mark.y));
      const bottom = Math.max(
        ...view.marks.filter(mark => mark.partial === 'system').map(mark => mark.y + mark.height),
      );
      return bottom - top;
    };
    const all = engraveTex(tex, { trackIndexes: [0, 1], width: 600 });
    const lean = engraveTex(tex, {
      trackIndexes: [0, 1],
      width: 600,
      style: { ...DEFAULT_SCORE_STYLE, hideEmptyStaves: true },
    });
    expect(systems(all)).toBeGreaterThan(2);
    expect(height(lean)).toBeLessThan(height(all));
  });

  it('places chord diagrams above the music, above their beats, or both', () => {
    const path = 'alphatab/guitarpro8/show-diagrams-in-score.gp';
    const inScore = engraveStyled(path, {});
    const header = (view: Engraving) =>
      view.marks.filter(mark => mark.partial === 'header' && mark.name === 'FretboardFilledCircle');
    const system = (view: Engraving) =>
      view.marks.filter(mark => mark.partial === 'system' && mark.name === 'FretboardFilledCircle');
    expect(system(inScore).length).toBeGreaterThan(0);
    const onTop = engraveStyled(path, { chordDiagramsInScore: false, chordDiagramsOnTop: true });
    expect(system(onTop)).toHaveLength(0);
    expect(header(onTop).length).toBeGreaterThan(0);
    const both = engraveStyled(path, { chordDiagramsInScore: true, chordDiagramsOnTop: true });
    expect(system(both).length).toBeGreaterThan(0);
    expect(header(both).length).toBeGreaterThan(0);
  });

  it('scales the whole score, keeping the text’s size on request (REND-223)', () => {
    const tex = `\\title "Scaled"\n${GUITAR}\n:4 0.6 0.6 0.6 0.6 |`;
    const titleHeight = (view: Engraving) => view.marks.find(mark => mark.name === 'Scaled')?.height ?? 0;
    const clefSize = (view: Engraving) => view.marks.find(mark => mark.name === 'GClef')?.height ?? 0;
    const plain = engraveTex(tex);
    const big = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, scale: 1.5 } });
    const bigNotes = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, scale: 1.5, keepTextSize: true } });
    expect(clefSize(big)).toBeCloseTo(clefSize(plain) * 1.5, 0);
    expect(titleHeight(big)).toBeCloseTo(titleHeight(plain) * 1.5, 0);
    expect(clefSize(bigNotes)).toBeCloseTo(clefSize(plain) * 1.5, 0);
    expect(titleHeight(bigNotes)).toBeCloseTo(titleHeight(plain), 0);
  });

  it('draws the staff lines thinner or thicker (REND-228)', () => {
    const tex = `${GUITAR}\n:4 0.6 0.6 0.6 0.6 |`;
    const lines = (view: Engraving) =>
      view.marks
        .filter(mark => mark.kind === 'rect' && mark.width > 100 && mark.height < 10)
        .map(mark => mark.height);
    const usual = lines(engraveTex(tex));
    const thick = lines(engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, staffLineThickness: 2 } }));
    // The staff's five lines, and the tablature's but where fret numbers break one.
    expect(usual.length).toBeGreaterThanOrEqual(10);
    expect(thick).toHaveLength(usual.length);
    thick.forEach((height, index) => {
      expect(height).toBeCloseTo((usual[index] ?? 0) * 2, 5);
    });
    // Other views keep alphaTab's own.
    expect(lines(engraveTex(tex))).toEqual(usual);
    expect(alphaTab.EngravingSettings.bravuraDefaults.staffLineThickness).toBeCloseTo(usual[0] ?? 0, 5);
  });

  it('sets the systems closer together or further apart (REND-228)', () => {
    const tex = `${GUITAR}\n${Array.from({ length: 24 }, () => ':4 0.6 0.6 0.6 0.6 |').join('\n')}`;
    const { score } = openScore(new TextEncoder().encode(tex), 'spacing.atex');
    const tops = (systemSpacing: number) => {
      const session = new RenderSession(score, {
        trackIndexes: [0],
        layout: 'page',
        systemsLayout: 'auto',
        staffDisplay: 'default',
        width: 700,
        notationScale: 1,
        style: { ...DEFAULT_SCORE_STYLE, systemSpacing },
      });
      try {
        const { systems: bounds } = session.layout().bounds;
        return Array.from(bounds).filter((_, index) => index % BOUNDS_SYSTEM_STRIDE === 1);
      } finally {
        session.dispose();
      }
    };
    const gaps = (values: number[]) => values.slice(1).map((top, index) => top - (values[index] ?? 0));
    const usual = gaps(tops(1));
    expect(usual.length).toBeGreaterThan(2);
    // alphaTab keeps 10 px above and below each system: twice as much, or none.
    gaps(tops(2)).forEach((gap, index) => {
      expect(gap).toBeCloseTo((usual[index] ?? 0) + 20, 5);
    });
    gaps(tops(0)).forEach((gap, index) => {
      expect(gap).toBeCloseTo((usual[index] ?? 0) - 20, 5);
    });
  });

  it('indents the first system, narrowing it (REND-228)', () => {
    const tex = `${GUITAR}\n${Array.from({ length: 24 }, () => ':4 0.6 0.6 0.6 0.6 |').join('\n')}`;
    const firstBars = (view: Engraving) =>
      [0, 1].map(system => view.bars.find(bar => bar.system === system)?.left ?? NaN);
    const lastRight = (view: Engraving, system: number) =>
      Math.max(...view.bars.filter(bar => bar.system === system).map(bar => bar.right));
    const usual = engraveTex(tex, { width: 700 });
    const indented = engraveTex(tex, {
      width: 700,
      style: { ...DEFAULT_SCORE_STYLE, firstSystemIndent: 20 },
    });
    const indent = (20 * 96) / 25.4;
    const [usualFirst = 0, usualSecond = 0] = firstBars(usual);
    const [first = 0, second = 0] = firstBars(indented);
    expect(first - usualFirst).toBeCloseTo(indent, 0);
    expect(second).toBeCloseTo(usualSecond, 5);
    // The first system ends where the others do: it is narrower, not pushed out.
    expect(lastRight(indented, 0)).toBeCloseTo(lastRight(usual, 0), 0);
    expect(lastRight(indented, 1)).toBeCloseTo(lastRight(usual, 1), 0);
  });

  it('gives the durations more or less room across the page (REND-224)', () => {
    const tex = `${GUITAR}\n${Array.from({ length: 16 }, () => ':8 0.6 0.6 0.6 0.6 0.6 0.6 0.6 0.6 |').join('\n')}`;
    const roomy = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, spacing: 2 } });
    const tight = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, spacing: 0.5 } });
    expect(systems(roomy)).toBeGreaterThan(systems(engraveTex(tex)));
    expect(systems(tight)).toBeLessThan(systems(engraveTex(tex)));
  });
});
