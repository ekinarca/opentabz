/**
 * The chords of one track for the chords panel (engine worker): each chord once, in the order it
 * first comes, and every beat that carries one.
 */
import type * as alphaTab from '@coderline/alphatab';
import type { ChordShape, TrackChords } from '../shared/chords.ts';

export function collectTrackChords(score: alphaTab.model.Score, trackIndex: number): TrackChords {
  const chords: ChordShape[] = [];
  const known = new Map<string, number>();
  const beats: number[] = [];
  for (const staff of score.tracks[trackIndex]?.staves ?? []) {
    for (const bar of staff.bars) {
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          const chord = beat.chord;
          if (chord === null) continue;
          let index = known.get(chord.uniqueId);
          if (index === undefined) {
            index = chords.length;
            known.set(chord.uniqueId, index);
            chords.push({
              name: chord.name,
              firstFret: Math.max(1, chord.firstFret),
              strings: chord.showDiagram ? [...chord.strings] : [],
              barres: [...chord.barreFrets],
            });
          }
          beats.push(beat.id, index);
        }
      }
    }
  }
  return { trackIndex, chords, beats: Int32Array.from(beats) };
}
