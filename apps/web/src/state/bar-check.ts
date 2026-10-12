/**
 * Bars whose voices do not fill them (EDIT-103), as Guitar Pro marks them: each voice with
 * something written, how much shorter (or longer) than its bar it is, and the next such voice
 * after a place, to go to.
 */
import { BEAT_EMPTY, TRACK_BEATS_STRIDE, type TrackBeats } from '@opentabz/core/shared';

/** A voice of a bar that does not fill it. */
export interface FaultyVoice {
  readonly staff: number;
  readonly bar: number;
  readonly voice: number;
  /** Its first beat, to put the caret on. */
  readonly beatId: number;
  /** Ticks it is short of its bar (960 a quarter note); below 0, ticks too many. */
  readonly missing: number;
}

/** The track's voices that do not fill their bars, in score order. */
export function faultyVoices(beats: TrackBeats): FaultyVoice[] {
  const faulty: FaultyVoice[] = [];
  const count = beats.beats.length / TRACK_BEATS_STRIDE;
  let index = 0;
  while (index < count) {
    const at = index * TRACK_BEATS_STRIDE;
    const value = (row: number, offset: number): number =>
      beats.beats[row * TRACK_BEATS_STRIDE + offset] ?? 0;
    const [staff, bar, voice] = [value(index, 1), value(index, 2), value(index, 3)];
    const beatId = beats.beats[at] ?? 0;
    // The voice's beats, to its last.
    let last = index;
    let written = (value(index, 7) & BEAT_EMPTY) === 0;
    while (
      last + 1 < count &&
      value(last + 1, 1) === staff &&
      value(last + 1, 2) === bar &&
      value(last + 1, 3) === voice
    ) {
      last++;
      if ((value(last, 7) & BEAT_EMPTY) === 0) written = true;
    }
    const missing = value(last, 11) - value(last, 10);
    if (written && missing !== 0) faulty.push({ staff, bar, voice, beatId, missing });
    index = last + 1;
  }
  return faulty;
}

/** The first faulty voice after a bar (of any staff and voice), else the first of all; null when none. */
export function nextFaulty(faulty: readonly FaultyVoice[], after: number): FaultyVoice | null {
  return faulty.find(each => each.bar > after) ?? faulty[0] ?? null;
}
