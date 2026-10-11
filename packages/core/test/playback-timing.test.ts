/**
 * Proof that notes start on their own sample (OpenTabz patch 0019, FEATURE_MATRIX AUD-003): the
 * synthesizer works in blocks of 64 samples and used to apply every event of a block at its
 * start, up to 1.45 ms early. Hits that fall at different places within blocks must keep exactly
 * the spacing the tempo gives.
 */
import { describe, expect, it } from 'vitest';
import { renderAudio } from './playback-audio.ts';
import { playTex } from './playback-helpers.ts';

const SAMPLE_RATE = 44_100;

/** The first sample of each sound after silence. */
function onsets(samples: Float32Array, level: number, quietSamples: number): number[] {
  const found: number[] = [];
  let quiet = quietSamples;
  for (let index = 0; index < samples.length; index++) {
    const loud = Math.abs(samples[index] ?? 0) > level;
    if (loud && quiet >= quietSamples) found.push(index);
    quiet = loud ? 0 : quiet + 1;
  }
  return found;
}

describe('AUD-003 sample-accurate scheduling', () => {
  it('AUD-003 starts every note on its sample, wherever it falls in a block', () => {
    // At 125 BPM an eighth note is 10 584 samples: 165.375 blocks, so hits land in different
    // places within the synthesizer's blocks.
    const played = playTex(
      [
        '\\title "Timing"',
        '\\tempo 125',
        '\\track "Drums" {instrument percussion}',
        '\\articulation defaults',
        ':8 HiHatClosed r HiHatClosed r HiHatClosed r HiHatClosed r | :8 HiHatClosed r HiHatClosed r HiHatClosed r HiHatClosed r',
      ].join('\n'),
    );
    const audio = renderAudio(played);
    const mono = audio.left.map((value, index) => value + (audio.right[index] ?? 0));
    const hits = onsets(mono, 0.02, 2000);
    expect(hits).toHaveLength(8);
    const quarter = (60 / 125) * SAMPLE_RATE;
    // The same sound every time: whatever its attack, the spacing is the tempo's to the sample.
    hits.slice(1).forEach((hit, index) => {
      expect(Math.abs(hit - (hits[index] ?? 0) - quarter)).toBeLessThanOrEqual(1);
    });
  });
});
