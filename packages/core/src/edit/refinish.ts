/**
 * A score made whole again after an edit (EDIT-001). alphaTab works out, once, what follows from the
 * written notes: which beat comes next, which notes a tie, a hammer-on or a slide joins, the slurs
 * over runs of legato notes, how long a let-ring lasts, the tuplet groups, which beat a fermata of
 * the bar falls on. It never forgets what it worked out, so after an edit those links are cleared
 * first, in the staves edited, and worked out again — as they are when the edited score is opened.
 * Only the staves edited are worked out again: alphaTab, going over a staff a second time without
 * clearing it, would look further ahead than when the score was opened.
 */
import * as alphaTab from '@coderline/alphatab';

/** How many bars apart alphaTab links two notes on a string (a tie, a hammer-on, a slide). */
export const REACH = 3;

/** Bars of a staff an edit changed. */
export interface Region {
  readonly staff: alphaTab.model.Staff;
  /** The first and last master bar changed. */
  readonly from: number;
  readonly to: number;
}

/** A field alphaTab keeps to itself; its absence means alphaTab changed, and edits would go wrong. */
function clearInternal(target: object, key: string): void {
  if (!Object.hasOwn(target, key)) throw new Error(`alphaTab has no ${key} on ${target.constructor.name}.`);
  Reflect.set(target, key, null);
}

/** Clears what alphaTab worked out along a staff's beats, from one beat to the next. */
function clearChains(staff: alphaTab.model.Staff): void {
  for (const bar of staff.bars) {
    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        beat.previousBeat = null;
        beat.nextBeat = null;
        beat.effectSlurOrigin = null;
        beat.effectSlurDestination = null;
        beat.isEffectSlurOrigin = false;
        beat.isLetRing = false;
        beat.isPalmMute = false;
        beat.tupletGroup = null;
        // Read again from the bar, where the fermata stays at its time as the beats move.
        beat.fermata = null;
        beat.noteValueLookup.clear();
        for (const note of beat.notes) {
          note.effectSlurOrigin = null;
          note.effectSlurDestination = null;
          note.isEffectSlurOrigin = false;
          note.hasEffectSlur = false;
          clearInternal(note, 'effectSlur');
          note.hammerPullOrigin = null;
          note.hammerPullDestination = null;
          note.letRingDestination = null;
          note.palmMuteDestination = null;
          note.bendOrigin = null;
        }
      }
    }
  }
}

/** Clears the ties and slides near the bars edited, to join the notes now next to each other. */
function clearNeighbours({ staff, from, to }: Region): void {
  for (const bar of staff.bars.slice(Math.max(0, from - REACH), to + REACH + 1)) {
    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        for (const note of beat.notes) {
          note.tieOrigin = null;
          note.tieDestination = null;
          note.slideOrigin = null;
          note.slideTarget = null;
        }
      }
    }
  }
}

/**
 * A staff's beats let go of their fermatas: a fermata is its bar's, at a moment of it, and each
 * beat at that moment takes it again as the staff is worked out — a beat put in before it does not
 * carry it along.
 */
function clearFermatas(staff: alphaTab.model.Staff): void {
  for (const bar of staff.bars)
    if (bar.masterBar.fermata !== null)
      for (const voice of bar.voices) for (const beat of voice.beats) beat.fermata = null;
}

/**
 * Works out again what follows from the written notes of staves, then where each bar starts (a
 * pickup bar is as long as its notes).
 */
export function refinishStaves(
  score: alphaTab.model.Score,
  staves: Iterable<alphaTab.model.Staff>,
  settings: alphaTab.Settings,
): void {
  const all = [...staves];
  for (const staff of all) clearChains(staff);
  for (const staff of all) clearFermatas(staff);
  for (const staff of all) staff.finish(settings, new Map());
  const shared = new Map<string, unknown>();
  for (const masterBar of score.masterBars) masterBar.finish(shared);
}

/**
 * Works out again what follows from the written notes, in the staves of the regions. An edit also
 * joins the notes near it anew; undoing or redoing one puts back the links as they were, and only
 * works out the rest.
 */
export function refinish(
  score: alphaTab.model.Score,
  regions: readonly Region[],
  settings: alphaTab.Settings,
  joinNeighbours: boolean,
): void {
  if (joinNeighbours) for (const region of regions) clearNeighbours(region);
  refinishStaves(score, new Set(regions.map(region => region.staff)), settings);
}

/** The first note of the legato run (hammer-ons, pull-offs, legato slides) a note is in. */
function runStart(note: alphaTab.model.Note): alphaTab.model.Note {
  const seen = new Set<alphaTab.model.Note>();
  let start = note;
  for (;;) {
    seen.add(start);
    const slide = start.slideOrigin;
    const origin =
      start.hammerPullOrigin ?? (slide?.slideOutType === alphaTab.model.SlideOutType.Legato ? slide : null);
    if (origin === null || seen.has(origin)) return start;
    start = origin;
  }
}

/**
 * The first master bar whose engraving an edit of a region may change: as far back as the notes
 * near it reach (a tie, a slide), or where a legato run through it begins, its slur drawn from
 * there. Asked before an edit and after it, as an edit may part a run or join two.
 */
export function firstEngraved({ staff, from, to }: Region): number {
  let first = Math.max(0, from - REACH);
  for (const bar of staff.bars.slice(first, to + REACH + 1)) {
    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        for (const note of beat.notes) first = Math.min(first, runStart(note).beat.voice.bar.index);
      }
    }
  }
  return first;
}
