/**
 * The lyrics of one track for the lyrics pane, built in the engine worker on request;
 * alphaTab-free.
 */
export interface LyricSyllable {
  /** The beat it is sung on. */
  readonly beatId: number;
  readonly text: string;
  /** The word goes on in the next syllable (it was written with a hyphen). */
  readonly continues: boolean;
  /** A line of the lyrics starts with it. */
  readonly lineStart: boolean;
  /** A comment written before it in brackets ("Chorus"), shown as a heading. */
  readonly heading: string | null;
}

export interface TrackLyrics {
  readonly trackIndex: number;
  /** One list of syllables per line of lyrics (verse), in score order. */
  readonly verses: readonly (readonly LyricSyllable[])[];
}
