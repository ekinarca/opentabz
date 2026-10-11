/**
 * The drum view's model, free of the DOM (VIEW-006, VIEW-020): the pads it shows (one per piece
 * the track plays, or one per sound of its kit, General MIDI's only on request) and which light
 * at a tick.
 */
import {
  GM_PERCUSSION_HIGH,
  GM_PERCUSSION_LOW,
  TRACK_NOTE_STRIDE,
  type PlaybackTimeline,
  type TrackDrums,
} from '@opentabz/core/shared';
import { instrumentNotes, type FretboardNotes, type FretboardShow, type ViewNote } from './fretboard.ts';

/** The kit as written (a pad per piece played) or every sound it has (a pad per MIDI sound). */
export const DRUM_MODES = ['kit', 'sounds'] as const;
export type DrumMode = (typeof DRUM_MODES)[number];

export interface DrumPad {
  readonly key: string;
  readonly label: string;
  /** The sounds played on it (indexes into the kit's sounds). */
  readonly sounds: readonly number[];
  /** The MIDI key of a pad that is one sound, else null. */
  readonly midi: number | null;
  /** The track plays it. */
  readonly used: boolean;
}

/** The sounds the track plays. */
export function usedSounds(drums: TrackDrums): Set<number> {
  const used = new Set<number>();
  for (let base = 2; base < drums.notes.notes.length; base += TRACK_NOTE_STRIDE) {
    used.add(drums.notes.notes[base] ?? -1);
  }
  return used;
}

/** A pad per piece the track plays, from the top of the staff (cymbals) down to the kick. */
export function kitPads(drums: TrackDrums): DrumPad[] {
  const used = usedSounds(drums);
  const pieces = new Map<string, { sounds: number[]; line: number }>();
  drums.sounds.forEach((sound, index) => {
    if (!used.has(index)) return;
    const piece = pieces.get(sound.piece);
    if (piece === undefined) pieces.set(sound.piece, { sounds: [index], line: sound.staffLine });
    else {
      piece.sounds.push(index);
      piece.line = Math.min(piece.line, sound.staffLine);
    }
  });
  return [...pieces]
    .sort(([a, left], [b, right]) => left.line - right.line || a.localeCompare(b))
    .map(([piece, { sounds }]) => ({ key: piece, label: piece, sounds, midi: null, used: true }));
}

/** A pad per sound of the kit, in MIDI order; with `gmOnly`, General MIDI's percussion keys only. */
export function soundPads(drums: TrackDrums, gmOnly: boolean): DrumPad[] {
  const used = usedSounds(drums);
  return drums.sounds.flatMap((sound, index) =>
    gmOnly && (sound.midi < GM_PERCUSSION_LOW || sound.midi > GM_PERCUSSION_HIGH)
      ? []
      : [{ key: sound.key, label: sound.name, sounds: [index], midi: sound.midi, used: used.has(index) }],
  );
}

/** The drum notes to show at `tick` (a note's pitch is its sound). */
export function drumNotes(
  timeline: PlaybackTimeline,
  drums: TrackDrums,
  rows: Map<number, number>,
  tick: number,
  show: FretboardShow,
): FretboardNotes {
  return instrumentNotes(timeline, drums.notes, rows, tick, show, {
    capo: 0,
    accepts: () => true,
    place: (note: ViewNote) => String(note.pitch),
  });
}

export interface PadLight {
  readonly kind: 'current' | 'next' | 'bar';
  /** The sound that lights it (for a piece: which of its sounds). */
  readonly sound: number;
}

/** What lights each pad: what sounds now first, then what comes next, then the rest of the bar. */
export function padLights(pads: readonly DrumPad[], notes: FretboardNotes): Map<string, PadLight> {
  const lights = new Map<string, PadLight>();
  const kinds = [
    ['current', notes.current],
    ['next', notes.next],
    ['bar', notes.bar],
  ] as const;
  for (const pad of pads) {
    for (const [kind, list] of kinds) {
      const note = list.find(candidate => pad.sounds.includes(candidate.pitch));
      if (note !== undefined) {
        lights.set(pad.key, { kind, sound: note.pitch });
        break;
      }
    }
  }
  return lights;
}
