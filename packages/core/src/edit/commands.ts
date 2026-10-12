/**
 * The editor's commands (EDIT-001) made on a score, in the engine worker. Each keeps the bars it
 * changes in the edit's journal before changing them, so that the edit can be undone (EDIT-060).
 */
import * as alphaTab from '@coderline/alphatab';
import { MAX_FRET, type BeatAddress, type DurationValue, type EditCommand } from '../shared/edit.ts';
import { EditError } from './error.ts';
import type { Journal } from './journal.ts';
import { firstEngraved, REACH, type Region } from './refinish.ts';
import { setBeatTechniques, setNoteTechniques } from './techniques.ts';

export { EditError };

/** An edit being made: what it changes is kept before it changes, bar by bar. */
export class Transaction {
  private readonly changed = new Map<alphaTab.model.Staff, { from: number; to: number }>();
  private engraved = Number.POSITIVE_INFINITY;

  public constructor(
    public readonly score: alphaTab.model.Score,
    public readonly journal: Journal,
  ) {}

  /** The bars changed, staff by staff. */
  public get regions(): Region[] {
    return [...this.changed].map(([staff, { from, to }]) => ({ staff, from, to }));
  }

  /** The first master bar whose engraving changed, before the edit and after it. */
  public firstChangedMasterBar(): number {
    return Math.min(this.engraved, ...this.regions.map(firstEngraved));
  }

  /**
   * Keeps the score's bars as they are, about to be put in or taken away (their places, the links
   * from each to the next, the repeat groups), and every staff's bars around `bar` as `touch` does.
   */
  public touchBars(bar: number): void {
    const { journal, score } = this;
    journal.keep(score);
    for (const masterBar of score.masterBars) journal.keep(masterBar);
    for (const track of score.tracks) {
      for (const staff of track.staves) {
        journal.keep(staff);
        for (const staffBar of staff.bars) journal.keep(staffBar);
        this.touch(staff, Math.min(bar, staff.bars.length - 1));
      }
    }
  }

  /**
   * Keeps a staff's bars around a bar about to change: the bar, the bars as far as its notes reach
   * others (alphaTab may join them anew, or part them), and the notes joined to theirs.
   */
  public touch(staff: alphaTab.model.Staff, bar: number): void {
    const region = this.changed.get(staff);
    if (region === undefined) this.changed.set(staff, { from: bar, to: bar });
    else {
      region.from = Math.min(region.from, bar);
      region.to = Math.max(region.to, bar);
    }
    this.engraved = Math.min(this.engraved, firstEngraved({ staff, from: bar, to: bar }));
    const { journal } = this;
    for (const staffBar of staff.bars.slice(Math.max(0, bar - REACH), bar + REACH + 1)) {
      journal.keep(staffBar);
      for (const voice of staffBar.voices) {
        journal.keep(voice);
        for (const beat of voice.beats) {
          journal.keep(beat);
          for (const automation of beat.automations) journal.keep(automation);
          for (const note of beat.notes) {
            journal.keep(note);
            for (const partner of partners(note)) journal.keep(partner);
          }
        }
      }
    }
  }
}

/** The notes a note is joined to. */
function partners(note: alphaTab.model.Note): alphaTab.model.Note[] {
  return [
    note.tieOrigin,
    note.tieDestination,
    note.slurOrigin,
    note.slurDestination,
    note.hammerPullOrigin,
    note.hammerPullDestination,
    note.slideOrigin,
    note.slideTarget,
  ].filter(partner => partner !== null);
}

/** Parts a note about to be taken away from the notes joined to it. */
function detach(note: alphaTab.model.Note): void {
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

function voiceAt(score: alphaTab.model.Score, at: BeatAddress): alphaTab.model.Voice {
  const voice = score.tracks[at.track]?.staves[at.staff]?.bars[at.bar]?.voices[at.voice];
  if (voice === undefined) throw new EditError(`No voice at ${JSON.stringify(at)}.`);
  return voice;
}

function beatAt(score: alphaTab.model.Score, at: BeatAddress): alphaTab.model.Beat {
  const beat = voiceAt(score, at).beats[at.beat];
  if (beat === undefined) throw new EditError(`No beat at ${JSON.stringify(at)}.`);
  return beat;
}

function checkString(staff: alphaTab.model.Staff, string: number): void {
  const strings = staff.tuning.length;
  if (staff.isPercussion || strings === 0) throw new EditError('The staff has no strings.');
  if (!Number.isInteger(string) || string < 1 || string > strings)
    throw new EditError(`No string ${String(string)} on a staff of ${String(strings)}.`);
}

/** The score's bars numbered and linked again, master bars and every staff's, after bars moved. */
function relinkBars(score: alphaTab.model.Score): void {
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

/** An empty bar for a staff, with the clef, key and voices of a bar next to it. */
function emptyBar(like: alphaTab.model.Bar | undefined): alphaTab.model.Bar {
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

const DURATIONS: Readonly<Record<DurationValue, alphaTab.model.Duration>> = {
  1: alphaTab.model.Duration.Whole,
  2: alphaTab.model.Duration.Half,
  4: alphaTab.model.Duration.Quarter,
  8: alphaTab.model.Duration.Eighth,
  16: alphaTab.model.Duration.Sixteenth,
  32: alphaTab.model.Duration.ThirtySecond,
  64: alphaTab.model.Duration.SixtyFourth,
};

/** Makes a command's change, keeping what it changes first. */
export function runCommand(transaction: Transaction, command: EditCommand): void {
  const { score } = transaction;
  switch (command.kind) {
    case 'set-fret': {
      const beat = beatAt(score, command.at);
      const staff = beat.voice.bar.staff;
      checkString(staff, command.at.string);
      if (!Number.isInteger(command.fret) || command.fret < 0 || command.fret > MAX_FRET)
        throw new EditError(`No fret ${String(command.fret)}.`);
      transaction.touch(staff, command.at.bar);
      const existing = beat.getNoteOnString(command.at.string);
      if (existing !== null) {
        // A note held on by a tie follows the note before it; written on a fret, it is played.
        if (existing.isTieDestination) {
          if (existing.tieOrigin?.tieDestination === existing) existing.tieOrigin.tieDestination = null;
          existing.tieOrigin = null;
          existing.isTieDestination = false;
        }
        existing.fret = command.fret;
        return;
      }
      const note = new alphaTab.model.Note();
      note.string = command.at.string;
      note.fret = command.fret;
      // An empty bar's beat is written from its first note.
      beat.isEmpty = false;
      beat.addNote(note);
      return;
    }
    case 'remove-note': {
      const beat = beatAt(score, command.at);
      const staff = beat.voice.bar.staff;
      checkString(staff, command.at.string);
      const note = beat.getNoteOnString(command.at.string);
      if (note === null) throw new EditError(`No note on string ${String(command.at.string)}.`);
      transaction.touch(staff, command.at.bar);
      detach(note);
      beat.removeNote(note);
      beat.notes.forEach((other, index) => {
        other.index = index;
      });
      return;
    }
    case 'set-duration': {
      if (!Number.isInteger(command.dots) || command.dots < 0 || command.dots > 2)
        throw new EditError(`No duration with ${String(command.dots)} dots.`);
      const beat = beatAt(score, command.at);
      transaction.touch(beat.voice.bar.staff, command.at.bar);
      beat.duration = DURATIONS[command.duration];
      beat.dots = command.dots;
      return;
    }
    case 'insert-beat': {
      const voice = voiceAt(score, command.at);
      const index = command.at.beat;
      if (!Number.isInteger(index) || index < 0 || index > voice.beats.length)
        throw new EditError(`No place for a beat at ${String(index)}.`);
      transaction.touch(voice.bar.staff, command.at.bar);
      const [only] = voice.beats;
      if (voice.beats.length === 1 && only?.isEmpty === true) {
        only.isEmpty = false;
        return;
      }
      const like = voice.beats[Math.min(index, voice.beats.length - 1)];
      const beat = new alphaTab.model.Beat();
      if (like !== undefined) {
        beat.duration = like.duration;
        beat.dots = like.dots;
      }
      beat.voice = voice;
      voice.beats.splice(index, 0, beat);
      return;
    }
    case 'remove-beat': {
      const voice = voiceAt(score, command.at);
      const beat = beatAt(score, command.at);
      transaction.touch(voice.bar.staff, command.at.bar);
      for (const note of beat.notes) detach(note);
      if (voice.beats.length > 1) {
        voice.beats.splice(command.at.beat, 1);
        return;
      }
      // The voice's only beat: the bar is left empty, as a new one is.
      const empty = new alphaTab.model.Beat();
      empty.isEmpty = true;
      empty.voice = voice;
      voice.beats.splice(0, 1, empty);
      return;
    }
    case 'insert-bar': {
      const index = command.bar;
      const count = score.masterBars.length;
      if (!Number.isInteger(index) || index < 0 || index > count)
        throw new EditError(`No place for a bar at ${String(index)}.`);
      transaction.touchBars(index);
      const like = score.masterBars[Math.min(index, count - 1)];
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
      relinkBars(score);
      return;
    }
    case 'set-note': {
      const beat = beatAt(score, command.at);
      const staff = beat.voice.bar.staff;
      checkString(staff, command.at.string);
      transaction.touch(staff, command.at.bar);
      let note = beat.getNoteOnString(command.at.string);
      if (note === null) {
        // A tie on a string with nothing written holds the note before it on (Guitar Pro's L).
        if (command.techniques.tie !== true)
          throw new EditError(`No note on string ${String(command.at.string)}.`);
        note = new alphaTab.model.Note();
        note.string = command.at.string;
        beat.isEmpty = false;
        beat.addNote(note);
      }
      setNoteTechniques(note, command.techniques);
      return;
    }
    case 'set-beat': {
      const beat = beatAt(score, command.at);
      transaction.touch(beat.voice.bar.staff, command.at.bar);
      setBeatTechniques(beat, command.techniques);
      return;
    }
    case 'remove-bar': {
      const index = command.bar;
      const count = score.masterBars.length;
      if (!Number.isInteger(index) || index < 0 || index >= count)
        throw new EditError(`No bar ${String(index)}.`);
      if (count === 1) throw new EditError('A score keeps at least one bar.');
      transaction.touchBars(index);
      for (const track of score.tracks) {
        for (const staff of track.staves) {
          for (const voice of staff.bars[index]?.voices ?? []) {
            for (const beat of voice.beats) for (const note of beat.notes) detach(note);
          }
          staff.bars.splice(index, 1);
        }
      }
      score.masterBars.splice(index, 1);
      relinkBars(score);
      return;
    }
  }
}
