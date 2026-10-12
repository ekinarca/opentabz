/**
 * A staff's own properties at a bar (EDIT-107, EDIT-108): its clef, from the bar to the staff's next
 * change of clef, the notes keeping their pitches or their places on the staff; and simile marks — a
 * bar played as the one before it, two bars as the two before them — the marked bars' own notes
 * taken away, as Guitar Pro has them.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  SIMILES,
  type Clef,
  type ClefOttava,
  type StaffBarProperties,
  type StaffBarState,
} from '../shared/edit.ts';
import { detachBar, emptyBeats } from './bars.ts';
import type { Transaction } from './commands.ts';
import { EditError } from './error.ts';
import { byDegrees } from './spelling.ts';
import { shiftNotes } from './transpose.ts';

const { Clef: Clefs, Ottavia, SimileMark } = alphaTab.model;

const CLEF_OF: Readonly<Record<Clef, alphaTab.model.Clef>> = {
  treble: Clefs.G2,
  bass: Clefs.F4,
  alto: Clefs.C3,
  tenor: Clefs.C4,
  neutral: Clefs.Neutral,
};

const OTTAVA_OF: Readonly<Record<ClefOttava, alphaTab.model.Ottavia>> = {
  '15ma': Ottavia._15ma,
  '8va': Ottavia._8va,
  none: Ottavia.Regular,
  '8vb': Ottavia._8vb,
  '15mb': Ottavia._15mb,
};

/** Where each clef writes the C of MIDI 0: letters below its staff's top line, as alphaTab counts them. */
const CLEF_STEPS: Readonly<Record<Clef, number>> = { treble: 38, bass: 26, alto: 32, tenor: 30, neutral: 38 };

/** The semitones a clef writes its notes above their sound: a guitar's treble clef (8vb), an octave. */
const OTTAVA_SHIFT: Readonly<Record<ClefOttava, number>> = {
  '15ma': -24,
  '8va': -12,
  none: 0,
  '8vb': 12,
  '15mb': 24,
};

function nameOf<Name extends string, Value>(table: Readonly<Record<Name, Value>>, value: Value): Name {
  const name = (Object.keys(table) as Name[]).find(key => table[key] === value);
  if (name === undefined) throw new EditError(`No name for ${String(value)}.`);
  return name;
}

function staffBarAt(
  score: alphaTab.model.Score,
  track: number,
  staff: number,
  bar: number,
): alphaTab.model.Bar {
  const found = score.tracks[track]?.staves[staff]?.bars[bar];
  if (found === undefined)
    throw new EditError(`No bar ${String(bar)} in staff ${String(staff)} of track ${String(track)}.`);
  return found;
}

/** The bars a simile mark of a bar spans: a two-bar one is the bar's and its partner's. */
function simileBars(bar: alphaTab.model.Bar): alphaTab.model.Bar[] {
  if (bar.simileMark === SimileMark.FirstOfDouble && bar.nextBar !== null) return [bar, bar.nextBar];
  if (bar.simileMark === SimileMark.SecondOfDouble && bar.previousBar !== null) return [bar.previousBar, bar];
  return [bar];
}

/** A bar given a simile mark, or its mark taken away; marked, it has no notes of its own. */
function markSimile(
  transaction: Transaction,
  bar: alphaTab.model.Bar,
  mark: alphaTab.model.SimileMark,
): void {
  transaction.touch(bar.staff, bar.index);
  bar.simileMark = mark;
  if (mark === SimileMark.None) return;
  detachBar(bar);
  for (const voice of bar.voices) voice.beats = emptyBeats(voice);
}

/** Sets a staff's own properties at a bar. */
export function setStaffBar(
  transaction: Transaction,
  at: { readonly track: number; readonly staff: number; readonly bar: number },
  properties: StaffBarProperties,
): void {
  const first = staffBarAt(transaction.score, at.track, at.staff, at.bar);
  const staff = first.staff;
  const { clef, clefOttava, keepPlaces = false, simile } = properties;
  if (clef !== undefined && !Object.hasOwn(CLEF_OF, clef)) throw new EditError(`No clef "${clef}".`);
  if (clefOttava !== undefined && !Object.hasOwn(OTTAVA_OF, clefOttava))
    throw new EditError(`No clef octave "${clefOttava}".`);
  if (simile !== undefined && !SIMILES.includes(simile)) throw new EditError(`No simile mark "${simile}".`);
  if (clef !== undefined || clefOttava !== undefined) {
    const was = { clef: nameOf(CLEF_OF, first.clef), ottava: nameOf(OTTAVA_OF, first.clefOttava) };
    const now = { clef: clef ?? was.clef, ottava: clefOttava ?? was.ottava };
    // To the staff's next change of clef.
    const run: alphaTab.model.Bar[] = [];
    for (const next of staff.bars.slice(at.bar)) {
      if (next !== first && (next.clef !== first.clef || next.clefOttava !== first.clefOttava)) break;
      run.push(next);
    }
    for (const next of run) transaction.touch(staff, next.index);
    if (keepPlaces && !staff.isPercussion) {
      // Each note at its place under the new clef: letters as far apart as the clefs put them, an
      // octave clef's octaves the other way.
      const steps = CLEF_STEPS[now.clef] - CLEF_STEPS[was.clef];
      const octaves = OTTAVA_SHIFT[now.ottava] - OTTAVA_SHIFT[was.ottava];
      const beats = run.flatMap(bar => bar.voices.flatMap(voice => voice.beats));
      shiftNotes(transaction, beats, note => {
        const written = note.displayValueWithoutBend;
        const moved = byDegrees(written, note.beat.voice.bar.keySignature, note.accidentalMode, steps);
        return { semitones: moved.value - written - octaves, mode: moved.mode };
      });
    }
    for (const next of run) {
      next.clef = CLEF_OF[now.clef];
      next.clefOttava = OTTAVA_OF[now.ottava];
    }
  }
  if (simile !== undefined) {
    if (simile === 'one-bar' && at.bar < 1)
      throw new EditError('A simile mark repeats the bar before it: the first bar has none.');
    const second = first.nextBar;
    if (simile === 'two-bar' && (at.bar < 2 || second === null))
      throw new EditError('A two-bar simile mark repeats the two bars before it, over two bars.');
    // The marks it replaces, two-bar ones whole.
    for (const bar of simileBars(first)) markSimile(transaction, bar, SimileMark.None);
    if (simile === 'one-bar') markSimile(transaction, first, SimileMark.Simple);
    else if (simile === 'two-bar' && second !== null) {
      for (const bar of simileBars(second)) markSimile(transaction, bar, SimileMark.None);
      markSimile(transaction, first, SimileMark.FirstOfDouble);
      markSimile(transaction, second, SimileMark.SecondOfDouble);
    }
  }
}

/** A staff's own properties at a bar, as they are. */
export function readStaffBar(
  score: alphaTab.model.Score,
  track: number,
  staff: number,
  bar: number,
): StaffBarState {
  const found = staffBarAt(score, track, staff, bar);
  return {
    clef: nameOf(CLEF_OF, found.clef),
    clefOttava: nameOf(OTTAVA_OF, found.clefOttava),
    simile:
      found.simileMark === SimileMark.None
        ? 'none'
        : found.simileMark === SimileMark.Simple
          ? 'one-bar'
          : 'two-bar',
  };
}
