/**
 * The chords panel's model, free of the DOM (VIEW-007, VIEW-027): the chord changes of a track in
 * playing order (repeats played out), the chord sounding at a tick and the next one, and how
 * many beats remain until it.
 */
import {
  TIMELINE_ITEM_STRIDE,
  TIMELINE_SLICE_STRIDE,
  TRACK_CHORD_STRIDE,
  type MasterBarSummary,
  type PlaybackTimeline,
  type TrackChords,
} from '@opentabz/core/shared';
import { findBarOccurrence, occurrence } from '../score-view/timeline-lookup.ts';

export interface ChordChange {
  /** Where the chord starts, in playback ticks. */
  readonly tick: number;
  /** Index into the track's chords. */
  readonly chord: number;
}

/** Ticks in a quarter note (alphaTab's resolution). */
const QUARTER = 960;

/** Where the track's chords start, in playing order (each beat once, at its start). */
export function chordChanges(timeline: PlaybackTimeline, chords: TrackChords): ChordChange[] {
  const chordOfBeat = new Map<number, number>();
  for (let index = 0; index < chords.beats.length; index += TRACK_CHORD_STRIDE) {
    chordOfBeat.set(chords.beats[index] ?? -1, chords.beats[index + 1] ?? -1);
  }
  const changes: ChordChange[] = [];
  const seen = new Set<string>();
  const { slices, items } = timeline;
  for (let slice = 0; slice * TIMELINE_SLICE_STRIDE < slices.length; slice++) {
    const first = slices[slice * TIMELINE_SLICE_STRIDE + 2] ?? 0;
    const count = slices[slice * TIMELINE_SLICE_STRIDE + 3] ?? 0;
    for (let item = first; item < first + count; item++) {
      const base = item * TIMELINE_ITEM_STRIDE;
      if (items[base + 1] !== chords.trackIndex) continue;
      const chord = chordOfBeat.get(items[base] ?? -1);
      if (chord === undefined) continue;
      const tick = items[base + 2] ?? 0;
      const key = `${tick}:${chord}`;
      if (seen.has(key)) continue;
      seen.add(key);
      changes.push({ tick, chord });
    }
  }
  return changes.sort((a, b) => a.tick - b.tick);
}

export interface ChordsAt {
  /** The chord sounding (the last to start at or before the tick), or null before the first. */
  readonly current: ChordChange | null;
  /** The next chord that differs from it, or null after the last. */
  readonly next: ChordChange | null;
}

/** The chord at `tick` and the next different one. */
export function chordsAt(changes: readonly ChordChange[], tick: number): ChordsAt {
  let low = 0;
  let high = changes.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((changes[middle]?.tick ?? 0) <= tick) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  const current = found < 0 ? null : (changes[found] ?? null);
  let next: ChordChange | null = null;
  for (let index = found + 1; index < changes.length; index++) {
    const candidate = changes[index];
    if (candidate !== undefined && candidate.chord !== current?.chord) {
      next = candidate;
      break;
    }
  }
  return { current, next };
}

/** Beats of the bar's meter from `tick` until `until`, counted up (1: on the next beat). */
export function beatsUntil(
  timeline: PlaybackTimeline,
  bars: readonly MasterBarSummary[],
  tick: number,
  until: number,
): number {
  const bar = occurrence(timeline, findBarOccurrence(timeline, tick));
  const denominator = bar === null ? 4 : (bars[bar.masterBarIndex]?.denominator ?? 4);
  const beat = (QUARTER * 4) / denominator;
  return Math.max(0, Math.ceil((until - tick) / beat - 1e-6));
}
