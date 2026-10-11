/** The song at a glance, for the song overview (VIEW-015): the bars each track plays in. */
export interface ScoreOverview {
  readonly trackCount: number;
  readonly barCount: number;
  /** Per track, then per master bar (`track * barCount + bar`): 1 where it plays, 0 where it rests. */
  readonly played: Uint8Array;
}

/** Whether a track plays in a master bar. */
export function playsIn(overview: ScoreOverview, trackIndex: number, barIndex: number): boolean {
  return overview.played[trackIndex * overview.barCount + barIndex] === 1;
}
