/**
 * Bars put in and taken away (EDIT-020), in every track, and what follows from it: the score's
 * bars numbered and linked again, the notes of a bar taken away parted from the notes they join.
 */
import * as alphaTab from '@coderline/alphatab';
import type { Transaction } from './commands.ts';
import { EditError } from './error.ts';

/** Parts a note about to be taken away from the notes joined to it. */
export function detach(note: alphaTab.model.Note): void {
  const { tieOrigin, tieDestination, slurOrigin, slurDestination } = note;
  if (tieOrigin?.tieDestination === note) tieOrigin.tieDestination = null;
  if (tieDestination?.tieOrigin === note) {
    // The note it held on sounds as it is written, as it did.
    tieDestination.tieOrigin = null;
    tieDestination.isTieDestination = false;
  }
  if (slurOrigin?.slurDestination === note) slurOrigin.slurDestination = null;
  if (slurDestination?.slurOrigin === note) {
    slurDestination.slurOrigin = null;
    slurDestination.isSlurDestination = false;
  }
  const { hammerPullOrigin, hammerPullDestination, slideOrigin, slideTarget } = note;
  if (hammerPullOrigin?.hammerPullDestination === note) hammerPullOrigin.hammerPullDestination = null;
  if (hammerPullDestination?.hammerPullOrigin === note) hammerPullDestination.hammerPullOrigin = null;
  if (slideOrigin?.slideTarget === note) slideOrigin.slideTarget = null;
  if (slideTarget?.slideOrigin === note) slideTarget.slideOrigin = null;
}

/** Parts every note of a bar from the notes joined to them. */
export function detachBar(bar: alphaTab.model.Bar): void {
  for (const voice of bar.voices) for (const beat of voice.beats) for (const note of beat.notes) detach(note);
}

/** The score's bars numbered and linked again, master bars and every staff's, after bars moved. */
export function relinkBars(score: alphaTab.model.Score): void {
  score.masterBars.forEach((masterBar, index) => {
    masterBar.index = index;
    masterBar.score = score;
    masterBar.previousMasterBar = score.masterBars[index - 1] ?? null;
    masterBar.nextMasterBar = score.masterBars[index + 1] ?? null;
  });
  score.rebuildRepeatGroups();
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      staff.bars.forEach((bar, index) => {
        bar.index = index;
        bar.staff = staff;
        bar.previousBar = staff.bars[index - 1] ?? null;
        bar.nextBar = staff.bars[index + 1] ?? null;
      });
    }
  }
}

/** A voice with nothing written: one empty beat, as a new bar's. */
export function emptyBeats(voice: alphaTab.model.Voice): alphaTab.model.Beat[] {
  const beat = new alphaTab.model.Beat();
  beat.isEmpty = true;
  beat.voice = voice;
  return [beat];
}

/** An empty bar for a staff, with the clef, key and voices of a bar next to it. */
export function emptyBar(like: alphaTab.model.Bar | undefined): alphaTab.model.Bar {
  const bar = new alphaTab.model.Bar();
  if (like !== undefined) {
    bar.clef = like.clef;
    bar.clefOttava = like.clefOttava;
    bar.keySignature = like.keySignature;
    bar.keySignatureType = like.keySignatureType;
  }
  for (let index = 0; index < Math.max(1, like?.voices.length ?? 1); index++) {
    const voice = new alphaTab.model.Voice();
    bar.addVoice(voice);
    const beat = new alphaTab.model.Beat();
    beat.isEmpty = true;
    voice.addBeat(beat);
  }
  return bar;
}

/**
 * Empty bars put in before a master bar (or after the last, at the score's length), in every
 * track, in the meter of the bar they are put in before (or of the last) and each staff's clef and
 * key.
 */
export function insertBar(transaction: Transaction, index: number, count = 1): void {
  const { score } = transaction;
  const bars = score.masterBars.length;
  if (!Number.isInteger(index) || index < 0 || index > bars)
    throw new EditError(`No place for a bar at ${String(index)}.`);
  transaction.touchBars(index);
  const like = score.masterBars[Math.min(index, bars - 1)];
  for (let added = 0; added < count; added++) {
    const masterBar = new alphaTab.model.MasterBar();
    if (like !== undefined) {
      masterBar.timeSignatureNumerator = like.timeSignatureNumerator;
      masterBar.timeSignatureDenominator = like.timeSignatureDenominator;
      masterBar.timeSignatureCommon = like.timeSignatureCommon;
      masterBar.tripletFeel = like.tripletFeel;
    }
    score.masterBars.splice(index, 0, masterBar);
    for (const track of score.tracks) {
      for (const staff of track.staves) {
        staff.bars.splice(index, 0, emptyBar(staff.bars[Math.min(index, staff.bars.length - 1)]));
      }
    }
  }
  relinkBars(score);
}

/** Bars taken away from every track; a score keeps at least one. */
export function removeBar(transaction: Transaction, index: number, count = 1): void {
  const { score } = transaction;
  const bars = score.masterBars.length;
  if (!Number.isInteger(index) || index < 0 || index >= bars) throw new EditError(`No bar ${String(index)}.`);
  if (!Number.isInteger(count) || count < 1 || index + count > bars)
    throw new EditError(`No bars ${String(index)} to ${String(index + count - 1)}.`);
  if (count === bars) throw new EditError('A score keeps at least one bar.');
  transaction.touchBars(index);
  for (const track of score.tracks) {
    for (const staff of track.staves) {
      // Their notes are parted from those they join, in the bars taken away and the bars around.
      for (let bar = index + 1; bar < index + count; bar++) transaction.touch(staff, bar);
      for (const bar of staff.bars.slice(index, index + count)) detachBar(bar);
      staff.bars.splice(index, count);
    }
  }
  score.masterBars.splice(index, count);
  relinkBars(score);
}
