/**
 * Editing a score (EDIT-004, EDIT-060, EDIT-123): per open document, whether it is being edited,
 * the caret, the edits made — undone and redone in turn — and whether there are changes not yet
 * saved. Edits go to the engine one at a time; the score, the song and the instrument views follow
 * each one. Should the engine restart, the edits are made again on the score opened afresh.
 */
import {
  BEAT_BAR_VIBRATO,
  BEAT_FADE_IN,
  BEAT_FADE_OUT,
  BEAT_SLAP,
  BEAT_STROKE_DOWN,
  BEAT_STROKE_UP,
  BEAT_TAP,
  BEAT_TREMOLO,
  BEAT_TRIPLET,
  DURATION_VALUES,
  MAX_FRET,
  TECHNIQUE_ACCENT,
  TECHNIQUE_BEND,
  TECHNIQUE_DEAD,
  TECHNIQUE_GHOST,
  TECHNIQUE_HAMMER,
  TECHNIQUE_HEAVY_ACCENT,
  TECHNIQUE_LET_RING,
  TECHNIQUE_NATURAL_HARMONIC,
  TECHNIQUE_PALM_MUTE,
  TECHNIQUE_SLIDE,
  TECHNIQUE_STACCATO,
  TECHNIQUE_TIE,
  TECHNIQUE_VIBRATO,
  type BarProperties,
  type BarState,
  type NewTrack,
  type TrackProperties,
  type TrackState,
  type BeatAddress,
  type BeatTechniques,
  type DurationValue,
  type EditCommand,
  type EditOutcome,
  type NoteTechniques,
  type TrackBeats,
} from '@opentabz/core/shared';
import { create } from 'zustand';
import { getEngine } from '../engine/instance.ts';
import { beatsSoundingAt, beatTicks } from '../score-view/timeline-lookup.ts';
import { strings } from '../strings.ts';
import { useDocuments, type OpenDocument } from './documents.ts';
import {
  caretAddress,
  fretAtCaret,
  rowOf,
  stepCaret,
  stepCaretBar,
  restAfter,
  stepCaretString,
  steppedDuration,
  stepRight,
  typedFret,
  voiceRows,
  type Caret,
  type TypedFret,
} from './edit-caret.ts';
import { deleteDraft, holdDraft, releaseDraft, writeDraft } from './drafts.ts';
import { regenerateSong, usePlayer } from './player.ts';

export interface DocEditing {
  /** The score is being edited: the caret shows, and keys write. */
  readonly on: boolean;
  /** Where the next fret is written; null on a track without strings. */
  readonly caret: Caret | null;
  /** The caret track's beats, as the score is now. */
  readonly beats: TrackBeats | null;
  /** The score's version: a new one for each edit, the one before when it is undone (0 as opened). */
  readonly revision: number;
  /** The version last saved. */
  readonly saved: number;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** The fret typed last, which a second digit may extend. */
  readonly typed: TypedFret | null;
  /** How many times the score changed (edits, undos, redos): the view lays it out again each time. */
  readonly changes: number;
  /** The active track has no strings to write frets on (drums, a piano). */
  readonly noStrings: boolean;
}

export const NOT_EDITING: DocEditing = {
  on: false,
  caret: null,
  beats: null,
  revision: 0,
  saved: 0,
  canUndo: false,
  canRedo: false,
  typed: null,
  changes: 0,
  noStrings: false,
};

interface EditingState {
  readonly docs: Readonly<Record<string, DocEditing>>;
}

export const useEditing = create<EditingState>(() => ({ docs: {} }));

/** A document's editing, or none. */
export function editingOf(key: string | null): DocEditing {
  return key === null ? NOT_EDITING : (useEditing.getState().docs[key] ?? NOT_EDITING);
}

/** Whether a document has changes not saved. */
export function isDirty(editing: DocEditing): boolean {
  return editing.revision !== editing.saved;
}

/** Whether any open document has changes not saved. */
export function anyDirty(): boolean {
  return Object.values(useEditing.getState().docs).some(isDirty);
}

function patch(key: string, change: Partial<DocEditing>): void {
  useEditing.setState(state => ({
    docs: { ...state.docs, [key]: { ...(state.docs[key] ?? NOT_EDITING), ...change } },
  }));
}

/** Where a caret is, by its beat's place: the beat may be another one once an edit is undone. */
interface CaretPlace {
  readonly at: BeatAddress;
  readonly string: number;
}

/** An edit made: its commands, the version it made, where the caret was before it and after it. */
interface Step {
  readonly commands: readonly EditCommand[];
  readonly revision: number;
  readonly before: CaretPlace | null;
  readonly after: CaretPlace | null;
}

interface History {
  readonly done: Step[];
  readonly undone: Step[];
  /** The last version given. */
  serial: number;
  /** The engine work under way: edits, undos and redos go one after another. */
  queue: Promise<void>;
}

const histories = new Map<string, History>();

function historyOf(key: string): History {
  let history = histories.get(key);
  if (history === undefined) {
    history = { done: [], undone: [], serial: 0, queue: Promise.resolve() };
    histories.set(key, history);
  }
  return history;
}

/**
 * The editing action being run, if any: the edits it makes are made at once, before the actions
 * that come after it (the keys pressed next).
 */
const acting = new Map<string, Promise<void>[]>();

/**
 * Runs an editing action once the actions before it are done, as Guitar Pro takes keys one after
 * another: a key pressed while an edit is being made acts on the score as the edit leaves it.
 * Returns whether the document is being edited (whether the key was taken).
 */
function act(key: string, action: () => unknown): boolean {
  if (!editingOf(key).on) return false;
  void enqueue(key, async () => {
    const edits: Promise<void>[] = [];
    acting.set(key, edits);
    try {
      await action();
    } finally {
      acting.delete(key);
    }
    await Promise.all(edits);
  }).catch(fail);
  return true;
}

/** Runs one piece of engine work after the ones before it. */
function enqueue(key: string, task: () => Promise<void>): Promise<void> {
  const history = historyOf(key);
  const next = history.queue.then(task, task);
  history.queue = next.catch(() => undefined);
  return next;
}

function docOf(key: string): OpenDocument | null {
  return useDocuments.getState().docs.find(doc => doc.key === key) ?? null;
}

function fail(error: unknown): void {
  useDocuments.getState().notify({
    title: strings.editing.failed,
    description: error instanceof Error ? error.message : String(error),
    tone: 'error',
  });
}

/** The staff of a track frets are written on: its first staff with strings, if any. */
function stringedStaff(doc: OpenDocument, track: number): { staff: number; strings: number } | null {
  const staff = doc.summary.tracks[track]?.staves.find(
    candidate => candidate.stringCount > 0 && !candidate.isPercussion,
  );
  return staff === undefined ? null : { staff: staff.index, strings: staff.stringCount };
}

function placeOf(editing: DocEditing): CaretPlace | null {
  const { caret, beats } = editing;
  if (caret === null || beats === null) return null;
  const at = caretAddress(beats, caret);
  return at === null ? null : { at, string: caret.string };
}

/** The beat at a place, or the one before it in its bar, or the bar's first. */
function beatAtPlace(beats: TrackBeats, place: CaretPlace): number | null {
  const rows = voiceRows(beats, place.at.staff, place.at.voice).filter(row => row.bar === place.at.bar);
  const row =
    rows.find(candidate => candidate.beat === place.at.beat) ??
    rows.findLast(candidate => candidate.beat < place.at.beat) ??
    rows[0];
  return row?.beatId ?? null;
}

/** The player moved to the caret's beat: where it is heard nearest to where the player is. */
function seekToCaret(key: string, caret: Caret): void {
  const { docKey, timeline, tick, seek } = usePlayer.getState();
  if (docKey !== key || timeline === null) return;
  const ticks = beatTicks(timeline, caret.beatId);
  let best: number | null = null;
  for (const candidate of ticks) {
    if (best === null || Math.abs(candidate - tick) < Math.abs(best - tick)) best = candidate;
  }
  if (best !== null) seek(best);
}

/** The caret on a track: on the beat the player is on, on the top string. */
async function placeCaret(key: string, track: number): Promise<void> {
  const doc = docOf(key);
  if (doc === null) return;
  const target = stringedStaff(doc, track);
  if (target === null) {
    patch(key, { caret: null, beats: null, typed: null, noStrings: true });
    return;
  }
  const beats = await getEngine().call('trackBeats', { docId: doc.engineId, trackIndex: track });
  const rows = voiceRows(beats, target.staff, 0);
  const { docKey, timeline, tick } = usePlayer.getState();
  const sounding =
    docKey === key && timeline !== null ? new Set(beatsSoundingAt(timeline, tick, track)) : new Set();
  const row = rows.find(candidate => sounding.has(candidate.beatId)) ?? rows[0];
  patch(key, {
    beats,
    typed: null,
    noStrings: false,
    caret:
      row === undefined
        ? null
        : { track, staff: target.staff, voice: 0, beatId: row.beatId, string: target.strings },
  });
}

/** Starts or stops editing a document. */
export function toggleEditing(key: string): Promise<void> {
  if (editingOf(key).on) {
    patch(key, { on: false, typed: null });
    return Promise.resolve();
  }
  patch(key, { on: true });
  return enqueue(key, () => placeCaret(key, docOf(key)?.activeTrack ?? 0)).catch(fail);
}

/**
 * The caret put where the music was clicked (EDIT-002): on the beat, and on the string clicked on
 * the tablature (elsewhere, on the string it was on). The track clicked becomes the active one.
 */
export function setCaretAt(
  key: string,
  spot: {
    readonly track: number;
    readonly staff: number;
    readonly beatId: number;
    readonly string: number | null;
  },
): void {
  if (!editingOf(key).on) return;
  void enqueue(key, async () => {
    const editing = editingOf(key);
    const doc = docOf(key);
    if (doc === null) return;
    const strings = doc.summary.tracks[spot.track]?.staves[spot.staff];
    if (strings === undefined || strings.stringCount === 0 || strings.isPercussion) return;
    const beats =
      editing.caret?.track === spot.track && editing.beats !== null
        ? editing.beats
        : await getEngine().call('trackBeats', { docId: doc.engineId, trackIndex: spot.track });
    const row = rowOf(beats, spot.beatId);
    if (row === null) return;
    const string = Math.min(
      strings.stringCount,
      Math.max(1, spot.string ?? editing.caret?.string ?? strings.stringCount),
    );
    patch(key, {
      beats,
      typed: null,
      noStrings: false,
      caret: { track: spot.track, staff: row.staff, voice: row.voice, beatId: row.beatId, string },
    });
    if (doc.activeTrack !== spot.track) useDocuments.getState().setActiveTrack(key, spot.track);
  }).catch(fail);
}

export type CaretMove = 'left' | 'right' | 'up' | 'down' | 'bar-left' | 'bar-right';

/** Moves the caret; false when the document is not being edited (the key keeps its meaning). */
function moveCaretNow(key: string, move: CaretMove, invertedTab: boolean): boolean {
  const editing = editingOf(key);
  const { caret, beats } = editing;
  if (!editing.on) return false;
  if (caret === null || beats === null) return true;
  const doc = docOf(key);
  if (move === 'right') {
    const step = stepRight(beats, caret);
    const at = (bar: number, beat: number): CaretPlace => ({
      at: { track: caret.track, staff: caret.staff, bar, voice: caret.voice, beat },
      string: caret.string,
    });
    if (step.kind === 'beat') {
      const place = at(step.row.bar, step.row.beat + 1);
      const rest = restAfter(step.row);
      apply(
        key,
        rest === null
          ? [{ kind: 'insert-beat', at: place.at }]
          : [
              { kind: 'insert-beat', at: place.at },
              { kind: 'set-duration', at: place.at, ...rest },
            ],
        place,
      );
      return true;
    }
    if (step.kind === 'bar' && doc !== null) {
      apply(key, [{ kind: 'insert-bar', bar: doc.summary.masterBars.length }], at(step.row.bar + 1, 0));
      return true;
    }
  }
  const strings = doc?.summary.tracks[caret.track]?.staves[caret.staff]?.stringCount ?? 1;
  const next =
    move === 'left' || move === 'right'
      ? stepCaret(beats, caret, move === 'left' ? -1 : 1)
      : move === 'bar-left' || move === 'bar-right'
        ? stepCaretBar(beats, caret, move === 'bar-left' ? -1 : 1)
        : stepCaretString(caret, strings, move === 'up', invertedTab);
  patch(key, { caret: next, typed: null });
  if (next.beatId !== caret.beatId) seekToCaret(key, next);
  return true;
}

/** What happened after an edit, an undo or a redo: everything follows the score. */
async function changed(
  key: string,
  outcome: EditOutcome,
  revision: number,
  to: CaretPlace | null,
): Promise<void> {
  let place = to;
  if (outcome.trackOrigins === null) useDocuments.getState().setSummary(key, outcome.summary);
  else {
    useDocuments.getState().remapTracks(key, outcome.summary, outcome.trackOrigins);
    // The caret follows its track, or goes to the active one when its track is gone.
    const { caret } = editingOf(key);
    const track = caret === null ? -1 : outcome.trackOrigins.indexOf(caret.track);
    if (caret !== null && track >= 0) patch(key, { caret: { ...caret, track } });
    else patch(key, { caret: null, beats: null });
  }
  const doc = docOf(key);
  const start = editingOf(key).caret;
  let caret = start;
  let { beats } = editingOf(key);
  if (doc !== null && caret !== null) {
    beats = await getEngine().call('trackBeats', { docId: doc.engineId, trackIndex: caret.track });
    // Moved by a key meanwhile: the caret stays where it was moved to.
    const now = editingOf(key).caret;
    if (now !== null && !sameCaret(now, caret)) {
      caret = now;
      place = null;
    }
    const beatId = place === null ? null : beatAtPlace(beats, place);
    if (beatId !== null && place !== null) caret = { ...caret, beatId, string: place.string };
    else if (rowOf(beats, caret.beatId) === null) {
      const first = voiceRows(beats, caret.staff, caret.voice)[0];
      caret = first === undefined ? null : { ...caret, beatId: first.beatId };
    }
  }
  patch(key, {
    revision,
    canUndo: outcome.canUndo,
    canRedo: outcome.canRedo,
    caret,
    beats,
    changes: editingOf(key).changes + 1,
  });
  void regenerateSong(key).catch(fail);
  keepDraft(key);
}

const draftTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Keeps the document's edits on the device, a moment after the last one (EDIT-124): while it has
 * changes not saved, its file and its edits; once it has none, nothing.
 */
function keepDraft(key: string): void {
  const timer = draftTimers.get(key);
  if (timer !== undefined) clearTimeout(timer);
  draftTimers.set(
    key,
    setTimeout(() => {
      draftTimers.delete(key);
      const doc = docOf(key);
      const editing = editingOf(key);
      if (doc === null) return;
      if (!isDirty(editing)) {
        void deleteDraft(key);
        return;
      }
      const history = historyOf(key);
      holdDraft(key);
      void writeDraft({
        id: key,
        name: doc.source.name,
        title: doc.summary.title,
        bytes: doc.source.bytes,
        blank: doc.source.blank === true,
        done: history.done.map(step => step.commands),
        undone: history.undone.map(step => step.commands),
        writtenAt: Date.now(),
      });
    }, DRAFT_DELAY_MS),
  );
}

/** How long after an edit its draft is written. */
const DRAFT_DELAY_MS = 300;

/**
 * Edits kept from before (a draft) made again on a document just opened from the draft's file:
 * those made, and those undone (made, then undone), so that undo and redo go on as they were.
 */
export function restoreEdits(
  key: string,
  done: readonly (readonly EditCommand[])[],
  undone: readonly (readonly EditCommand[])[],
): Promise<void> {
  return enqueue(key, async () => {
    const doc = docOf(key);
    if (doc === null || (done.length === 0 && undone.length === 0)) return;
    const engine = getEngine();
    let outcome: EditOutcome | null = null;
    for (const commands of [...done, ...[...undone].reverse()])
      outcome = await engine.call('edit', { docId: doc.engineId, commands });
    for (let left = undone.length; left > 0; left -= 1)
      outcome = await engine.call('undo', { docId: doc.engineId });
    const history = historyOf(key);
    const step = (commands: readonly EditCommand[]): Step => {
      history.serial += 1;
      return { commands, revision: history.serial, before: null, after: null };
    };
    history.done.splice(0, history.done.length, ...done.map(step));
    history.undone.splice(0, history.undone.length, ...undone.map(step));
    if (outcome !== null) await changed(key, outcome, history.done.at(-1)?.revision ?? 0, null);
  });
}

/** Whether two carets are on the same beat and string. */
function sameCaret(a: Caret, b: Caret): boolean {
  return a.track === b.track && a.staff === b.staff && a.beatId === b.beatId && a.string === b.string;
}

/**
 * Makes an edit, where the caret is now; once it is made, the caret goes to `after` (a place), or
 * stays where it is — and wherever a key moved it to while the edit was being made.
 */
function apply(key: string, commands: readonly EditCommand[], after: CaretPlace | null = null): void {
  const issued = editingOf(key).caret;
  const before = placeOf(editingOf(key));
  const work = async (): Promise<void> => {
    const doc = docOf(key);
    if (doc === null) return;
    const outcome = await getEngine().call('edit', { docId: doc.engineId, commands });
    if (!outcome.changed) return;
    const history = historyOf(key);
    history.serial += 1;
    const step: Step = { commands, revision: history.serial, before, after: after ?? before };
    history.done.push(step);
    history.undone.length = 0;
    const current = editingOf(key).caret;
    const moved = issued !== null && current !== null && !sameCaret(issued, current);
    await changed(key, outcome, step.revision, moved ? null : step.after);
  };
  // Within an editing action, at once; otherwise after the work under way.
  const edits = acting.get(key);
  if (edits === undefined) void enqueue(key, work).catch(fail);
  else edits.push(work());
}

/** The caret's beat and string, when the document is being edited and the caret is on a beat. */
function atCaret(key: string): { editing: DocEditing; caret: Caret; at: BeatAddress } | null {
  const editing = editingOf(key);
  const { caret, beats } = editing;
  if (!editing.on || caret === null || beats === null) return null;
  const at = caretAddress(beats, caret);
  return at === null ? null : { editing, caret, at };
}

/** Writes a digit's fret on the caret's string (two digits typed quickly write 10 to 99). */
function typeFretNow(key: string, digit: number, now: number): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { editing, caret, at } = found;
  const fret = typedFret(editing.typed, caret, digit, now);
  patch(key, { typed: { beatId: caret.beatId, string: caret.string, fret, at: now } });
  apply(key, [{ kind: 'set-fret', at: { ...at, string: caret.string }, fret }]);
  return true;
}

/** Writes a fret on the caret's string (the edit bar's frets, for touch screens and the mouse). */
function writeFretAtCaretNow(key: string, fret: number): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { caret, at } = found;
  if (!Number.isInteger(fret) || fret < 0 || fret > MAX_FRET) return true;
  patch(key, { typed: null });
  apply(key, [{ kind: 'set-fret', at: { ...at, string: caret.string }, fret }]);
  return true;
}

/** Takes away the note on the caret's string. */
function deleteNoteAtCaretNow(key: string): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { editing, caret, at } = found;
  if (editing.beats === null || fretAtCaret(editing.beats, caret) === null) return true;
  apply(key, [{ kind: 'remove-note', at: { ...at, string: caret.string } }]);
  return true;
}

/** Puts a rest in before the caret's beat; the caret goes to it. */
function insertBeatAtCaretNow(key: string): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { caret, at } = found;
  apply(key, [{ kind: 'insert-beat', at }], { at, string: caret.string });
  return true;
}

/** Puts an empty bar in before the caret's bar, in every track; the caret goes to it. */
function insertBarAtCaretNow(key: string): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { caret, at } = found;
  apply(key, [{ kind: 'insert-bar', bar: at.bar }], { at: { ...at, beat: 0 }, string: caret.string });
  return true;
}

/** Takes the caret's bar away from every track; the caret goes to the bar that takes its place. */
function deleteBarAtCaretNow(key: string): boolean {
  const found = atCaret(key);
  const count = docOf(key)?.summary.masterBars.length ?? 0;
  if (found === null) return editingOf(key).on;
  const { caret, at } = found;
  if (count <= 1) return true;
  const bar = Math.min(at.bar, count - 2);
  apply(key, [{ kind: 'remove-bar', bar: at.bar }], { at: { ...at, bar, beat: 0 }, string: caret.string });
  return true;
}

/** Takes the caret's beat away; the caret goes to the beat that takes its place. */
function deleteBeatAtCaretNow(key: string): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { caret, at } = found;
  apply(key, [{ kind: 'remove-beat', at }], { at, string: caret.string });
  return true;
}

/** The caret's beat a step longer or shorter. */
function stepDurationAtCaretNow(key: string, longer: boolean): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { editing, caret, at } = found;
  const row = editing.beats === null ? null : rowOf(editing.beats, caret.beatId);
  const duration = row === null ? null : steppedDuration(row.duration, longer);
  if (row === null || duration === null) return true;
  apply(key, [{ kind: 'set-duration', at, duration, dots: row.dots }]);
  return true;
}

/** The caret's beat given a duration (the edit bar's notes), its dots kept. */
function setDurationAtCaretNow(key: string, duration: DurationValue): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { editing, caret, at } = found;
  const row = editing.beats === null ? null : rowOf(editing.beats, caret.beatId);
  if (row === null || row.duration === duration) return true;
  apply(key, [{ kind: 'set-duration', at, duration, dots: row.dots }]);
  return true;
}

/** The master bar the caret is in, or null. */
export function caretBar(editing: DocEditing): number | null {
  const { caret, beats } = editing;
  return caret === null || beats === null ? null : (rowOf(beats, caret.beatId)?.bar ?? null);
}

/** A bar's properties as they are now, from the engine (for the bar dialog). */
export async function readBar(key: string, bar: number): Promise<BarState | null> {
  const doc = docOf(key);
  return doc === null ? null : getEngine().call('barProperties', { docId: doc.engineId, bar });
}

/** Sets a bar's properties, in every track (EDIT-021 … EDIT-027); the caret stays where it is. */
export function setBar(key: string, bar: number, properties: BarProperties): boolean {
  return act(key, () => {
    apply(key, [{ kind: 'set-bar', bar, properties }]);
  });
}

/** A track's properties as they are now, from the engine (for the track dialog). */
export async function readTrack(key: string, track: number): Promise<TrackState | null> {
  const doc = docOf(key);
  return doc === null ? null : getEngine().call('trackProperties', { docId: doc.engineId, track });
}

/** Sets a track's properties (EDIT-031 … EDIT-036). */
export function setTrack(key: string, track: number, properties: TrackProperties): boolean {
  return act(key, () => {
    apply(key, [{ kind: 'set-track', track, properties }]);
  });
}

/** Puts a track in after the others (EDIT-030); it is shown and made active. */
export function addTrack(key: string, track: NewTrack): boolean {
  return act(key, () => {
    apply(key, [{ kind: 'add-track', at: docOf(key)?.summary.tracks.length ?? 0, track }]);
  });
}

/** Takes a track away; a score keeps at least one. */
export function removeTrack(key: string, track: number): boolean {
  return act(key, () => {
    apply(key, [{ kind: 'remove-track', track }]);
  });
}

/** Moves a track to another place among the others. */
export function moveTrack(key: string, track: number, to: number): boolean {
  return act(key, () => {
    apply(key, [{ kind: 'move-track', track, to }]);
  });
}

/** Turns a property of the caret's bar on or off, from what it is (triplet feel, free time). */
export function toggleBarAtCaret(key: string, toggle: 'tripletFeel' | 'freeTime'): boolean {
  return act(key, async () => {
    const bar = caretBar(editingOf(key));
    if (bar === null) return;
    const state = await readBar(key, bar);
    if (state === null) return;
    apply(key, [
      {
        kind: 'set-bar',
        bar,
        properties:
          toggle === 'freeTime'
            ? { freeTime: !state.freeTime }
            : { tripletFeel: state.tripletFeel === 'none' ? 'triplet-8th' : 'none' },
      },
    ]);
  });
}

/** Note techniques the keys turn on and off (EDIT-014), with their flags and how each is set. */
const NOTE_TOGGLES = {
  tie: [TECHNIQUE_TIE, (on: boolean): NoteTechniques => ({ tie: on })],
  hammer: [TECHNIQUE_HAMMER, (on: boolean): NoteTechniques => ({ hammer: on })],
  slide: [TECHNIQUE_SLIDE, (on: boolean): NoteTechniques => ({ slide: on ? 'legato' : 'none' })],
  bend: [TECHNIQUE_BEND, (on: boolean): NoteTechniques => ({ bend: on ? 'full' : 'none' })],
  vibrato: [TECHNIQUE_VIBRATO, (on: boolean): NoteTechniques => ({ vibrato: on ? 'slight' : 'none' })],
  palmMute: [TECHNIQUE_PALM_MUTE, (on: boolean): NoteTechniques => ({ palmMute: on })],
  letRing: [TECHNIQUE_LET_RING, (on: boolean): NoteTechniques => ({ letRing: on })],
  dead: [TECHNIQUE_DEAD, (on: boolean): NoteTechniques => ({ dead: on })],
  ghost: [TECHNIQUE_GHOST, (on: boolean): NoteTechniques => ({ ghost: on })],
  harmonic: [
    TECHNIQUE_NATURAL_HARMONIC,
    (on: boolean): NoteTechniques => ({ harmonic: on ? 'natural' : 'none' }),
  ],
  accent: [TECHNIQUE_ACCENT, (on: boolean): NoteTechniques => ({ accent: on ? 'normal' : 'none' })],
  heavyAccent: [TECHNIQUE_HEAVY_ACCENT, (on: boolean): NoteTechniques => ({ accent: on ? 'heavy' : 'none' })],
  staccato: [TECHNIQUE_STACCATO, (on: boolean): NoteTechniques => ({ staccato: on })],
} as const;

export type NoteToggle = keyof typeof NOTE_TOGGLES;
export const NOTE_TOGGLE_NAMES = Object.keys(NOTE_TOGGLES) as readonly NoteToggle[];

/** Beat techniques the keys turn on and off (EDIT-014). */
const BEAT_TOGGLES = {
  triplet: [BEAT_TRIPLET, (on: boolean): BeatTechniques => ({ tuplet: on ? 'triplet' : 'none' })],
  barVibrato: [BEAT_BAR_VIBRATO, (on: boolean): BeatTechniques => ({ barVibrato: on ? 'slight' : 'none' })],
  slap: [BEAT_SLAP, (on: boolean): BeatTechniques => ({ slap: on })],
  tap: [BEAT_TAP, (on: boolean): BeatTechniques => ({ tap: on })],
  fadeIn: [BEAT_FADE_IN, (on: boolean): BeatTechniques => ({ fade: on ? 'in' : 'none' })],
  fadeOut: [BEAT_FADE_OUT, (on: boolean): BeatTechniques => ({ fade: on ? 'out' : 'none' })],
  tremolo: [BEAT_TREMOLO, (on: boolean): BeatTechniques => ({ tremolo: on ? 3 : 0 })],
  strokeDown: [BEAT_STROKE_DOWN, (on: boolean): BeatTechniques => ({ stroke: on ? 'down' : 'none' })],
  strokeUp: [BEAT_STROKE_UP, (on: boolean): BeatTechniques => ({ stroke: on ? 'up' : 'none' })],
} as const;

export type BeatToggle = keyof typeof BEAT_TOGGLES;
export const BEAT_TOGGLE_NAMES = Object.keys(BEAT_TOGGLES) as readonly BeatToggle[];

/** Whether a note technique is on at the caret (on its note), for the edit bar. */
export function noteToggleOn(editing: DocEditing, toggle: NoteToggle): boolean {
  const { caret, beats } = editing;
  const note =
    caret === null || beats === null
      ? undefined
      : rowOf(beats, caret.beatId)?.notes.find(candidate => candidate.string === caret.string);
  return note !== undefined && (note.flags & NOTE_TOGGLES[toggle][0]) !== 0;
}

/** Whether a beat technique is on at the caret's beat. */
export function beatToggleOn(editing: DocEditing, toggle: BeatToggle): boolean {
  const { caret, beats } = editing;
  const row = caret === null || beats === null ? null : rowOf(beats, caret.beatId);
  return row !== null && (row.flags & BEAT_TOGGLES[toggle][0]) !== 0;
}

/**
 * Turns a technique of the caret's note on or off (Guitar Pro's keys). A tie on a string with
 * nothing written holds the note before it on.
 */
function toggleNoteTechniqueNow(key: string, toggle: NoteToggle): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { editing, caret, at } = found;
  const [flag, set] = NOTE_TOGGLES[toggle];
  const note =
    editing.beats === null
      ? undefined
      : rowOf(editing.beats, caret.beatId)?.notes.find(candidate => candidate.string === caret.string);
  if (note === undefined && toggle !== 'tie') return true;
  const on = note === undefined || (note.flags & flag) === 0;
  apply(key, [{ kind: 'set-note', at: { ...at, string: caret.string }, techniques: set(on) }]);
  return true;
}

/** Palm mute on every note of the caret's beat, or on none when every one has it (⇧P). */
function togglePalmMuteBeatNow(key: string): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { editing, caret, at } = found;
  const notes = editing.beats === null ? [] : (rowOf(editing.beats, caret.beatId)?.notes ?? []);
  if (notes.length === 0) return true;
  const on = !notes.every(note => (note.flags & TECHNIQUE_PALM_MUTE) !== 0);
  apply(
    key,
    notes.map(note => ({
      kind: 'set-note',
      at: { ...at, string: note.string },
      techniques: { palmMute: on },
    })),
  );
  return true;
}

/** Turns a technique of the caret's beat on or off. */
function toggleBeatTechniqueNow(key: string, toggle: BeatToggle): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { editing, caret, at } = found;
  const [flag, set] = BEAT_TOGGLES[toggle];
  const row = editing.beats === null ? null : rowOf(editing.beats, caret.beatId);
  if (row === null) return true;
  apply(key, [{ kind: 'set-beat', at, techniques: set((row.flags & flag) === 0) }]);
  return true;
}

/** The caret's beat made a rest, its notes taken away (R). */
function restAtCaretNow(key: string): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { editing, caret, at } = found;
  const notes = editing.beats === null ? [] : (rowOf(editing.beats, caret.beatId)?.notes ?? []);
  if (notes.length > 0)
    apply(
      key,
      notes.map(note => ({ kind: 'remove-note', at: { ...at, string: note.string } })),
    );
  return true;
}

/** The caret's beat double-dotted, or not dotted (Ctrl+.). */
function toggleDoubleDotAtCaretNow(key: string): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { editing, caret, at } = found;
  const row = editing.beats === null ? null : rowOf(editing.beats, caret.beatId);
  const duration: DurationValue | undefined = DURATION_VALUES.find(value => value === row?.duration);
  if (row === null || duration === undefined) return true;
  apply(key, [{ kind: 'set-duration', at, duration, dots: row.dots === 2 ? 0 : 2 }]);
  return true;
}

/** The caret's beat dotted, or no longer dotted. */
function toggleDotAtCaretNow(key: string): boolean {
  const found = atCaret(key);
  if (found === null) return editingOf(key).on;
  const { editing, caret, at } = found;
  const row = editing.beats === null ? null : rowOf(editing.beats, caret.beatId);
  if (row === null) return true;
  const duration: DurationValue | undefined = DURATION_VALUES.find(value => value === row.duration);
  if (duration === undefined) return true;
  apply(key, [{ kind: 'set-duration', at, duration, dots: row.dots === 0 ? 1 : 0 }]);
  return true;
}

/** Undoes the document's last edit (EDIT-060). */
export function undoEdit(key: string): boolean {
  if (historyOf(key).done.length === 0) return false;
  void enqueue(key, async () => {
    const history = historyOf(key);
    const step = history.done.at(-1);
    const doc = docOf(key);
    if (step === undefined || doc === null) return;
    const outcome = await getEngine().call('undo', { docId: doc.engineId });
    if (!outcome.changed) return;
    history.done.pop();
    history.undone.push(step);
    await changed(key, outcome, history.done.at(-1)?.revision ?? 0, step.before);
  }).catch(fail);
  return true;
}

/** Makes the document's last edit undone again. */
export function redoEdit(key: string): boolean {
  if (historyOf(key).undone.length === 0) return false;
  void enqueue(key, async () => {
    const history = historyOf(key);
    const step = history.undone.at(-1);
    const doc = docOf(key);
    if (step === undefined || doc === null) return;
    const outcome = await getEngine().call('redo', { docId: doc.engineId });
    if (!outcome.changed) return;
    history.undone.pop();
    history.done.push(step);
    await changed(key, outcome, step.revision, step.after);
  }).catch(fail);
  return true;
}

/**
 * Runs a task once the document's edits under way are made (saving it as it is then): the version
 * it was then is marked saved when the task says so.
 */
export function afterEdits(key: string, task: () => Promise<boolean>): Promise<boolean> {
  let result = false;
  return enqueue(key, async () => {
    const revision = editingOf(key).revision;
    result = await task();
    if (result) {
      patch(key, { saved: revision });
      keepDraft(key);
    }
  }).then(() => result);
}

/**
 * A document opened again in a restarted engine: its edits are made again, those undone too and
 * then undone, so that undo and redo go on as before.
 */
function replay(key: string): void {
  const history = historyOf(key);
  if (history.done.length === 0 && history.undone.length === 0) return;
  void enqueue(key, async () => {
    const doc = docOf(key);
    if (doc === null) return;
    const engine = getEngine();
    const steps = [...history.done, ...[...history.undone].reverse()];
    let outcome: EditOutcome | null = null;
    for (const step of steps)
      outcome = await engine.call('edit', { docId: doc.engineId, commands: step.commands });
    let undone = history.undone.length;
    while (undone-- > 0) outcome = await engine.call('undo', { docId: doc.engineId });
    if (outcome === null) return;
    const editing = editingOf(key);
    await changed(key, outcome, history.done.at(-1)?.revision ?? 0, placeOf(editing));
    if (editing.on && editing.caret !== null) await placeCaret(key, editing.caret.track);
  }).catch(fail);
}

// The engine restarted (a document's engine id changed): edits are made again. A closed document
// is forgotten. The caret follows the track made active.
useDocuments.subscribe((state, previous) => {
  for (const doc of previous.docs) {
    const now = state.docs.find(candidate => candidate.key === doc.key);
    if (now === undefined) {
      // Closed, saved or not: its edits are not offered back.
      histories.delete(doc.key);
      const timer = draftTimers.get(doc.key);
      if (timer !== undefined) clearTimeout(timer);
      draftTimers.delete(doc.key);
      releaseDraft(doc.key);
      void deleteDraft(doc.key);
      useEditing.setState(editing => {
        const { [doc.key]: _closed, ...rest } = editing.docs;
        return { docs: rest };
      });
    } else if (now.engineId !== doc.engineId) replay(doc.key);
    else if (
      now.activeTrack !== doc.activeTrack &&
      editingOf(doc.key).on &&
      editingOf(doc.key).caret?.track !== now.activeTrack
    ) {
      void enqueue(doc.key, () => placeCaret(doc.key, now.activeTrack)).catch(fail);
    }
  }
});

// The editing actions, each run after the ones before it, on the score as they leave it.
export function moveCaret(key: string, move: CaretMove, invertedTab: boolean): boolean {
  return act(key, () => moveCaretNow(key, move, invertedTab));
}

/** Writes a digit's fret on the caret's string (two digits typed quickly write 10 to 99). */
export function typeFret(key: string, digit: number): boolean {
  const now = performance.now();
  return act(key, () => typeFretNow(key, digit, now));
}

export function writeFretAtCaret(key: string, fret: number): boolean {
  return act(key, () => writeFretAtCaretNow(key, fret));
}

export function deleteNoteAtCaret(key: string): boolean {
  return act(key, () => deleteNoteAtCaretNow(key));
}

export function insertBeatAtCaret(key: string): boolean {
  return act(key, () => insertBeatAtCaretNow(key));
}

export function insertBarAtCaret(key: string): boolean {
  return act(key, () => insertBarAtCaretNow(key));
}

export function deleteBarAtCaret(key: string): boolean {
  return act(key, () => deleteBarAtCaretNow(key));
}

export function deleteBeatAtCaret(key: string): boolean {
  return act(key, () => deleteBeatAtCaretNow(key));
}

export function stepDurationAtCaret(key: string, longer: boolean): boolean {
  return act(key, () => stepDurationAtCaretNow(key, longer));
}

export function setDurationAtCaret(key: string, duration: DurationValue): boolean {
  return act(key, () => setDurationAtCaretNow(key, duration));
}

export function toggleDotAtCaret(key: string): boolean {
  return act(key, () => toggleDotAtCaretNow(key));
}

export function toggleDoubleDotAtCaret(key: string): boolean {
  return act(key, () => toggleDoubleDotAtCaretNow(key));
}

export function toggleNoteTechnique(key: string, toggle: NoteToggle): boolean {
  return act(key, () => toggleNoteTechniqueNow(key, toggle));
}

export function togglePalmMuteBeat(key: string): boolean {
  return act(key, () => togglePalmMuteBeatNow(key));
}

export function toggleBeatTechnique(key: string, toggle: BeatToggle): boolean {
  return act(key, () => toggleBeatTechniqueNow(key, toggle));
}

export function restAtCaret(key: string): boolean {
  return act(key, () => restAtCaretNow(key));
}
