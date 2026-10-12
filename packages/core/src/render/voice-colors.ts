/**
 * Tablature fret numbers of voices 2 to 4 in colours of their own (REND-250), as Guitar Pro
 * writes them: green, pink and purple. Set around a layout or paint, before the view's note
 * colours, which win where both apply; each note's own style comes back afterwards.
 */
import * as alphaTab from '@coderline/alphatab';

const { Color, NoteStyle, NoteSubElement } = alphaTab.model;

/** Voices 2, 3 and 4. */
export const VOICE_COLORS = ['#2E9B4F', '#D6338A', '#7E4FD0'] as const;

export function applyVoiceColors(tracks: readonly alphaTab.model.Track[], colored: boolean): () => void {
  if (!colored) return () => undefined;
  const colors = VOICE_COLORS.map(hex => Color.fromJson(hex));
  const saved: [alphaTab.model.Note, alphaTab.model.NoteStyle | undefined][] = [];
  for (const track of tracks) {
    for (const staff of track.staves) {
      if (staff.isPercussion || !staff.isStringed) continue;
      for (const bar of staff.bars) {
        for (const voice of bar.voices) {
          const color = voice.index === 0 ? undefined : colors[voice.index - 1];
          if (color === undefined || color === null) continue;
          for (const beat of voice.beats) {
            for (const note of beat.notes) {
              saved.push([note, note.style]);
              // The note's own colours stay, its fret number takes its voice's.
              const style = new NoteStyle();
              for (const [element, own] of note.style?.colors ?? []) style.colors.set(element, own);
              style.colors.set(NoteSubElement.GuitarTabFretNumber, color);
              note.style = style;
            }
          }
        }
      }
    }
  }
  return () => {
    for (const [note, style] of saved) {
      if (style === undefined) Reflect.deleteProperty(note, 'style');
      else note.style = style;
    }
  };
}
