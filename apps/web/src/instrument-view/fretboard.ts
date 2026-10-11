/**
 * The instrument views' model, free of the DOM: which notes of a track sound at a tick (and, as
 * asked, which come next or fill the rest of the bar), where frets sit along the neck, and note
 * names.
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

/**
 * A note an instrument view shows. On the track's staff with strings: its string (1 is the
 * highest) and fret counted from the nut; on other staves both are 0.
 */
export interface ViewNote {
  readonly string: number;
  readonly fret: number;
  /** The MIDI note that sounds. */
  readonly pitch: number;
  readonly flags: number;
  /** The staff of the track it is written on (on a piano, 0 is the right hand). */
  readonly staff: number;
}

/** A note on the neck. */
export type FretNote = ViewNote;

export interface FretboardNotes {
  /** Sounding now (including notes held from an earlier beat). */
  readonly current: readonly ViewNote[];
  /** The next notes to play, when asked for. */
  readonly next: readonly ViewNote[];
  /** The other notes of the bar, when asked for. */
  readonly bar: readonly ViewNote[];
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

function notesOfBeat(notes: TrackNotes, rows: Map<number, number>, beatId: number, capo: number): ViewNote[] {
  const row = rows.get(beatId);
  if (row === undefined) return [];
  const first = notes.beats[row * TRACK_BEAT_STRIDE + 1] ?? 0;
  const count = notes.beats[row * TRACK_BEAT_STRIDE + 2] ?? 0;
  const staff = notes.beats[row * TRACK_BEAT_STRIDE + 4] ?? 0;
  const result: ViewNote[] = [];
  for (let note = first; note < first + count; note++) {
    const base = note * TRACK_NOTE_STRIDE;
    const string = notes.notes[base] ?? 0;
    result.push({
      string,
      // Frets are written from the capo; on the neck they count from the nut.
      fret: string > 0 ? capo + (notes.notes[base + 1] ?? 0) : 0,
      pitch: notes.notes[base + 2] ?? 0,
      flags: notes.notes[base + 3] ?? 0,
      staff,
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

/** Which notes a view shows, and where it draws each (one note per place in the rest of the bar). */
export interface NoteFilter {
  readonly capo: number;
  readonly accepts: (note: ViewNote) => boolean;
  readonly place: (note: ViewNote) => string;
}

/** The notes of the track a view shows at `tick`. */
export function instrumentNotes(
  timeline: PlaybackTimeline,
  notes: TrackNotes,
  rows: Map<number, number>,
  tick: number,
  show: FretboardShow,
  filter: NoteFilter,
): FretboardNotes {
  const bar = occurrence(timeline, findBarOccurrence(timeline, tick));
  const at = bar === null ? null : findSlice(timeline, bar, tick);
  if (bar === null || at === null) return NO_NOTES;
  const track = notes.trackIndex;
  const notesOf = (beat: number) => notesOfBeat(notes, rows, beat, filter.capo).filter(filter.accepts);
  const sounding = beatsOf(timeline, at, track, false);
  const current = sounding.flatMap(notesOf);

  let next: ViewNote[] = [];
  if (show === 'next') {
    let candidate = nextSlice(timeline, at);
    for (let guard = 0; candidate !== null && guard < LOOKAHEAD_SLICES; guard++) {
      const starting = beatsOf(timeline, candidate, track, true).flatMap(notesOf);
      if (starting.length > 0) {
        next = starting;
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
  const taken = new Set(current.map(filter.place));
  const rest: ViewNote[] = [];
  if (show === 'bar') {
    const playing = new Set(sounding);
    for (const beat of barBeats) {
      if (playing.has(beat)) continue;
      for (const note of notesOf(beat)) {
        const place = filter.place(note);
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

/** The notes of the track to show on the neck at `tick`: those of the staff with strings. */
export function fretboardNotes(
  timeline: PlaybackTimeline,
  notes: TrackNotes,
  rows: Map<number, number>,
  tick: number,
  show: FretboardShow,
  capo: number,
): FretboardNotes {
  return instrumentNotes(timeline, notes, rows, tick, show, {
    capo,
    accepts: note => note.string > 0,
    place: note => `${note.string}:${note.fret}`,
  });
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
