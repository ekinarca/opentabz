/**
 * Which tracks the mixer silences: muted ones and, when any track is soloed, every track that
 * is not. Exports leave them out, as they are not heard.
 */
import type { TrackMix } from './mixer-memory.ts';

export function silencedTracks(mix: readonly Pick<TrackMix, 'mute' | 'solo'>[]): number[] {
  const soloing = mix.some(track => track.solo);
  return mix.flatMap((track, index) => (track.mute || (soloing && !track.solo) ? [index] : []));
}
