/**
 * The fretboard's model, free of the DOM: which notes of a track sound at a tick (and, as asked,
 * which come next or fill the rest of the bar), where frets sit along the neck, and note names.
 */
import {
  TIMELINE_ITEM_STRIDE,
  TRACK_BEAT_STRIDE,
  TRACK_NOTE_STRIDE,
  type PlaybackTimeline,
  type TrackNotes,
} from '@opentabz/core/shared';
import {
  findBarOccurrence,
  findSlice,
  nextSlice,
  occurrence,
  slice,
  type Slice,
} from '../score-view/timeline-lookup.ts';

/** Shown besides the notes being played: nothing, the next notes, or the rest of the bar. */
export const FRETBOARD_SHOWS = ['beat', 'next', 'bar'] as const;
export type FretboardShow = (typeof FRETBOARD_SHOWS)[number];
/** Note names on the neck: never, when pointed at, or always. */
export const NOTE_LABELS = ['off', 'hover', 'always'] as const;
export type NoteLabels = (typeof NOTE_LABELS)[number];

/** Frets drawn when the music stays lower. */
export const MIN_FRETS = 24;
export const SINGLE_INLAYS: readonly number[] = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_INLAYS: readonly number[] = [12, 24];

/** A note on the neck. Strings count from the highest (1); the fret counts from the nut. */
export interface FretNote {
  readonly string: number;
  readonly fret: number;
  /** The MIDI note that sounds. */
  readonly pitch: number;
  readonly flags: number;
}

export interface FretboardNotes {
  /** Sounding now (including notes held from an earlier beat). */
  readonly current: readonly FretNote[];
  /** The next notes to play, when asked for. */
  readonly next: readonly FretNote[];
  /** The other notes of the bar, when asked for. */
  readonly bar: readonly FretNote[];
  /** Names are spelled with flats (the key has flats). */
  readonly flats: boolean;
}

export const NO_NOTES: FretboardNotes = { current: [], next: [], bar: [], flats: false };

/** Row of the beat table for each beat id. */
export function indexTrackNotes(notes: TrackNotes): Map<number, number> {
  const index = new Map<number, number>();
  for (let row = 0; row * TRACK_BEAT_STRIDE < notes.beats.length; row++) {
    index.set(notes.beats[row * TRACK_BEAT_STRIDE] ?? -1, row);
  }
  return index;
}

function notesOfBeat(notes: TrackNotes, rows: Map<number, number>, beatId: number, capo: number): FretNote[] {
  const row = rows.get(beatId);
  if (row === undefined) return [];
  const first = notes.beats[row * TRACK_BEAT_STRIDE + 1] ?? 0;
  const count = notes.beats[row * TRACK_BEAT_STRIDE + 2] ?? 0;
  const result: FretNote[] = [];
  for (let note = first; note < first + count; note++) {
    const base = note * TRACK_NOTE_STRIDE;
    result.push({
      string: notes.notes[base] ?? 0,
      // Frets are written from the capo; on the neck they count from the nut.
      fret: capo + (notes.notes[base + 1] ?? 0),
      pitch: notes.notes[base + 2] ?? 0,
      flags: notes.notes[base + 3] ?? 0,
    });
  }
  return result;
}

/** Beats of `track` in a slice: all those sounding, or only those starting there. */
function beatsOf(timeline: PlaybackTimeline, target: Slice, track: number, starting: boolean): number[] {
  const beats: number[] = [];
  for (let item = target.firstItem; item < target.firstItem + target.itemCount; item++) {
    const base = item * TIMELINE_ITEM_STRIDE;
    if (timeline.items[base + 1] !== track) continue;
    if (starting && timeline.items[base + 2] !== target.startTick) continue;
    beats.push(timeline.items[base] ?? -1);
  }
  return beats;
}

/** How far ahead to look for the next notes (a long rest ends the preview). */
const LOOKAHEAD_SLICES = 64;

/** The notes of the track to show at `tick`. */
export function fretboardNotes(
  timeline: PlaybackTimeline,
  notes: TrackNotes,
  rows: Map<number, number>,
  tick: number,
  show: FretboardShow,
  capo: number,
): FretboardNotes {
  const bar = occurrence(timeline, findBarOccurrence(timeline, tick));
  const at = bar === null ? null : findSlice(timeline, bar, tick);
  if (bar === null || at === null) return NO_NOTES;
  const track = notes.trackIndex;
  const sounding = beatsOf(timeline, at, track, false);
  const current = sounding.flatMap(beat => notesOfBeat(notes, rows, beat, capo));

  let next: FretNote[] = [];
  if (show === 'next') {
    let candidate = nextSlice(timeline, at);
    for (let guard = 0; candidate !== null && guard < LOOKAHEAD_SLICES; guard++) {
      const starting = beatsOf(timeline, candidate, track, true).filter(beat => rows.has(beat));
      if (starting.length > 0) {
        next = starting.flatMap(beat => notesOfBeat(notes, rows, beat, capo));
        break;
      }
      candidate = nextSlice(timeline, candidate);
    }
  }

  // The bar's beats, for the rest of the bar and for the key the names are spelled in.
  const barBeats: number[] = [];
  const seen = new Set<number>();
  for (let position = bar.firstSlice; position < bar.firstSlice + bar.sliceCount; position++) {
    const part = slice(timeline, position);
    if (part === null) break;
    for (const beat of beatsOf(timeline, part, track, true)) {
      if (!seen.has(beat) && rows.has(beat)) barBeats.push(beat);
      seen.add(beat);
    }
  }
  // The rest of the bar: each place once, and not where a note is sounding already.
  const taken = new Set(current.map(note => `${note.string}:${note.fret}`));
  const rest: FretNote[] = [];
  if (show === 'bar') {
    const playing = new Set(sounding);
    for (const beat of barBeats) {
      if (playing.has(beat)) continue;
      for (const note of notesOfBeat(notes, rows, beat, capo)) {
        const place = `${note.string}:${note.fret}`;
        if (taken.has(place)) continue;
        taken.add(place);
        rest.push(note);
      }
    }
  }
  const keyBeat = sounding.find(beat => rows.has(beat)) ?? barBeats[0];
  const keyRow = keyBeat === undefined ? undefined : rows.get(keyBeat);
  const key = keyRow === undefined ? 0 : (notes.beats[keyRow * TRACK_BEAT_STRIDE + 3] ?? 0);
  return { current, next, bar: rest, flats: key < 0 };
}

/** Frets to draw: at least {@link MIN_FRETS}, more if the music goes higher. */
export function fretCount(notes: TrackNotes | null, capo: number): number {
  let highest = 0;
  if (notes !== null) {
    for (let base = 1; base < notes.notes.length; base += TRACK_NOTE_STRIDE) {
      highest = Math.max(highest, notes.notes[base] ?? 0);
    }
  }
  return Math.max(MIN_FRETS, capo + highest);
}

/**
 * Where fret wire `fret` sits along the neck, from 0 (the nut) to 1 (the last wire). Real frets
 * narrow by a twelfth root of two each; that is blended half-way with even spacing, so high frets
 * stay easy to read and to touch.
 */
export function wirePosition(fret: number, frets: number): number {
  const real = (wire: number) => 1 - 2 ** (-wire / 12);
  return 0.5 * (real(fret) / real(frets)) + 0.5 * (fret / frets);
}

/** The middle of the space where `fret` (1 or more) is played, as a share of the neck. */
export function fretCentre(fret: number, frets: number): number {
  return (wirePosition(fret - 1, frets) + wirePosition(fret, frets)) / 2;
}

const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

/** The name of a pitch class, as in "F♯" or "G♭". */
export function pitchName(pitch: number, flats: boolean): string {
  const names = flats ? FLAT_NAMES : SHARP_NAMES;
  return names[((pitch % 12) + 12) % 12] ?? '?';
}

/** A note's name with its octave, middle C being C4. */
export function noteName(pitch: number, flats: boolean): string {
  return `${pitchName(pitch, flats)}${Math.floor(pitch / 12) - 1}`;
}

/**
 * The note at absolute `fret` of `string` (1 = the highest), or null behind the capo, where no
 * note can be played.
 */
export function pitchAt(
  tuning: readonly number[],
  string: number,
  fret: number,
  capo: number,
): number | null {
  const open = tuning[string - 1];
  return open === undefined || fret < capo ? null : open + fret;
}
