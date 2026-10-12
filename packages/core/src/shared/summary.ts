import type { FormatId } from './formats.ts';
import type { ScoreStyle } from './style.ts';

/** Plain, cloneable description of an opened document, sent from the engine to the UI. */
export interface DocSummary {
  readonly id: string;
  readonly fileName: string;
  readonly byteLength: number;
  readonly format: FormatId;
  readonly formatVersion: string | null;
  /** The file name's extension belongs to a different format than the content. */
  readonly extensionMismatch: boolean;
  /** The file ended early; everything readable was opened, trailing content may be missing. */
  readonly truncated: boolean;
  readonly title: string;
  readonly subtitle: string;
  readonly artist: string;
  readonly album: string;
  readonly words: string;
  readonly music: string;
  readonly copyright: string;
  readonly tab: string;
  readonly instructions: string;
  readonly notices: string;
  /** Initial tempo in BPM. */
  readonly tempo: number;
  readonly tempoLabel: string;
  readonly barCount: number;
  /** Per master bar, in score order: meter and section, for position displays and navigation. */
  readonly masterBars: readonly MasterBarSummary[];
  readonly tracks: readonly TrackSummary[];
  /** Whether the file carries its own systems layout (bars per system), e.g. Guitar Pro 6–8. */
  readonly hasModelLayout: boolean;
  /** Whether the score has repeats, endings or jumps to write out (REND-319). */
  readonly hasRepeats: boolean;
  readonly hasBackingTrack: boolean;
  /** How the file asks for the score to be engraved (its stylesheet). */
  readonly style: ScoreStyle;
}

export interface MasterBarSummary {
  readonly numerator: number;
  readonly denominator: number;
  /** A pickup (anacrusis) bar, shorter than its meter. */
  readonly anacrusis: boolean;
  /** Section mark starting at this bar ("A", "Verse"…), or null. */
  readonly section: { readonly marker: string; readonly text: string } | null;
}

export interface TrackSummary {
  readonly index: number;
  readonly name: string;
  readonly shortName: string;
  /** CSS colour (#rrggbb) of the track. */
  readonly color: string;
  readonly isPercussion: boolean;
  /** General MIDI program (0–127). */
  readonly program: number;
  /** MIDI channels the track plays on (primary first; the second is used for effects). */
  readonly channels: readonly number[];
  /** Initial mixer state stored in the file. */
  readonly mix: {
    readonly volume: number;
    readonly balance: number;
    readonly mute: boolean;
    readonly solo: boolean;
  };
  readonly staves: readonly StaffSummary[];
}

export interface StaffSummary {
  readonly index: number;
  readonly showStandardNotation: boolean;
  readonly showTablature: boolean;
  readonly showSlash: boolean;
  readonly showNumbered: boolean;
  readonly isPercussion: boolean;
  readonly stringCount: number;
  /** MIDI note numbers of the open strings, highest string first (empty for non-string staves). */
  readonly tuning: readonly number[];
  readonly tuningName: string;
  readonly capo: number;
  /** Semitones between written and concert pitch for transposing instruments. */
  readonly displayTransposition: number;
}
