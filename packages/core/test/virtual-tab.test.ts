/**
 * Tablature for any instrument: a piano part shown as tablature on a guitar's strings (REND-190),
 * each note of a chord on a string of its own at a fret that sounds it, near the hand's place;
 * notes no string reaches left out; a drum kit as a drum tablature (REND-191), a line for each
 * sound, its hits written as their MIDI numbers; the score itself left as it was.
 */
import { describe, expect, it } from 'vitest';
import { fretChord, MAX_FRET } from '../src/render/fretting.ts';
import type { TrackStaves } from '../src/shared/view.ts';
import { engraveTex, type Engraving } from './engraving.ts';

const GUITAR = [64, 59, 55, 50, 45, 40];

/** Whether places sound their pitches, each on a string of its own within the frets. */
function sounds(pitches: readonly number[], places: ReturnType<typeof fretChord>, tuning = GUITAR): boolean {
  const strings = places.flatMap(place => (place === null ? [] : [place.string]));
  return (
    new Set(strings).size === strings.length &&
    places.every((place, index) => {
      if (place === null) return true;
      const open = tuning[tuning.length - place.string] ?? 0;
      return place.fret >= 0 && place.fret <= MAX_FRET && open + place.fret === pitches[index];
    })
  );
}

describe('where notes are played on a guitar (REND-190)', () => {
  it('places each note of a chord on a string of its own, near the hand', () => {
    const triad = [60, 64, 67];
    const places = fretChord(triad, GUITAR, 2);
    expect(places.every(place => place !== null)).toBe(true);
    expect(sounds(triad, places)).toBe(true);
    // Near the open position: no fret above the fifth.
    expect(Math.max(...places.map(place => place?.fret ?? 0))).toBeLessThanOrEqual(5);
    // Up the neck, the same chord moves up with the hand.
    const high = fretChord(triad, GUITAR, 12);
    expect(sounds(triad, high)).toBe(true);
    expect(Math.min(...high.map(place => place?.fret ?? 0))).toBeGreaterThan(5);
  });

  it('leaves out what no string reaches, and keeps a tied note where it was', () => {
    // Seven notes on six strings: one left out; a note under the lowest string: left out.
    const seven = [40, 45, 50, 55, 59, 64, 69];
    expect(fretChord(seven, GUITAR, 0).filter(place => place === null)).toHaveLength(1);
    expect(fretChord([30], GUITAR, 0)).toEqual([null]);
    const fixed = new Map([[0, { string: 2, fret: 15 }]]);
    const places = fretChord([60, 64], GUITAR, 2, fixed);
    expect(places[0]).toEqual({ string: 2, fret: 15 });
    expect(sounds([60, 64], places)).toBe(true);
  });
});

const PIANO = [
  '\\track "Piano" {instrument acousticgrandpiano}',
  '\\staff {score}',
  ':4 C4 E4 G4 (C4 E4 G4) | :2 A0 C5 |',
].join('\n');
const WITH_TAB: TrackStaves[] = [
  { trackIndex: 0, standard: true, tablature: true, slash: false, numbered: false },
];

/** The tablature's numbers: each one's line (0 the highest string) and fret, left to right. */
function tablature(view: Engraving) {
  const system = view.marks.filter(mark => mark.partial === 'system');
  const lines = [
    ...new Set(
      system
        .filter(mark => mark.kind === 'rect' && mark.height < 2 && mark.width > 5)
        .map(mark => Math.round(mark.y * 10) / 10),
    ),
  ].sort((a, b) => a - b);
  // The tablature's six lines are the last six.
  const tab = lines.slice(-6);
  return system
    .filter(mark => mark.kind === 'text' && /^\d+$/.test(mark.name) && mark.y >= (tab[0] ?? 0) - 3)
    .map(mark => ({
      x: Math.round(mark.x + mark.width / 2),
      line: tab.reduce(
        (best, y, index) => (Math.abs(y - mark.y) < Math.abs((tab[best] ?? 0) - mark.y) ? index : best),
        0,
      ),
      fret: Number(mark.name),
    }));
}

describe('a piano part as tablature (REND-190)', () => {
  it('writes each note at a string and fret that sound it, chords on strings of their own', () => {
    const view = engraveTex(PIANO, { staves: WITH_TAB });
    const numbers = tablature(view);
    // By beat, left to right: what the numbers sound.
    const beats = new Map<number, number[]>();
    for (const number of numbers) {
      const column = [...beats.keys()].find(x => Math.abs(x - number.x) < 6) ?? number.x;
      beats.set(column, [...(beats.get(column) ?? []), (GUITAR[number.line] ?? 0) + number.fret]);
    }
    const sounding = [...beats.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, pitches]) => pitches.sort((a, b) => a - b));
    // A0 is below any guitar string: left out of the tablature.
    expect(sounding).toEqual([[60], [64], [67], [60, 64, 67], [72]]);
  });

  it('leaves the part as it was: no strings after, the same standard notation', () => {
    const plain = engraveTex(PIANO);
    const tabbed = engraveTex(PIANO, { staves: WITH_TAB });
    const heads = (view: Engraving) =>
      view.marks
        .filter(mark => mark.partial === 'system' && mark.name.startsWith('Notehead'))
        .map(mark => mark.name);
    expect(heads(tabbed)).toEqual(heads(plain));
    const notes = tabbed.beats().flatMap(beat => beat.notes);
    expect(notes.every(note => !note.isStringed)).toBe(true);
    expect(tabbed.score.tracks[0]?.staves[0]?.tuning).toEqual([]);
    expect(tablature(plain)).toEqual([]);
  });
});

const DRUMS = [
  '\\track "Drums" {instrument percussion}',
  '\\articulation defaults',
  ':8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed',
  '(KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatOpen |',
].join('\n');

/** The drum tablature's numbers, each with its line (0 the top one) of the last `count`. */
function drumTablature(view: Engraving, count: number) {
  const system = view.marks.filter(mark => mark.partial === 'system');
  const lines = [
    ...new Set(
      system
        .filter(mark => mark.kind === 'rect' && mark.height < 2 && mark.width > 5)
        .map(mark => Math.round(mark.y * 10) / 10),
    ),
  ].sort((a, b) => a - b);
  const tab = lines.slice(-count);
  return system
    .filter(mark => mark.kind === 'text' && /^\d+$/.test(mark.name) && mark.y >= (tab[0] ?? 0) - 3)
    .map(mark => ({
      line: tab.reduce(
        (best, y, index) => (Math.abs(y - mark.y) < Math.abs((tab[best] ?? 0) - mark.y) ? index : best),
        0,
      ),
      number: Number(mark.name),
    }));
}

describe('a drum kit as tablature (REND-191)', () => {
  it('gives each sound a line, cymbals on top and the kick at the bottom, its hits their MIDI numbers', () => {
    const numbers = drumTablature(engraveTex(DRUMS, { staves: WITH_TAB }), 4);
    // Twelve hits: seven closed hi-hats, two snares, two kicks and an open hi-hat.
    expect(numbers).toHaveLength(12);
    const lines = new Map<number, Set<number>>();
    for (const { line, number } of numbers) lines.set(number, (lines.get(number) ?? new Set()).add(line));
    // Each sound on a line of its own: the open hi-hat, the closed one, the snare, the kick (the
    // acoustic bass drum, 35, as it plays).
    expect([...lines.entries()].sort((a, b) => a[0] - b[0])).toEqual([
      [35, new Set([3])],
      [38, new Set([2])],
      [42, new Set([1])],
      [46, new Set([0])],
    ]);
    expect(numbers.filter(({ number }) => number === 42)).toHaveLength(7);
  });

  it('leaves the kit as it was, and its staff when every track is shown as tablature', () => {
    const plain = engraveTex(DRUMS);
    const tabbed = engraveTex(DRUMS, { staves: WITH_TAB });
    const heads = (view: Engraving) =>
      view.marks
        .filter(mark => mark.partial === 'system' && mark.name.startsWith('Notehead'))
        .map(mark => mark.name);
    expect(heads(tabbed)).toEqual(heads(plain));
    const notes = tabbed.beats().flatMap(beat => beat.notes);
    expect(notes.every(note => note.isPercussion && note.string === -1 && note.fret === -1)).toBe(true);
    expect(tabbed.score.tracks[0]?.staves[0]?.tuning).toEqual([]);
    // Only its own choice gives a kit a tablature: the Staves menu's leaves it its staff.
    const all = engraveTex(DRUMS, { staffDisplay: 'tab' });
    expect(drumTablature(all, 4)).toEqual([]);
    expect(heads(all)).toEqual(heads(plain));
  });
});
