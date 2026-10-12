/**
 * Notation the stylesheet writes or leaves out by changing the score for a layout or paint
 * (REND-248): C and cut C for 4/4 and 2/2, and the rests of voices 2 to 4. Each returns what puts
 * the score back.
 */
import type * as alphaTab from '@coderline/alphatab';

/** Whether a bar's time signature can be written as C (4/4) or cut C (2/2). */
function common(bar: alphaTab.model.MasterBar): boolean {
  const { timeSignatureNumerator: beats, timeSignatureDenominator: unit } = bar;
  return (beats === 4 && unit === 4) || (beats === 2 && unit === 2);
}

/** Every 4/4 and 2/2 written as C and cut C, or every time signature in numbers. */
export function applyCommonTime(score: alphaTab.model.Score, symbols: boolean): () => void {
  const saved = score.masterBars.map(bar => bar.timeSignatureCommon);
  for (const bar of score.masterBars) bar.timeSignatureCommon = symbols && common(bar);
  return () => {
    score.masterBars.forEach((bar, index) => {
      bar.timeSignatureCommon = saved[index] ?? false;
    });
  };
}

/** The rests of voices 2 to 4 left out: the music of the first voice keeps its own. */
export function applyExtraRests(score: alphaTab.model.Score, hidden: boolean): () => void {
  if (!hidden) return () => undefined;
  const marked: alphaTab.model.Beat[] = [];
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        for (const voice of bar.voices) {
          if (voice.index === 0) continue;
          for (const beat of voice.beats) {
            if (!beat.isRest || beat.isEmpty) continue;
            beat.isEmpty = true;
            marked.push(beat);
          }
        }
      }
    }
  }
  return () => {
    for (const beat of marked) beat.isEmpty = false;
  };
}
