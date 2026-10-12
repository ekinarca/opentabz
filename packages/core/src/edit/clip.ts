/**
 * Selections copied, cleared, taken away and pasted (EDIT-020). What is copied is a small score of
 * its own — the selected beats in their bars, or the selected bars of the selected tracks, with the
 * staves' strings, chord diagrams and drum articulations — handed to the page in alphaTab's JSON
 * form: plain data, which a paste brings back, in the score it came from or another, and after a
 * reload or a restart of the engine as well. Its beats and notes are copies (alphaTab's cloners,
 * patch 0061), joined to nothing; each paste copies them again.
 */
import * as alphaTab from '@coderline/alphatab';
import type { BeatAddress, Clip, Selection } from '../shared/edit.ts';
import { detach, detachBar, emptyBeats, ensureVoices, insertBar, removeBar } from './bars.ts';
import type { Transaction } from './commands.ts';
import { EditError } from './error.ts';

const { BeatCloner, Duration, JsonConverter, PercussionMapper } = alphaTab.model;

/** Ticks in a quarter note, as alphaTab counts them. */
const QUARTER = 960;

/** Rests' durations, longest first, to fill a gap with. */
const RESTS: readonly [alphaTab.model.Duration, number][] = [
  [Duration.Whole, QUARTER * 4],
  [Duration.Half, QUARTER * 2],
  [Duration.Quarter, QUARTER],
  [Duration.Eighth, QUARTER / 2],
  [Duration.Sixteenth, QUARTER / 4],
  [Duration.ThirtySecond, QUARTER / 8],
  [Duration.SixtyFourth, QUARTER / 16],
];

export function copyChord(chord: alphaTab.model.Chord): alphaTab.model.Chord {
  const copy = new alphaTab.model.Chord();
  copy.name = chord.name;
  copy.firstFret = chord.firstFret;
  copy.strings = [...chord.strings];
  copy.barreFrets = [...chord.barreFrets];
  copy.fingers = [...chord.fingers];
  copy.showName = chord.showName;
  copy.showDiagram = chord.showDiagram;
  copy.showFingering = chord.showFingering;
  return copy;
}

/** A copy of a beat, its notes and all, in no voice. */
export function copyBeat(beat: alphaTab.model.Beat): alphaTab.model.Beat {
  return BeatCloner.clone(beat);
}

function staffAt(score: alphaTab.model.Score, track: number, staff: number): alphaTab.model.Staff {
  const found = score.tracks[track]?.staves[staff];
  if (found === undefined) throw new EditError(`No staff ${String(staff)} in track ${String(track)}.`);
  return found;
}

/** A bar's length in ticks, as its time signature counts it. */
function barTicks(bar: alphaTab.model.Bar): number {
  return bar.masterBar.calculateDuration();
}

/** How long a beat of the score lasts (ticks): an empty bar's beat, the whole bar. */
function ticksOf(beat: alphaTab.model.Beat): number {
  return beat.isEmpty ? barTicks(beat.voice.bar) : beat.displayDuration;
}

/** Rests as long as a gap (ticks), longest first; what is shorter than a sixty-fourth is left. */
function restsFor(ticks: number): alphaTab.model.Beat[] {
  const rests: alphaTab.model.Beat[] = [];
  let left = ticks;
  for (const [duration, length] of RESTS) {
    while (left >= length) {
      const rest = new alphaTab.model.Beat();
      rest.duration = duration;
      rests.push(rest);
      left -= length;
    }
  }
  return rests;
}

/** The selected beats, bar by bar, in order. */
function selectedRuns(
  score: alphaTab.model.Score,
  selection: Extract<Selection, { kind: 'beats' }>,
): { bar: alphaTab.model.Bar; beats: alphaTab.model.Beat[] }[] {
  const staff = staffAt(score, selection.track, selection.staff);
  const [from, to] =
    selection.from.bar < selection.to.bar ||
    (selection.from.bar === selection.to.bar && selection.from.beat <= selection.to.beat)
      ? [selection.from, selection.to]
      : [selection.to, selection.from];
  const runs: { bar: alphaTab.model.Bar; beats: alphaTab.model.Beat[] }[] = [];
  for (let index = from.bar; index <= to.bar; index++) {
    const bar = staff.bars[index];
    const voice = bar?.voices[selection.voice];
    if (bar === undefined || voice === undefined)
      throw new EditError(`No voice ${String(selection.voice)} in bar ${String(index)}.`);
    const first = index === from.bar ? from.beat : 0;
    const last = index === to.bar ? to.beat : voice.beats.length - 1;
    if (first < 0 || last >= voice.beats.length || first > last)
      throw new EditError(`No beats ${String(first)} to ${String(last)} in bar ${String(index)}.`);
    runs.push({ bar, beats: voice.beats.slice(first, last + 1) });
  }
  return runs;
}

function selectedBeats(
  score: alphaTab.model.Score,
  selection: Extract<Selection, { kind: 'beats' }>,
): alphaTab.model.Beat[] {
  return selectedRuns(score, selection).flatMap(run => run.beats);
}

/** The selected bars and tracks, in order, checked. */
function selectedBars(
  score: alphaTab.model.Score,
  selection: Extract<Selection, { kind: 'bars' }>,
): { tracks: alphaTab.model.Track[]; from: number; to: number } {
  const fromTrack = Math.min(selection.fromTrack, selection.toTrack);
  const toTrack = Math.max(selection.fromTrack, selection.toTrack);
  const from = Math.min(selection.fromBar, selection.toBar);
  const to = Math.max(selection.fromBar, selection.toBar);
  const tracks = score.tracks.slice(fromTrack, toTrack + 1);
  if (fromTrack < 0 || tracks.length !== toTrack - fromTrack + 1)
    throw new EditError(`No tracks ${String(fromTrack)} to ${String(toTrack)}.`);
  if (from < 0 || to >= score.masterBars.length)
    throw new EditError(`No bars ${String(from)} to ${String(to)}.`);
  return { tracks, from, to };
}

/** The beats of a selection, in the score's order: staff by staff, bar by bar, voice by voice. */
export function beatsOf(score: alphaTab.model.Score, selection: Selection): alphaTab.model.Beat[] {
  if (selection.kind === 'beats') return selectedBeats(score, selection);
  const { tracks, from, to } = selectedBars(score, selection);
  return tracks.flatMap(track =>
    track.staves.flatMap(staff =>
      staff.bars.slice(from, to + 1).flatMap(bar => bar.voices.flatMap(voice => voice.beats)),
    ),
  );
}

/** The copy's master bar for one of the score's: its time signature, its triplet feel. */
function copyMasterBar(copy: alphaTab.model.Score, masterBar: alphaTab.model.MasterBar): void {
  const bar = new alphaTab.model.MasterBar();
  bar.timeSignatureNumerator = masterBar.timeSignatureNumerator;
  bar.timeSignatureDenominator = masterBar.timeSignatureDenominator;
  bar.timeSignatureCommon = masterBar.timeSignatureCommon;
  bar.tripletFeel = masterBar.tripletFeel;
  copy.addMasterBar(bar);
}

/** The copy's track for one of the score's: its drum articulations. */
function copyTrack(copy: alphaTab.model.Score, track: alphaTab.model.Track): alphaTab.model.Track {
  const copied = new alphaTab.model.Track();
  copied.name = track.name;
  copied.percussionArticulations = [...track.percussionArticulations];
  copy.addTrack(copied);
  return copied;
}

/** The copy's staff for one of the score's: its strings, drums or not, the chords `beats` name. */
function copyStaff(
  track: alphaTab.model.Track,
  staff: alphaTab.model.Staff,
  beats: readonly alphaTab.model.Beat[],
): alphaTab.model.Staff {
  const copied = new alphaTab.model.Staff();
  copied.isPercussion = staff.isPercussion;
  copied.stringTuning = new alphaTab.model.Tuning(
    staff.stringTuning.name,
    [...staff.stringTuning.tunings],
    staff.stringTuning.isStandard,
  );
  track.addStaff(copied);
  for (const beat of beats) {
    const chord = beat.chordId === null ? null : staff.getChord(beat.chordId);
    if (beat.chordId !== null && chord !== null && !copied.hasChord(beat.chordId))
      copied.addChord(beat.chordId, copyChord(chord));
  }
  return copied;
}

/**
 * A bar of the copy, its voices holding copies of `voices`' beats; an empty bar's beat, as rests
 * when beats are copied (they keep its time).
 */
function copyBar(
  staff: alphaTab.model.Staff,
  from: alphaTab.model.Bar,
  voices: readonly (readonly alphaTab.model.Beat[])[],
  emptyAsRests: boolean,
): void {
  const bar = new alphaTab.model.Bar();
  bar.clef = from.clef;
  bar.clefOttava = from.clefOttava;
  bar.keySignature = from.keySignature;
  bar.keySignatureType = from.keySignatureType;
  staff.addBar(bar);
  for (const beats of voices) {
    const voice = new alphaTab.model.Voice();
    bar.addVoice(voice);
    for (const beat of beats) {
      for (const copied of beat.isEmpty && emptyAsRests ? restsFor(barTicks(from)) : [copyBeat(beat)])
        voice.addBeat(copied);
    }
  }
}

/** Copies a selection out of a score (EDIT-020), as plain data. */
export function copySelection(score: alphaTab.model.Score, selection: Selection): Clip {
  const copy = new alphaTab.model.Score();
  if (selection.kind === 'beats') {
    const runs = selectedRuns(score, selection);
    const beats = runs.flatMap(run => run.beats);
    if (beats.every(beat => beat.isEmpty)) throw new EditError('Nothing is written there to copy.');
    const staff = staffAt(score, selection.track, selection.staff);
    for (const run of runs) copyMasterBar(copy, run.bar.masterBar);
    const copied = copyStaff(copyTrack(copy, staff.track), staff, beats);
    for (const run of runs) copyBar(copied, run.bar, [run.beats], true);
    return {
      kind: 'beats',
      beats: beats.length,
      bars: runs.length,
      tracks: 1,
      score: JsonConverter.scoreToJsObject(copy),
    };
  }
  const { tracks, from, to } = selectedBars(score, selection);
  for (const masterBar of score.masterBars.slice(from, to + 1)) copyMasterBar(copy, masterBar);
  for (const track of tracks) {
    const copied = copyTrack(copy, track);
    for (const staff of track.staves) {
      const bars = staff.bars.slice(from, to + 1);
      const staffCopy = copyStaff(
        copied,
        staff,
        bars.flatMap(bar => bar.voices.flatMap(voice => voice.beats)),
      );
      for (const bar of bars)
        copyBar(
          staffCopy,
          bar,
          bar.voices.map(voice => voice.beats),
          false,
        );
    }
  }
  return {
    kind: 'bars',
    beats: 0,
    bars: to - from + 1,
    tracks: tracks.length,
    score: JsonConverter.scoreToJsObject(copy),
  };
}

/** The copy, read back as a score. */
function readClip(clip: Clip): alphaTab.model.Score {
  let score: alphaTab.model.Score;
  try {
    score = JsonConverter.jsObjectToScore(clip.score, new alphaTab.Settings());
  } catch {
    throw new EditError('What was copied cannot be read.');
  }
  if (score.tracks.length === 0) throw new EditError('What was copied cannot be read.');
  return score;
}

/** Beats as the voice holds them: theirs, in it. */
export function place(voice: alphaTab.model.Voice, beats: alphaTab.model.Beat[]): alphaTab.model.Beat[] {
  for (const beat of beats) beat.voice = voice;
  return beats;
}

/** Takes a selection's notes away: its beats are rests, its bars empty. */
export function clearSelection(transaction: Transaction, selection: Selection): void {
  const { score } = transaction;
  if (selection.kind === 'beats') {
    const staff = staffAt(score, selection.track, selection.staff);
    for (const beat of selectedBeats(score, selection)) {
      if (beat.notes.length === 0) continue;
      transaction.touch(staff, beat.voice.bar.index);
      for (const note of beat.notes) detach(note);
      for (const note of [...beat.notes]) beat.removeNote(note);
    }
    return;
  }
  const { tracks, from, to } = selectedBars(score, selection);
  for (const track of tracks) {
    for (const staff of track.staves) {
      for (const bar of staff.bars.slice(from, to + 1)) {
        transaction.touch(staff, bar.index);
        detachBar(bar);
        for (const voice of bar.voices) voice.beats = emptyBeats(voice);
      }
    }
  }
}

/**
 * Takes a selection away: its beats (a bar left without any is empty); its bars, from the score
 * when every track is selected, else emptied (all of a score's bars are emptied: it keeps them).
 */
export function removeSelection(transaction: Transaction, selection: Selection): void {
  const { score } = transaction;
  if (selection.kind === 'beats') {
    const staff = staffAt(score, selection.track, selection.staff);
    const beats = selectedBeats(score, selection);
    for (const beat of beats) {
      transaction.touch(staff, beat.voice.bar.index);
      for (const note of beat.notes) detach(note);
    }
    const gone = new Set(beats);
    for (const voice of new Set(beats.map(beat => beat.voice))) {
      const left = voice.beats.filter(beat => !gone.has(beat));
      voice.beats = left.length > 0 ? left : emptyBeats(voice);
    }
    return;
  }
  const { tracks, from, to } = selectedBars(score, selection);
  const count = to - from + 1;
  if (tracks.length === score.tracks.length && count < score.masterBars.length) {
    removeBar(transaction, from, count);
    return;
  }
  clearSelection(transaction, selection);
}

/** The highest string a note of the beats is written on; 0 without strings. */
function highestString(beats: Iterable<alphaTab.model.Beat>): number {
  let highest = 0;
  for (const beat of beats)
    for (const note of beat.notes) if (note.isStringed) highest = Math.max(highest, note.string);
  return highest;
}

/** Checks that a staff can be written the copy's beats: drums on drums, notes on its strings. */
function checkWriting(
  staff: alphaTab.model.Staff,
  copied: alphaTab.model.Staff,
  beats: Iterable<alphaTab.model.Beat>,
): void {
  if (copied.isPercussion !== staff.isPercussion)
    throw new EditError(
      copied.isPercussion
        ? 'Drums are pasted on a drum track.'
        : 'Notes on strings are pasted on a track with strings.',
    );
  if (!copied.isPercussion && highestString(beats) > staff.tuning.length)
    throw new EditError('This track has fewer strings than the notes copied are written on.');
}

/** The copy's chord diagrams, added to a staff that has none by their ids. */
function addChords(
  transaction: Transaction,
  staff: alphaTab.model.Staff,
  copied: alphaTab.model.Staff,
): void {
  const missing = [...(copied.chords ?? [])].filter(([id]) => !staff.hasChord(id));
  if (missing.length === 0) return;
  transaction.journal.keep(staff);
  for (const [id, chord] of missing) staff.addChord(id, copyChord(chord));
}

/** Whether two drum articulations are the same sound, written the same way. */
function sameArticulation(
  a: alphaTab.model.InstrumentArticulation,
  b: alphaTab.model.InstrumentArticulation,
): boolean {
  return (
    a.elementType === b.elementType &&
    a.outputMidiNumber === b.outputMidiNumber &&
    a.staffLine === b.staffLine &&
    a.noteHeadDefault === b.noteHeadDefault &&
    a.techniqueSymbol === b.techniqueSymbol
  );
}

/**
 * Where a track finds a drum articulation: among its own, among alphaTab's (Guitar Pro's) that its
 * own leave in place, or added to its own.
 */
function articulationIn(
  transaction: Transaction,
  track: alphaTab.model.Track,
  articulation: alphaTab.model.InstrumentArticulation,
): number {
  const own = track.percussionArticulations.findIndex(candidate => sameArticulation(candidate, articulation));
  if (own >= 0) return own;
  for (const known of PercussionMapper.instrumentArticulations.values()) {
    if (known.id >= track.percussionArticulations.length && sameArticulation(known, articulation))
      return known.id;
  }
  transaction.journal.keep(track);
  track.percussionArticulations = [...track.percussionArticulations, articulation];
  return track.percussionArticulations.length - 1;
}

/** A copy of one of the copy's beats, for a staff: its drum notes on the staff's articulations. */
function beatFor(
  transaction: Transaction,
  staff: alphaTab.model.Staff,
  beat: alphaTab.model.Beat,
): alphaTab.model.Beat {
  const copied = copyBeat(beat);
  if (!staff.isPercussion) return copied;
  beat.notes.forEach((note, index) => {
    const articulation = PercussionMapper.getArticulation(note);
    const target = copied.notes[index];
    if (articulation !== null && target !== undefined)
      target.percussionArticulation = articulationIn(transaction, staff.track, articulation);
  });
  return copied;
}

/** A voice of a bar; one the staff has not, put in every bar of it, empty. */
export function voiceOf(
  transaction: Transaction,
  bar: alphaTab.model.Bar,
  index: number,
): alphaTab.model.Voice {
  if (bar.voices.length <= index || bar.voices[index]?.beats.length === 0)
    ensureVoices(transaction, bar.staff, index + 1);
  const voice = bar.voices[index];
  if (voice === undefined) throw new Error('alphaTab put in no voice.');
  return voice;
}

/** Bars put in at the end so that the score reaches a master bar. */
function reach(transaction: Transaction, bar: number): void {
  const count = transaction.score.masterBars.length;
  if (bar >= count) insertBar(transaction, count, bar - count + 1);
}

/**
 * Writes the copy's beats from a beat on, over the beats there as long as they are, across bar
 * lines: each bar keeps its length where the beats meet its bar line, and is filled with rests where
 * they end before. Bars are put in at the end when the score is too short.
 */
function pasteBeats(transaction: Transaction, at: BeatAddress, copy: alphaTab.model.Score): void {
  const { score } = transaction;
  const staff = staffAt(score, at.track, at.staff);
  const copied = copy.tracks[0]?.staves[0];
  if (copied === undefined) throw new EditError('What was copied cannot be read.');
  const beats = copied.bars.flatMap(bar => bar.voices[0]?.beats ?? []).filter(beat => !beat.isEmpty);
  checkWriting(staff, copied, beats);
  const total = beats.reduce((sum, beat) => sum + beat.displayDuration, 0);
  const start = staff.bars[at.bar]?.voices[at.voice];
  if (start === undefined) throw new EditError(`No voice at ${JSON.stringify(at)}.`);
  if (at.beat < 0 || at.beat >= start.beats.length) throw new EditError(`No beat at ${JSON.stringify(at)}.`);

  // How far the beats there reach; bars put in when they do not reach far enough.
  let reached = 0;
  for (let index = at.bar; index < staff.bars.length && reached < total; index++) {
    const staffBar = staff.bars[index];
    if (staffBar === undefined) break;
    const voice = staffBar.voices[at.voice];
    // A bar without the voice has it put in, empty: the whole bar's room.
    if (voice === undefined) {
      reached += barTicks(staffBar);
      continue;
    }
    for (const beat of voice.beats.slice(index === at.bar ? at.beat : 0)) {
      if (reached >= total) break;
      reached += ticksOf(beat);
    }
  }
  if (reached < total) {
    const count = score.masterBars.length;
    const length = score.masterBars[count - 1]?.calculateDuration() ?? 0;
    reach(transaction, count - 1 + Math.ceil((total - reached) / (length > 0 ? length : QUARTER * 4)));
  }
  addChords(transaction, staff, copied);

  // The beats there taken away, bar by bar: each bar's room for the beats copied.
  const slots: { voice: alphaTab.model.Voice; index: number; room: number; beats: alphaTab.model.Beat[] }[] =
    [];
  let taken = 0;
  for (let index = at.bar; taken < total; index++) {
    const staffBar = staff.bars[index];
    if (staffBar === undefined) throw new Error('The score was not made long enough to paste in.');
    transaction.touch(staff, index);
    const voice = voiceOf(transaction, staffBar, at.voice);
    const first = index === at.bar ? at.beat : 0;
    let end = first;
    let room = 0;
    for (; end < voice.beats.length && taken < total; end++) {
      const beat = voice.beats[end];
      if (beat === undefined) break;
      const ticks = ticksOf(beat);
      room += ticks;
      taken += ticks;
      for (const note of beat.notes) detach(note);
    }
    voice.beats = [...voice.beats.slice(0, first), ...voice.beats.slice(end)];
    slots.push({ voice, index: first, room, beats: [] });
  }

  // The beats copied, each in the bar where it starts; the room they leave, rests.
  const filled = slots.map(() => 0);
  let slot = 0;
  for (const beat of beats) {
    while (slot < slots.length - 1 && (filled[slot] ?? 0) >= (slots[slot]?.room ?? 0)) slot++;
    slots[slot]?.beats.push(beatFor(transaction, staff, beat));
    filled[slot] = (filled[slot] ?? 0) + beat.displayDuration;
  }
  slots.forEach((each, index) => {
    const written = [
      ...each.voice.beats.slice(0, each.index),
      ...each.beats,
      ...restsFor(each.room - (filled[index] ?? 0)),
      ...each.voice.beats.slice(each.index),
    ];
    each.voice.beats = written.length > 0 ? place(each.voice, written) : emptyBeats(each.voice);
  });
}

/** Writes the copy's bars over the bars from a bar on, in a track and the next ones. */
function pasteBars(transaction: Transaction, at: BeatAddress, copy: alphaTab.model.Score): void {
  const { score } = transaction;
  const tracks = score.tracks.slice(at.track, at.track + copy.tracks.length);
  if (tracks.length === 0) throw new EditError(`No track ${String(at.track)}.`);
  const pairs = tracks.flatMap((track, index) =>
    (copy.tracks[index]?.staves ?? []).flatMap(copied => {
      const staff = track.staves[copied.index];
      return staff === undefined ? [] : [{ staff, copied }];
    }),
  );
  for (const { staff, copied } of pairs)
    checkWriting(
      staff,
      copied,
      copied.bars.flatMap(bar => bar.voices.flatMap(voice => voice.beats)),
    );
  reach(transaction, at.bar + copy.masterBars.length - 1);
  for (const { staff, copied } of pairs) {
    addChords(transaction, staff, copied);
    copied.bars.forEach((from, offset) => {
      const bar = staff.bars[at.bar + offset];
      if (bar === undefined) throw new Error('The score was not made long enough to paste in.');
      transaction.touch(staff, bar.index);
      detachBar(bar);
      from.voices.forEach((source, index) => {
        const voice = voiceOf(transaction, bar, index);
        const beats = source.beats
          .filter(beat => !beat.isEmpty)
          .map(beat => beatFor(transaction, staff, beat));
        voice.beats = beats.length > 0 ? place(voice, beats) : emptyBeats(voice);
      });
      // Voices the bars copied did not have are left empty.
      for (const voice of bar.voices.slice(from.voices.length)) voice.beats = emptyBeats(voice);
    });
  }
}

/** Writes what was copied from a beat on (EDIT-020). */
export function paste(transaction: Transaction, at: BeatAddress, clip: Clip): void {
  const copy = readClip(clip);
  if (clip.kind === 'beats') pasteBeats(transaction, at, copy);
  else pasteBars(transaction, at, copy);
}
