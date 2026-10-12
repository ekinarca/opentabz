/**
 * Guitars written as if in standard tuning without a capo (REND-232): Guitar Pro's stylesheet
 * can keep capos and tunings from changing the written notes, so that a part reads as it is
 * fingered, in its own key. Set around a layout or paint: each string's notes are written apart
 * from where they sound (alphaTab patch 0047), and a capo's bars take the key it moves them to;
 * all comes back afterwards.
 */
import * as alphaTab from '@coderline/alphatab';

/**
 * How far a string may be tuned from standard and still be written as if standard: drop and open
 * tunings are; another instrument with as many strings (a ukulele against a bass) is not.
 */
const MAX_RETUNE = 5;

export function applyWrittenAsStandard(
  tracks: readonly alphaTab.model.Track[],
  written: boolean,
): () => void {
  if (!written) return () => undefined;
  const restores: (() => void)[] = [];
  for (const track of tracks) {
    for (const staff of track.staves) {
      if (staff.isPercussion || !staff.isStringed || staff.tuning.length === 0) continue;
      const standard = alphaTab.model.Tuning.getDefaultTuningFor(staff.tuning.length);
      const retune = staff.tuning.map((value, index) => (standard?.tunings[index] ?? value) - value);
      const retuned = retune.every(semitones => Math.abs(semitones) <= MAX_RETUNE);
      const offsets = retune.map(semitones => (retuned ? semitones : 0) - staff.capo);
      if (offsets.every(offset => offset === 0)) continue;
      const keys = staff.bars.map(bar => bar.keySignature);
      staff.displayStringOffsets = offsets;
      if (staff.capo !== 0) {
        for (const bar of staff.bars)
          bar.keySignature = alphaTab.model.Staff.transposeKeySignature(bar.keySignature, -staff.capo);
      }
      restores.push(() => {
        staff.displayStringOffsets = [];
        staff.bars.forEach((bar, index) => {
          bar.keySignature = keys[index] ?? bar.keySignature;
        });
      });
    }
  }
  return () => {
    for (const restore of restores) restore();
  };
}
