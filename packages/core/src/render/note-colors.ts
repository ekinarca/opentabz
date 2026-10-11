/**
 * Notes coloured for a view (REND-300…REND-303): each note of the shown tracks gets the colour of
 * its class (string, interval above the tonic, degree, or part in the chord) on its notehead, fret
 * number, slash and number, around a layout or paint, and its own style back afterwards.
 */
import * as alphaTab from '@coderline/alphatab';
import {
  CHORD_TONES,
  chordToneOf,
  degreeOf,
  rootPitchClass,
  tonicOf,
  type NoteColoring,
} from '../shared/note-colors.ts';

const { Color, KeySignatureType, NoteStyle, NoteSubElement } = alphaTab.model;

const COLOURED = [
  NoteSubElement.StandardNotationNoteHead,
  NoteSubElement.GuitarTabFretNumber,
  NoteSubElement.SlashNoteHead,
  NoteSubElement.NumberedNumber,
];

interface ChordAt {
  readonly bar: number;
  readonly start: number;
  readonly root: number;
  readonly pitches: ReadonlySet<number>;
}

/** The chords a staff writes, in order, with the pitch classes their shapes sound. */
function chordsOf(staff: alphaTab.model.Staff): ChordAt[] {
  const tuning = staff.stringTuning.tunings;
  const chords: ChordAt[] = [];
  for (const bar of staff.bars) {
    for (const voice of bar.voices) {
      for (const beat of voice.beats) {
        const chord = beat.chord;
        if (chord === null) continue;
        const root = rootPitchClass(chord.name);
        if (root === null) continue;
        // The shape's frets go from the highest string down, as the tuning does.
        const pitches = new Set<number>();
        chord.strings.forEach((fret, string) => {
          const open = tuning[string];
          if (fret >= 0 && open !== undefined) pitches.add((open + fret + staff.capo) % 12);
        });
        chords.push({ bar: bar.index, start: beat.playbackStart, root, pitches });
      }
    }
  }
  return chords.sort((a, b) => a.bar - b.bar || a.start - b.start);
}

function colorOf(hex: string): alphaTab.model.Color | null {
  return Color.fromJson(hex);
}

/** The class of a note in a coloring, as an index into its colours, or null for no colour. */
function classOf(
  coloring: NoteColoring,
  note: alphaTab.model.Note,
  bar: alphaTab.model.Bar,
  chord: ChordAt | undefined,
): number | null {
  const pitch = note.displayValue;
  switch (coloring.mode) {
    case 'string':
      return note.isStringed && note.string > 0 ? note.string - 1 : null;
    case 'interval':
      return (
        (((pitch - tonicOf(bar.keySignature, bar.keySignatureType === KeySignatureType.Minor)) % 12) + 12) %
        12
      );
    case 'degree': {
      const minor = bar.keySignatureType === KeySignatureType.Minor;
      // Notes outside the key take the last colour.
      return degreeOf(pitch, tonicOf(bar.keySignature, minor), minor) ?? 7;
    }
    case 'chordTone': {
      if (chord === undefined) return null;
      const tone = chordToneOf(note.realValue, chord.root, chord.pitches);
      return tone === null ? null : CHORD_TONES.indexOf(tone);
    }
  }
}

/** Colours the notes of the tracks, returning what gives them their own styles back. */
export function applyNoteColors(
  tracks: readonly alphaTab.model.Track[],
  coloring: NoteColoring | undefined,
): () => void {
  if (coloring === undefined || coloring.colors.length === 0) return () => undefined;
  const colors = coloring.colors.map(colorOf);
  const saved: [alphaTab.model.Note, alphaTab.model.NoteStyle | undefined][] = [];
  for (const track of tracks) {
    for (const staff of track.staves) {
      if (staff.isPercussion) continue;
      const chords = coloring.mode === 'chordTone' ? chordsOf(staff) : [];
      for (const bar of staff.bars) {
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            // The chord written last before the beat (bars, then time within them).
            const chord = chords.findLast(
              candidate =>
                candidate.bar < bar.index ||
                (candidate.bar === bar.index && candidate.start <= beat.playbackStart),
            );
            for (const note of beat.notes) {
              const index = classOf(coloring, note, bar, chord);
              const color = index === null ? null : (colors[index % colors.length] ?? null);
              if (color === null) continue;
              saved.push([note, note.style]);
              const style = new NoteStyle();
              for (const element of COLOURED) style.colors.set(element, color);
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
