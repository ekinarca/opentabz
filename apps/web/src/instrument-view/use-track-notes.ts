/**
 * What instrument views ask the engine about a track (its notes, chords, lyrics and drums) or the
 * whole song (the bars each track plays in), asked once per document, track and version of the
 * score and kept for the next time they are shown: an edit, an undo or a redo asks again.
 */
import type { ScoreOverview, TrackChords, TrackDrums, TrackLyrics, TrackNotes } from '@opentabz/core/shared';
import { useEffect, useState } from 'react';
import { getEngine } from '../engine/instance.ts';
import { useDocuments } from '../state/documents.ts';
import { useEditing } from '../state/editing.ts';

interface TrackData {
  readonly trackNotes: TrackNotes;
  readonly trackChords: TrackChords;
  readonly trackLyrics: TrackLyrics;
  readonly trackDrums: TrackDrums;
  readonly scoreOverview: ScoreOverview;
}

type Method = keyof TrackData;

/** Answers kept; the least recently asked for are dropped first. */
const KEPT = 48;
const requests = new Map<string, Promise<TrackData[Method]>>();

function request<M extends Method>(
  method: M,
  engineId: string,
  trackIndex: number,
  changes: number,
): Promise<TrackData[M]> {
  const key = `${method}:${engineId}:${trackIndex}:${changes}`;
  const known = requests.get(key) as Promise<TrackData[M]> | undefined;
  if (known !== undefined) {
    requests.delete(key);
    requests.set(key, known);
    return known;
  }
  const engine = getEngine();
  const asked = (
    method === 'scoreOverview'
      ? engine.call('scoreOverview', { docId: engineId })
      : engine.call(method, { docId: engineId, trackIndex })
  ) as Promise<TrackData[M]>;
  requests.set(key, asked);
  // A failed request is forgotten, so the next time asks again.
  void asked.catch(() => {
    requests.delete(key);
  });
  while (requests.size > KEPT) {
    const oldest = requests.keys().next().value;
    if (oldest === undefined) break;
    requests.delete(oldest);
  }
  return asked;
}

/** How many times the document's score has changed (edits, undos, redos) since it was opened. */
function useChanges(engineId: string): number {
  const docKey = useDocuments(state => state.docs.find(doc => doc.engineId === engineId)?.key ?? null);
  return useEditing(state => (docKey === null ? 0 : (state.docs[docKey]?.changes ?? 0)));
}

function useTrackData<M extends Method>(
  method: M,
  engineId: string,
  trackIndex: number,
): TrackData[M] | null {
  const changes = useChanges(engineId);
  const key = `${method}:${engineId}:${trackIndex}:${changes}`;
  const [loaded, setLoaded] = useState<{ readonly key: string; readonly data: TrackData[M] } | null>(null);
  useEffect(() => {
    let current = true;
    request(method, engineId, trackIndex, changes).then(
      data => {
        if (current) setLoaded({ key, data });
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [method, engineId, trackIndex, changes, key]);
  // While a changed score is asked about, the panel keeps showing what it showed.
  return loaded?.key === key || loaded?.key.startsWith(`${method}:${engineId}:${trackIndex}:`) === true
    ? loaded.data
    : null;
}

/** The track's notes, or null until the engine has answered. */
export function useTrackNotes(engineId: string, trackIndex: number): TrackNotes | null {
  return useTrackData('trackNotes', engineId, trackIndex);
}

/** The track's chords, or null until the engine has answered. */
export function useTrackChords(engineId: string, trackIndex: number): TrackChords | null {
  return useTrackData('trackChords', engineId, trackIndex);
}

/** The track's lyrics, or null until the engine has answered. */
export function useTrackLyrics(engineId: string, trackIndex: number): TrackLyrics | null {
  return useTrackData('trackLyrics', engineId, trackIndex);
}

/** The track's drum kit and notes, or null until the engine has answered. */
export function useTrackDrums(engineId: string, trackIndex: number): TrackDrums | null {
  return useTrackData('trackDrums', engineId, trackIndex);
}

/** The bars each track of the song plays in, or null until the engine has answered. */
export function useScoreOverview(engineId: string): ScoreOverview | null {
  return useTrackData('scoreOverview', engineId, -1);
}
