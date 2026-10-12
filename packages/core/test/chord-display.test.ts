/**
 * What each chord shows (REND-208): its name, its diagram and its fingering, as the file asks.
 * The fingering, read alike from Guitar Pro 5, 6 and 7+ files, is written under the diagram,
 * each finger under its string (T for the thumb), mirrored with the diagram for left-handed
 * players. A chord whose name is hidden shows only its diagram, one whose diagram is hidden only
 * its name.
 */
import type * as alphaTab from '@coderline/alphatab';
import { describe, expect, it } from 'vitest';
import { openScore } from '../src/open/open.ts';
import { DEFAULT_SCORE_STYLE } from '../src/shared/style.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { Engraving, engraveTex, GUITAR, type Mark } from './engraving.ts';
import { readFixture } from './helpers.ts';

function chordsOf(path: string): alphaTab.model.Chord[] {
  const { score } = openScore(readFixture(path), path);
  return score.tracks.flatMap(track => track.staves.flatMap(staff => [...(staff.chords?.values() ?? [])]));
}

function engrave(path: string, options: Partial<ViewOptions> = {}): Engraving {
  return new Engraving(openScore(readFixture(path), path).score, options);
}

const centre = (mark: Mark) => mark.x + mark.width / 2;

/** The marks of the first diagram named `name` in a part of the page: its dots and its fingers. */
function diagram(view: Engraving, name: string, partial: Mark['partial'] = 'header') {
  const title = view.marks
    .filter(mark => mark.partial === partial && mark.kind === 'text' && mark.name === name)
    .sort((a, b) => a.x - b.x)[0];
  if (title === undefined) throw new Error(`No diagram named ${name}.`);
  const near = view.marks.filter(
    mark => mark.partial === partial && Math.abs(centre(mark) - centre(title)) < 28 && mark.y > title.y,
  );
  const dots = near.filter(mark => mark.name === 'FretboardFilledCircle');
  const bottom = Math.max(...near.filter(mark => mark.kind === 'rect').map(mark => mark.y + mark.height));
  // Under the grid: the fingering.
  const fingers = near.filter(mark => mark.kind === 'text' && mark.y > bottom).sort((a, b) => a.x - b.x);
  return { dots, fingers };
}

describe('what each chord shows (REND-208)', () => {
  it('reads the fingering from Guitar Pro 5, 6 and 7+ files alike', () => {
    // From the highest string: −1 no finger, 0 the thumb, 1 to 4 the fingers.
    const expected = [
      ['C', [-1, 1, -1, 2, 3, -1]],
      ['Cm', [-1, -1, -1, 1, 4, -1]],
      ['C', [1, 4, 3, 2, 1, -1]],
      ['Cm', [1, 2, 4, 3, 1, -1]],
      ['D', [1, 2, 1, -1, -1, -1]],
      ['Dm', [1, 3, 2, -1, -1, -1]],
      ['D', [1, 4, 3, 2, 1, -1]],
      ['Dm', [1, 2, 4, 3, 1, -1]],
    ];
    for (const path of [
      'alphatab/guitarpro5/chords.gp5',
      'alphatab/guitarpro6/chords.gpx',
      'alphatab/guitarpro7/chords.gp',
    ]) {
      const chords = chordsOf(path);
      expect(chords.map(chord => [chord.name, chord.fingers])).toEqual(expected);
      expect(chords.every(chord => chord.showFingering)).toBe(true);
    }
    // Guitar Pro 5 says whether the fingering is shown, too.
    expect(chordsOf('alphatab/guitarpro5/hide-diagrams.gp5').map(chord => chord.showFingering)).toEqual([
      false,
      false,
    ]);
  });

  it('writes the fingering under the diagram, each finger under its string', () => {
    const view = engrave('alphatab/guitarpro7/chords.gp');
    // C: the third finger on the fifth string, the second on the fourth, the first on the second.
    const { dots, fingers } = diagram(view, 'C');
    expect(fingers.map(finger => finger.name)).toEqual(['3', '2', '1']);
    for (const finger of fingers)
      expect(dots.some(dot => Math.abs(centre(dot) - centre(finger)) < 0.6)).toBe(true);
    // Fretted further up: the dot of the first finger is the highest, the third's the lowest.
    const byFinger = fingers.map(finger => dots.find(dot => Math.abs(centre(dot) - centre(finger)) < 0.6)?.y);
    expect(byFinger[2]).toBeLessThan(byFinger[1] ?? 0);
    expect(byFinger[1]).toBeLessThan(byFinger[0] ?? 0);
  });

  it('mirrors the fingering with the diagram for left-handed players', () => {
    const { dots, fingers } = diagram(engrave('alphatab/guitarpro7/chords.gp', { leftHanded: true }), 'C');
    expect(fingers.map(finger => finger.name)).toEqual(['1', '2', '3']);
    for (const finger of fingers)
      expect(dots.some(dot => Math.abs(centre(dot) - centre(finger)) < 0.6)).toBe(true);
  });

  it('leaves the fingering out when the chord does not show it', () => {
    // The same C, its fingering hidden: in the score above its beat.
    const view = engrave('alphatab/guitarpro8/show-diagrams-in-score.gp');
    const { dots, fingers } = diagram(view, 'C', 'system');
    expect(dots).toHaveLength(3);
    expect(fingers).toEqual([]);
  });

  it('shows only the name, or only the diagram, as the chord asks', () => {
    const tex = [
      GUITAR,
      '\\chord {showname false} ("A" 0 2 2 2 0 x)',
      '\\chord {showdiagram false} ("D" 2 3 2 0 x x)',
      ':1 (0.5 2.4 2.3 2.2 0.1){ch "A"} | (0.4 2.3 3.2 2.1){ch "D"} |',
    ].join('\n');
    const names = (view: Engraving, partial: Mark['partial']) =>
      view.marks
        .filter(mark => mark.partial === partial && mark.kind === 'text' && /^[AD]$/.test(mark.name))
        .map(mark => mark.name);
    const muted = (view: Engraving, partial: Mark['partial']) =>
      view.marks.filter(mark => mark.partial === partial && mark.name === 'FretboardX').length;

    // Above the music: A's diagram without its name, and no diagram of D; over the beats only D's name.
    const top = engraveTex(tex);
    expect(names(top, 'header')).toEqual([]);
    expect(muted(top, 'header')).toBe(1);
    expect(names(top, 'system')).toEqual(['D']);
    expect(muted(top, 'system')).toBe(0);

    // Diagrams above their beats: A's diagram, nameless, and D's name alone.
    const inScore = engraveTex(tex, { style: { ...DEFAULT_SCORE_STYLE, chordDiagramsInScore: true } });
    expect(names(inScore, 'system')).toEqual(['D']);
    expect(muted(inScore, 'system')).toBe(1);
  });
});
