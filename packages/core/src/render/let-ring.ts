/**
 * "let ring throughout" over the first bar of the tracks whose notes all ring on (REND-188): the
 * playing style the mixer gives them, written into the score around a layout or paint (alphaTab
 * patch 0029), and taken back afterwards.
 */
import type * as alphaTab from '@coderline/alphatab';

export function applyLetRingThroughout(
  tracks: readonly alphaTab.model.Track[],
  ringing: readonly number[] = [],
): () => void {
  // Only fretted notes ring on: drums and keyboards have nothing to mark.
  const marked = tracks.filter(
    track =>
      ringing.includes(track.index) &&
      !track.letRingThroughout &&
      track.staves.some(staff => staff.isStringed && !staff.isPercussion),
  );
  for (const track of marked) track.letRingThroughout = true;
  return () => {
    for (const track of marked) track.letRingThroughout = false;
  };
}
