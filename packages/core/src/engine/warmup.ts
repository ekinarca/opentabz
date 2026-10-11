/**
 * A short original score (OpenTabz, AGPL) used to warm up the engine's JIT when the worker
 * starts, so the first real file renders at full speed. It touches standard notation,
 * tablature, chords, slurs, bends and vibrato.
 */
export const WARMUP_SCORE = String.raw`
\title "Warm-up"
\tempo 96
\track "Guitar"
\staff {score tabs}
\tuning (E4 B3 G3 D3 A2 E2)
:8 0.6 3.6 2.5 0.4 2.4{h} 4.4 2.3 4.3 |
(0.6 2.5 2.4 1.3 0.2 0.1).2 3.2{b (0 4)}.4 5.1{v}.4 |
`;
