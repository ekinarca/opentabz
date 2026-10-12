/**
 * Where notes can be played on a stringed instrument (REND-190): each note of a chord on a string
 * of its own and a fret the string reaches, as near the hand's place and as close together as can
 * be. Used to show a keyboard, a voice or an orchestral part as tablature.
 */

/** A note's place: its string (1 the lowest, as alphaTab counts) and its fret. */
export interface Fret {
  readonly string: number;
  readonly fret: number;
}

/** The highest fret a note is placed on. */
export const MAX_FRET = 24;

/** Frets a hand spans without stretching. */
const HAND_SPAN = 4;

/** What leaving a note out costs: more than any place it could take. */
const LEFT_OUT = 1000;

/**
 * The places of a chord's pitches on a tuning (open strings' pitches, the highest string first):
 * each on a string of its own, near `position`; null for a note no free string reaches. `fixed`
 * holds places already decided (a tied note on its origin's), by the pitch's index.
 */
export function fretChord(
  pitches: readonly number[],
  tuning: readonly number[],
  position: number,
  fixed: ReadonlyMap<number, Fret> = new Map(),
): (Fret | null)[] {
  const strings = tuning.length;
  // The highest pitches first: they take the highest strings first.
  const order = pitches.map((_, index) => index).sort((a, b) => (pitches[b] ?? 0) - (pitches[a] ?? 0));
  const taken = new Set([...fixed.values()].map(place => place.string));
  const current: (Fret | null)[] = pitches.map((_, index) => fixed.get(index) ?? null);
  let best: (Fret | null)[] = current.slice();
  let bestCost = Number.POSITIVE_INFINITY;

  const cost = (places: readonly (Fret | null)[]) => {
    const frets = places.flatMap(place => (place === null || place.fret === 0 ? [] : [place.fret]));
    const left = places.filter(place => place === null).length;
    // Open strings are free near the nut; up the neck they are as far as the hand is from it.
    const open = places.filter(place => place?.fret === 0).length;
    const span = frets.length > 0 ? Math.max(...frets) - Math.min(...frets) : 0;
    const distance = frets.reduce((sum, fret) => sum + Math.abs(fret - position), 0);
    return (
      left * LEFT_OUT +
      Math.max(0, span - HAND_SPAN) * 20 +
      distance +
      open * Math.max(0, position - HAND_SPAN)
    );
  };

  const place = (step: number) => {
    if (step === order.length) {
      const total = cost(current);
      if (total < bestCost) {
        bestCost = total;
        best = current.slice();
      }
      return;
    }
    const index = order[step] ?? 0;
    if (fixed.has(index)) {
      place(step + 1);
      return;
    }
    const pitch = pitches[index] ?? 0;
    for (let tuningIndex = 0; tuningIndex < strings; tuningIndex++) {
      const string = strings - tuningIndex;
      const fret = pitch - (tuning[tuningIndex] ?? 0);
      if (taken.has(string) || fret < 0 || fret > MAX_FRET) continue;
      taken.add(string);
      current[index] = { string, fret };
      place(step + 1);
      taken.delete(string);
    }
    current[index] = null;
    place(step + 1);
  };
  place(0);
  return best;
}

/** Where the hand is after a chord: among its fretted notes, else where it was. */
export function handPosition(places: readonly (Fret | null)[], position: number): number {
  const frets = places.flatMap(place => (place === null || place.fret === 0 ? [] : [place.fret]));
  return frets.length > 0 ? frets.reduce((sum, fret) => sum + fret, 0) / frets.length : position;
}
