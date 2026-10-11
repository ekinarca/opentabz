/**
 * The notes of a track for instrument views, asked of the engine once per document and track
 * and kept for the next time the track is shown.
 */
import type { TrackNotes } from '@opentabz/core/shared';
import { useEffect, useState } from 'react';
import { getEngine } from '../engine/instance.ts';

/** Tracks kept; the least recently asked for are dropped first. */
const KEPT = 32;
const requests = new Map<string, Promise<TrackNotes>>();

function request(engineId: string, trackIndex: number): Promise<TrackNotes> {
  const key = `${engineId}:${trackIndex}`;
  const known = requests.get(key);
  if (known !== undefined) {
    requests.delete(key);
    requests.set(key, known);
    return known;
  }
  const asked = getEngine().call('trackNotes', { docId: engineId, trackIndex });
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

/** The track's notes, or null until the engine has answered. */
export function useTrackNotes(engineId: string, trackIndex: number): TrackNotes | null {
  const key = `${engineId}:${trackIndex}`;
  const [loaded, setLoaded] = useState<{ readonly key: string; readonly notes: TrackNotes } | null>(null);
  useEffect(() => {
    let current = true;
    request(engineId, trackIndex).then(
      notes => {
        if (current) setLoaded({ key, notes });
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [engineId, trackIndex, key]);
  return loaded?.key === key ? loaded.notes : null;
}
