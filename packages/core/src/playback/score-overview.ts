/**
 * The bars each track plays in, for the song overview (engine worker): a bar is played when a
 * beat of any of its staves and voices sounds a note, a tied one included.
 */
import type * as alphaTab from '@coderline/alphatab';
import type { ScoreOverview } from '../shared/overview.ts';

export function collectScoreOverview(score: alphaTab.model.Score): ScoreOverview {
  const barCount = score.masterBars.length;
  const played = new Uint8Array(score.tracks.length * barCount);
  score.tracks.forEach((track, trackIndex) => {
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        if (bar.index >= barCount) continue;
        if (bar.voices.some(voice => voice.beats.some(beat => !beat.isRest))) {
          played[trackIndex * barCount + bar.index] = 1;
        }
      }
    }
  });
  return { trackCount: score.tracks.length, barCount, played };
}
