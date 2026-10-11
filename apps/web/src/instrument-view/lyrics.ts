/**
 * The lyrics pane's model, free of the DOM (VIEW-010, VIEW-022): a verse laid out in its lines,
 * when each syllable is sung in playing order (repeats played out), and the syllable being sung
 * at a tick.
 */
import {
  TIMELINE_ITEM_STRIDE,
  TIMELINE_SLICE_STRIDE,
  type LyricSyllable,
  type PlaybackTimeline,
} from '@opentabz/core/shared';

export interface LyricLine {
  /** A comment written before the line ("Chorus"), or null. */
  readonly heading: string | null;
  /** Indexes of the line's syllables in the verse. */
  readonly syllables: readonly number[];
}

/** The verse's lines, as written. */
export function lyricLines(verse: readonly LyricSyllable[]): LyricLine[] {
  const lines: { heading: string | null; syllables: number[] }[] = [];
  verse.forEach((syllable, index) => {
    const last = lines.at(-1);
    if (last === undefined || syllable.lineStart)
      lines.push({ heading: syllable.heading, syllables: [index] });
    else last.syllables.push(index);
  });
  return lines;
}

export interface Sung {
  /** When it is sung, in playback ticks. */
  readonly tick: number;
  /** Index of the syllable in the verse. */
  readonly syllable: number;
}

/** When each syllable is sung, in playing order (a syllable inside a repeat comes back). */
export function sungAt(
  timeline: PlaybackTimeline,
  trackIndex: number,
  verse: readonly LyricSyllable[],
): Sung[] {
  const syllableOfBeat = new Map<number, number>();
  verse.forEach((syllable, index) => syllableOfBeat.set(syllable.beatId, index));
  const sung: Sung[] = [];
  const seen = new Set<string>();
  const { slices, items } = timeline;
  for (let slice = 0; slice * TIMELINE_SLICE_STRIDE < slices.length; slice++) {
    const first = slices[slice * TIMELINE_SLICE_STRIDE + 2] ?? 0;
    const count = slices[slice * TIMELINE_SLICE_STRIDE + 3] ?? 0;
    for (let item = first; item < first + count; item++) {
      const base = item * TIMELINE_ITEM_STRIDE;
      if (items[base + 1] !== trackIndex) continue;
      const syllable = syllableOfBeat.get(items[base] ?? -1);
      if (syllable === undefined) continue;
      const tick = items[base + 2] ?? 0;
      const key = `${tick}:${syllable}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sung.push({ tick, syllable });
    }
  }
  return sung.sort((a, b) => a.tick - b.tick);
}

/** The syllable being sung at `tick` (the last to start at or before it), or null before the first. */
export function syllableAt(sung: readonly Sung[], tick: number): number | null {
  let low = 0;
  let high = sung.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((sung[middle]?.tick ?? 0) <= tick) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found < 0 ? null : (sung[found]?.syllable ?? null);
}

/** Where a syllable is sung next after `tick`, else where it is first sung. */
export function nextTickOf(sung: readonly Sung[], syllable: number, tick: number): number | null {
  const after = sung.find(entry => entry.syllable === syllable && entry.tick > tick);
  return (after ?? sung.find(entry => entry.syllable === syllable))?.tick ?? null;
}
