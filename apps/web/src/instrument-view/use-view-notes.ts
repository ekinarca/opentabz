/**
 * What instrument views share: the notes to show at the playback position (read from the player
 * store, re-rendering only when they change) and the width the view has.
 */
import type { PlaybackTimeline, TrackNotes } from '@opentabz/core/shared';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import { usePlayer } from '../state/player.ts';
import { indexTrackNotes, NO_NOTES, type FretboardNotes, type ViewNote } from './fretboard.ts';

export type NotesAt = (
  timeline: PlaybackTimeline,
  notes: TrackNotes,
  rows: Map<number, number>,
  tick: number,
) => FretboardNotes;

function signature(notes: FretboardNotes): string {
  const part = (list: readonly ViewNote[]) =>
    list.map(note => `${note.string}:${note.fret}:${note.pitch}:${note.staff}:${note.flags}`).join(',');
  return `${part(notes.current)}|${part(notes.next)}|${part(notes.bar)}|${notes.flats ? 'b' : '#'}`;
}

/**
 * Reads the notes to show at the playback position, for useSyncExternalStore: the same object
 * comes back until the notes shown change.
 */
function notesReader(docKey: string, notes: TrackNotes | null, notesAt: NotesAt): () => FretboardNotes {
  if (notes === null) return () => NO_NOTES;
  const rows = indexTrackNotes(notes);
  let cached = { signature: signature(NO_NOTES), value: NO_NOTES };
  return () => {
    const player = usePlayer.getState();
    const value =
      player.docKey === docKey && player.timeline !== null
        ? notesAt(player.timeline, notes, rows, player.tick)
        : NO_NOTES;
    const next = signature(value);
    if (next !== cached.signature) cached = { signature: next, value };
    return cached.value;
  };
}

/**
 * The notes to show, following the playback position (playing, paused or stepping). `notesAt`
 * must keep its identity while what it shows does not change (wrap it in useCallback).
 */
export function useViewNotes(docKey: string, notes: TrackNotes | null, notesAt: NotesAt): FretboardNotes {
  const read = useMemo(() => notesReader(docKey, notes, notesAt), [docKey, notes, notesAt]);
  return useSyncExternalStore(usePlayer.subscribe, read);
}

/** An element's content width, kept up to date. */
export function useWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, width];
}
