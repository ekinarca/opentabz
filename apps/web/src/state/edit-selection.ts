/**
 * The editor's selection (EDIT-020), as Guitar Pro's: beats of the caret's voice, from the beat it
 * started on to the caret's; or, once it reaches other tracks, whole bars of a run of tracks. The
 * caret's keys with Shift make it; copy, cut, paste and delete use it.
 */
import type { Selection, TrackBeats } from '@opentabz/core/shared';
import { rowOf, voiceRows, type BeatRow, type Caret } from './edit-caret.ts';

export type EditSelection =
  /** Beats of the caret's voice, from the anchor's (the caret's when the selection began) to the caret's. */
  | { readonly kind: 'beats'; readonly anchor: number }
  /** Whole bars of the tracks from one to another. */
  | {
      readonly kind: 'bars';
      readonly fromTrack: number;
      readonly toTrack: number;
      readonly fromBar: number;
      readonly toBar: number;
    };

/** What a selection covers, to draw it. */
export type SelectionMark =
  | {
      readonly kind: 'beats';
      readonly track: number;
      readonly staff: number;
      readonly beatIds: ReadonlySet<number>;
    }
  | {
      readonly kind: 'bars';
      readonly fromTrack: number;
      readonly toTrack: number;
      readonly fromBar: number;
      readonly toBar: number;
    };

/** The rows of the caret's voice from the anchor's beat to the caret's, in order; null when gone. */
export function selectedRows(beats: TrackBeats, caret: Caret, anchor: number): BeatRow[] | null {
  const rows = voiceRows(beats, caret.staff, caret.voice);
  const from = rows.findIndex(row => row.beatId === anchor);
  const to = rows.findIndex(row => row.beatId === caret.beatId);
  if (from < 0 || to < 0) return null;
  return rows.slice(Math.min(from, to), Math.max(from, to) + 1);
}

/**
 * The beats of the caret's voice an action on the caret's beat acts on: those selected (in the
 * caret's track, for bars), else the caret's.
 */
export function actedRows(selection: EditSelection | null, caret: Caret, beats: TrackBeats): BeatRow[] {
  const own = rowOf(beats, caret.beatId);
  if (selection === null) return own === null ? [] : [own];
  if (selection.kind === 'beats')
    return selectedRows(beats, caret, selection.anchor) ?? (own === null ? [] : [own]);
  const [fromBar, toBar] = [
    Math.min(selection.fromBar, selection.toBar),
    Math.max(selection.fromBar, selection.toBar),
  ];
  return voiceRows(beats, caret.staff, caret.voice).filter(row => row.bar >= fromBar && row.bar <= toBar);
}

/** Whether a selection is still there to use: its anchor's beat is in the caret's voice. */
export function selectionHolds(selection: EditSelection, caret: Caret, beats: TrackBeats): boolean {
  return selection.kind === 'bars' || selectedRows(beats, caret, selection.anchor) !== null;
}

export function selectionMark(
  selection: EditSelection | null,
  caret: Caret | null,
  beats: TrackBeats | null,
): SelectionMark | null {
  if (selection === null) return null;
  if (selection.kind === 'bars') return selection;
  if (caret === null || beats === null) return null;
  const rows = selectedRows(beats, caret, selection.anchor);
  if (rows === null) return null;
  return {
    kind: 'beats',
    track: caret.track,
    staff: caret.staff,
    beatIds: new Set(rows.map(row => row.beatId)),
  };
}

/** The selection as the engine takes it. */
export function engineSelection(
  selection: EditSelection | null,
  caret: Caret | null,
  beats: TrackBeats | null,
): Selection | null {
  if (selection === null) return null;
  if (selection.kind === 'bars') return selection;
  if (caret === null || beats === null) return null;
  const rows = selectedRows(beats, caret, selection.anchor);
  const first = rows?.[0];
  const last = rows?.at(-1);
  if (first === undefined || last === undefined) return null;
  return {
    kind: 'beats',
    track: caret.track,
    staff: caret.staff,
    voice: caret.voice,
    from: { bar: first.bar, beat: first.beat },
    to: { bar: last.bar, beat: last.beat },
  };
}

/** The bars a selection reaches, first and last. */
export function selectedBars(
  selection: EditSelection,
  caret: Caret,
  beats: TrackBeats,
): { readonly from: number; readonly to: number } | null {
  if (selection.kind === 'bars') return { from: selection.fromBar, to: selection.toBar };
  const rows = selectedRows(beats, caret, selection.anchor);
  const first = rows?.[0];
  const last = rows?.at(-1);
  return first === undefined || last === undefined ? null : { from: first.bar, to: last.bar };
}

/**
 * The selection reaching a track further up or down (Shift ↑ ↓): whole bars, from the caret's
 * track to the one reached; back to the caret's track alone, the bars stay selected.
 */
export function extendToTrack(
  selection: EditSelection,
  caret: Caret,
  beats: TrackBeats,
  direction: 1 | -1,
  trackCount: number,
): EditSelection {
  const bars = selectedBars(selection, caret, beats) ?? { from: 0, to: 0 };
  const toTrack = selection.kind === 'bars' ? selection.toTrack : caret.track;
  return {
    kind: 'bars',
    fromTrack: selection.kind === 'bars' ? selection.fromTrack : caret.track,
    toTrack: Math.min(trackCount - 1, Math.max(0, toTrack + direction)),
    fromBar: bars.from,
    toBar: bars.to,
  };
}

/** A selection of bars following the caret as it moves with Shift: its last bar is the caret's. */
export function followCaret(selection: EditSelection, caret: Caret, beats: TrackBeats): EditSelection {
  if (selection.kind === 'beats') return selection;
  const row = rowOf(beats, caret.beatId);
  return row === null ? selection : { ...selection, toBar: row.bar };
}

/** Every bar of every track (select all). */
export function everything(trackCount: number, barCount: number): EditSelection {
  return {
    kind: 'bars',
    fromTrack: 0,
    toTrack: Math.max(0, trackCount - 1),
    fromBar: 0,
    toBar: Math.max(0, barCount - 1),
  };
}
