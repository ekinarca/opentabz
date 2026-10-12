/**
 * The editor's caret (EDIT-004): the beat and string the next fret is written on, and how keys
 * move it, as in Guitar Pro — across the beats of its voice, from bar to bar, and from string to
 * string. Beats are known by their ids, which they keep through edits, undone and redone; where
 * a beat is comes from the track's beats as the engine lists them (TrackBeats).
 */
import {
  BEAMING_ORDER,
  BEAT_EMPTY,
  DURATION_VALUES,
  DYNAMICS,
  FINGERS,
  MAX_FRET,
  SPELLING_ORDER,
  TRACK_BEAT_MARK_STRIDE,
  TRACK_BEAT_NOTE_STRIDE,
  TRACK_BEATS_STRIDE,
  TRACK_NOTE_MARK_STRIDE,
  type Beaming,
  type BeatAddress,
  type DurationValue,
  type Dynamic,
  type Finger,
  type Spelling,
  type TrackBeats,
} from '@opentabz/core/shared';

export interface Caret {
  readonly track: number;
  readonly staff: number;
  readonly voice: number;
  /** The beat, by its id. */
  readonly beatId: number;
  /** The string, 1 the lowest, as alphaTab numbers them. */
  readonly string: number;
}

/** One of the track's beats, as the engine lists it. */
export interface BeatRow {
  readonly beatId: number;
  readonly staff: number;
  readonly bar: number;
  readonly voice: number;
  readonly beat: number;
  /** alphaTab's duration: 1 a whole note … 256; −2 a double whole note. */
  readonly duration: number;
  readonly dots: number;
  readonly flags: number;
  /** Where the beat ends in its bar, and how long the bar is, in ticks. */
  readonly end: number;
  readonly barLength: number;
  /** Its dynamics, its beam to the next beat and its text; null where none of the editor's. */
  readonly dynamics: Dynamic | null;
  readonly beaming: Beaming | null;
  readonly text: string | null;
  /** The beat's notes: string (1 the lowest), fret and techniques (TECHNIQUE_… flags). */
  readonly notes: readonly NoteRow[];
}

export interface NoteRow {
  readonly string: number;
  readonly fret: number;
  readonly flags: number;
  readonly leftFinger?: Finger;
  readonly rightFinger?: Finger;
  readonly spelling?: Spelling | null;
}

function rowAt(beats: TrackBeats, index: number): BeatRow {
  const at = index * TRACK_BEATS_STRIDE;
  const value = (offset: number): number => beats.beats[at + offset] ?? 0;
  const firstNote = value(8);
  const notes = Array.from({ length: value(9) }, (_, note): NoteRow => {
    const noteAt = (firstNote + note) * TRACK_BEAT_NOTE_STRIDE;
    const markAt = (firstNote + note) * TRACK_NOTE_MARK_STRIDE;
    return {
      string: beats.notes[noteAt] ?? 0,
      fret: beats.notes[noteAt + 1] ?? 0,
      flags: beats.notes[noteAt + 2] ?? 0,
      leftFinger: FINGERS[beats.noteMarks[markAt] ?? 0] ?? 'none',
      rightFinger: FINGERS[beats.noteMarks[markAt + 1] ?? 0] ?? 'none',
      spelling: SPELLING_ORDER[beats.noteMarks[markAt + 2] ?? 0] ?? null,
    };
  });
  const marks = index * TRACK_BEAT_MARK_STRIDE;
  const beatId = value(0);
  return {
    dynamics: DYNAMICS[beats.beatMarks[marks] ?? -1] ?? null,
    beaming: BEAMING_ORDER[beats.beatMarks[marks + 1] ?? -1] ?? null,
    text: beats.texts.find(([id]) => id === beatId)?.[1] ?? null,
    beatId: value(0),
    staff: value(1),
    bar: value(2),
    voice: value(3),
    beat: value(4),
    duration: value(5),
    dots: value(6),
    flags: value(7),
    end: value(10),
    barLength: value(11),
    notes,
  };
}

/** Every beat of a staff's voice, in order. */
export function voiceRows(beats: TrackBeats, staff: number, voice: number): BeatRow[] {
  const rows: BeatRow[] = [];
  const count = beats.beats.length / TRACK_BEATS_STRIDE;
  for (let index = 0; index < count; index++) {
    const at = index * TRACK_BEATS_STRIDE;
    if (beats.beats[at + 1] === staff && beats.beats[at + 3] === voice) rows.push(rowAt(beats, index));
  }
  return rows;
}

/** A beat of the track, by its id, or null when the track has no such beat (any more). */
export function rowOf(beats: TrackBeats, beatId: number): BeatRow | null {
  const count = beats.beats.length / TRACK_BEATS_STRIDE;
  for (let index = 0; index < count; index++) {
    if (beats.beats[index * TRACK_BEATS_STRIDE] === beatId) return rowAt(beats, index);
  }
  return null;
}

/** Where the caret's beat is, for the edit commands, or null when it is gone. */
export function caretAddress(beats: TrackBeats, caret: Caret): BeatAddress | null {
  const row = rowOf(beats, caret.beatId);
  return row === null
    ? null
    : { track: caret.track, staff: row.staff, bar: row.bar, voice: row.voice, beat: row.beat };
}

/** The fret written on the caret's string of its beat, or null when nothing is there. */
export function fretAtCaret(beats: TrackBeats, caret: Caret): number | null {
  return rowOf(beats, caret.beatId)?.notes.find(note => note.string === caret.string)?.fret ?? null;
}

/** The caret on the previous or next beat of its voice (from bar to bar), or as it is at an end. */
export function stepCaret(beats: TrackBeats, caret: Caret, direction: 1 | -1): Caret {
  const rows = voiceRows(beats, caret.staff, caret.voice);
  const index = rows.findIndex(row => row.beatId === caret.beatId);
  const next = rows[index + direction];
  return index < 0 || next === undefined ? caret : { ...caret, beatId: next.beatId };
}

/**
 * What → does, as in Guitar Pro: the caret goes to the next beat of its voice; past the last beat
 * of a bar with room left, a rest goes there for the next note; past the score's last beat, a bar.
 */
export type StepRight =
  | { readonly kind: 'move'; readonly caret: Caret }
  | { readonly kind: 'beat'; readonly row: BeatRow }
  | { readonly kind: 'bar'; readonly row: BeatRow };

export function stepRight(beats: TrackBeats, caret: Caret): StepRight {
  const rows = voiceRows(beats, caret.staff, caret.voice);
  const index = rows.findIndex(row => row.beatId === caret.beatId);
  const row = rows[index];
  const next = rows[index + 1];
  if (row === undefined) return { kind: 'move', caret };
  const lastOfBar = next?.bar !== row.bar;
  if (lastOfBar && (row.flags & BEAT_EMPTY) === 0 && row.end < row.barLength) return { kind: 'beat', row };
  if (next === undefined) return { kind: 'bar', row };
  return { kind: 'move', caret: { ...caret, beatId: next.beatId } };
}

/** Ticks of a whole note (960 a quarter). */
const WHOLE = 3840;

/** How long a written duration lasts, dots included (tuplets aside), in ticks. */
export function durationTicks(duration: number, dots: number): number {
  const plain = duration > 0 ? WHOLE / duration : WHOLE * -duration;
  return plain * (2 - 1 / 2 ** dots);
}

/**
 * The length of the rest → puts after a bar's last beat: as long as that beat, if the bar has room
 * for it (null: the beat put in copies it), else the longest note value the room takes.
 */
export function restAfter(row: BeatRow): { readonly duration: DurationValue; readonly dots: number } | null {
  const room = row.barLength - row.end;
  if (durationTicks(row.duration, row.dots) <= room) return null;
  const duration = DURATION_VALUES.find(value => WHOLE / value <= room) ?? 64;
  return { duration, dots: 0 };
}

/** The caret on the first beat of the previous or next bar of its voice, or as it is. */
export function stepCaretBar(beats: TrackBeats, caret: Caret, direction: 1 | -1): Caret {
  const rows = voiceRows(beats, caret.staff, caret.voice);
  const current = rows.find(row => row.beatId === caret.beatId);
  if (current === undefined) return caret;
  const bar = direction > 0 ? current.bar + 1 : current.bar - 1;
  const target = rows.find(row => row.bar === bar);
  return target === undefined ? caret : { ...caret, beatId: target.beatId };
}

/**
 * The caret a line up or down the tablature: up is the next string higher in pitch, or lower when
 * the tablature is the other way up (REND-315). It stays on the outer strings.
 */
export function stepCaretString(caret: Caret, strings: number, up: boolean, inverted: boolean): Caret {
  const higher = up !== inverted;
  const string = Math.min(strings, Math.max(1, caret.string + (higher ? 1 : -1)));
  return { ...caret, string };
}

/**
 * The string a note moves to at its pitch (EDIT-052), as the engine moves it: the next string
 * higher or lower in pitch that its beat leaves free and that has a fret for it; null when none.
 * `tuning` is the open strings' MIDI notes, the highest string first.
 */
export function stringFor(
  row: BeatRow,
  tuning: readonly number[],
  string: number,
  higher: boolean,
): number | null {
  const note = row.notes.find(candidate => candidate.string === string);
  if (note === undefined) return null;
  const open = (each: number): number => tuning[tuning.length - each] ?? 0;
  const pitch = open(string) + note.fret;
  const step = higher ? 1 : -1;
  for (let other = string + step; other >= 1 && other <= tuning.length; other += step) {
    const fret = pitch - open(other);
    if (fret < 0 || fret > MAX_FRET) return null;
    if (!row.notes.some(candidate => candidate.string === other)) return other;
  }
  return null;
}

/** A fret typed a moment ago, which a second digit may extend (1 then 2 is 12). */
export interface TypedFret {
  readonly beatId: number;
  readonly string: number;
  readonly fret: number;
  /** When it was typed (ms). */
  readonly at: number;
}

/** How long after a digit a second one still makes a two-digit fret. */
export const SECOND_DIGIT_MS = 1000;

/** The fret a digit writes: a second digit typed soon after the first, on the same note, joins it. */
export function typedFret(previous: TypedFret | null, caret: Caret, digit: number, now: number): number {
  if (
    previous !== null &&
    previous.beatId === caret.beatId &&
    previous.string === caret.string &&
    now - previous.at < SECOND_DIGIT_MS &&
    previous.fret > 0 &&
    previous.fret < 10
  ) {
    const joined = previous.fret * 10 + digit;
    if (joined <= MAX_FRET) return joined;
  }
  return digit;
}

/**
 * The duration a step longer or shorter (Guitar Pro's + and − keys), among those the keys write:
 * a whole note to a sixty-fourth; null when there is none (a whole note made longer). A duration
 * outside them (a double whole note, a 128th) steps in among them.
 */
export function steppedDuration(duration: number, longer: boolean): DurationValue | null {
  const values = DURATION_VALUES;
  const index = values.findIndex(value => value === duration);
  if (index >= 0) return values[index + (longer ? -1 : 1)] ?? null;
  if (duration < 1) return longer ? null : (values[0] ?? null);
  return longer ? (values.at(-1) ?? null) : null;
}
