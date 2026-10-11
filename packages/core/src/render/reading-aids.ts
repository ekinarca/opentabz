/**
 * Reading aids written into the score for a view (VIEW-009, REND-306, REND-317): note names above
 * each beat (its free text, alongside any the file writes), and beat counts under it (a lyric
 * line below the track's own), around a layout or paint, the beats' own back afterwards.
 */
import * as alphaTab from '@coderline/alphatab';
import { countAt, noteName, type ReadingAids } from '../shared/reading-aids.ts';

const { GraceType, KeySignature } = alphaTab.model;

export function applyReadingAids(
  tracks: readonly alphaTab.model.Track[],
  aids: ReadingAids | undefined,
): () => void {
  if (aids === undefined || (aids.noteNames === 'off' && !aids.counts)) return () => undefined;
  const texts: [alphaTab.model.Beat, string | null][] = [];
  const lyrics: [alphaTab.model.Beat, string[] | null][] = [];
  for (const track of tracks) {
    // Counts go on the line under the track's lyrics.
    let verses = 0;
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        for (const voice of bar.voices) {
          for (const beat of voice.beats) verses = Math.max(verses, beat.lyrics?.length ?? 0);
        }
      }
    }
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        const unit = 3840 / bar.masterBar.timeSignatureDenominator;
        // Flat keys come before C in alphaTab's order of keys.
        const flats = bar.keySignature < KeySignature.C;
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            if (beat.isRest || beat.graceType !== GraceType.None) continue;
            if (aids.noteNames !== 'off' && !staff.isPercussion && beat.notes.length > 0) {
              const names = [...beat.notes]
                .sort((a, b) => a.realValue - b.realValue)
                .map(note => noteName(note.realValue, flats, aids.noteNames === 'octaves'))
                // A dot keeps them apart in the small italics of a score's text.
                .join('·');
              texts.push([beat, beat.text]);
              beat.text = beat.text === null || beat.text.length === 0 ? names : `${names}  ${beat.text}`;
            }
            // Counted once a track: on its first staff's first voice.
            if (aids.counts && staff.index === 0 && voice.index === 0) {
              const count = countAt(beat.displayStart, unit);
              if (count.length === 0) continue;
              lyrics.push([beat, beat.lyrics]);
              const own = beat.lyrics ?? [];
              beat.lyrics = [...Array.from({ length: verses }, (_, index) => own[index] ?? ''), count];
            }
          }
        }
      }
    }
  }
  return () => {
    for (const [beat, text] of texts) beat.text = text;
    for (const [beat, own] of lyrics) beat.lyrics = own;
  };
}
