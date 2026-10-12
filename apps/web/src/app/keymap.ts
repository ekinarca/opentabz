/**
 * Every keyboard shortcut in one table: the handler, the shortcut sheet and docs/SHORTCUTS.md all
 * follow it. Keys match Guitar Pro 8 wherever it has a shortcut for the same action.
 */
import { TIMELINE_BAR_STRIDE, type MasterBarSummary, type TickRange } from '@opentabz/core/shared';
import { getAudioEngine } from '../audio/audio-engine.ts';
import { getEngine } from '../engine/instance.ts';
import {
  beatsAtTick,
  findBarOccurrence,
  lastBeatTick,
  occurrence,
  stepBeat,
  type Occurrence,
} from '../score-view/timeline-lookup.ts';
import { clampZoom, MAX_ZOOM, MIN_ZOOM, useDocuments, type OpenDocument } from '../state/documents.ts';
import {
  deleteBarAtCaret,
  deleteBeatAtCaret,
  deleteNoteAtCaret,
  insertBarAtCaret,
  insertBeatAtCaret,
  moveCaret,
  redoEdit,
  restAtCaret,
  stepDurationAtCaret,
  toggleBarAtCaret,
  toggleBeatTechnique,
  toggleDotAtCaret,
  toggleDoubleDotAtCaret,
  toggleNoteTechnique,
  togglePalmMuteBeat,
  toggleEditing,
  typeFret,
  undoEdit,
  type CaretMove,
} from '../state/editing.ts';
import { clampSpeed, usePlayer } from '../state/player.ts';
import { usePractice } from '../state/practice.ts';
import { usePreferences } from '../state/preferences.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { leaveFullScreen, toggleFullScreen } from './full-screen.ts';
import { pickFiles } from './open-actions.ts';
import { saveDocument } from './save.ts';
import { openAddTrack } from './TrackDialog.tsx';
import { modKey } from './platform.ts';

export type ShortcutGroup = 'playback' | 'navigation' | 'selection' | 'editing' | 'view' | 'files' | 'help';

export interface KeyBinding {
  /** `KeyboardEvent.key`, letters in lower case. */
  readonly key: string;
  /**
   * `KeyboardEvent.code` to match instead of the key, for letters with Alt: on macOS ⌥ turns
   * them into other characters (⌥M types "µ").
   */
  readonly code?: string;
  /** ⌘ on Apple platforms, Ctrl elsewhere. */
  readonly mod?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
  /** Control as well as ⌘ (⌃⌘F): such a binding is for Apple platforms only. */
  readonly ctrl?: boolean;
  /**
   * The platform the binding is for, where Guitar Pro's keys differ (a Mac has no Insert key):
   * Apple platforms, or the others.
   */
  readonly platform?: 'apple' | 'pc';
}

export interface Shortcut {
  readonly id: string;
  readonly group: ShortcutGroup;
  readonly label: string;
  readonly bindings: readonly KeyBinding[];
  /** Only while a score is open. */
  readonly needsScore: boolean;
  /** Also while typing in a text field. */
  readonly inTextFields?: boolean;
  /**
   * Only while the score is being edited (EDIT-004), before the keys' other meanings; its single
   * keys then work whatever the single-key setting, the score being written.
   */
  readonly editing?: boolean;
  /**
   * Returns whether the key was handled; otherwise the next action on the same keys is tried, or
   * the key keeps its usual meaning. Given the key pressed, when one was.
   */
  readonly run: (key?: KeyInput) => boolean;
}

/** Speed change per key press (Guitar Pro's − and + keys). */
export const SPEED_STEP = 0.05;

function activeDocument(): OpenDocument | null {
  const { docs, activeKey } = useDocuments.getState();
  return docs.find(doc => doc.key === activeKey) ?? null;
}

function visibleTracks(): ReadonlySet<number> {
  return new Set(activeDocument()?.view.trackIndexes ?? []);
}

function currentBar(): Occurrence | null {
  const { timeline, tick } = usePlayer.getState();
  return timeline === null ? null : occurrence(timeline, findBarOccurrence(timeline, tick));
}

function seek(tick: number | null): boolean {
  if (tick === null) return false;
  usePlayer.getState().seek(tick);
  return true;
}

/** Previous or next beat; with sound when `audible` (Guitar Pro's step with Alt). */
function stepToBeat(direction: 1 | -1, audible: boolean): boolean {
  const { timeline, tick, transport } = usePlayer.getState();
  if (timeline === null) return false;
  const tracks = visibleTracks();
  const target = stepBeat(timeline, tick, tracks, direction);
  if (!seek(target) || target === null) return true;
  const doc = activeDocument();
  if (audible && doc !== null && transport.status !== 'playing') {
    const beatIds = beatsAtTick(timeline, target, tracks);
    // The key press is a user gesture: audio output may be created here.
    void getAudioEngine()
      .ensureOutput()
      .then(() => getEngine().call('previewBeats', { docId: doc.engineId, beatIds }))
      .catch(() => undefined);
  }
  return true;
}

/** Previous or next bar in playback order; "previous" first returns to the current bar's start. */
function stepBar(direction: 1 | -1): boolean {
  const { timeline, tick } = usePlayer.getState();
  if (timeline === null) return false;
  const index = findBarOccurrence(timeline, tick);
  const current = occurrence(timeline, index);
  if (current === null) return false;
  const target =
    direction < 0 && tick - current.startTick > 240
      ? current
      : occurrence(timeline, Math.max(0, index + direction));
  return seek(target?.startTick ?? null);
}

/** Start tick of the previous or next section in playback order. */
export function sectionTick(
  bars: Int32Array,
  masterBars: readonly MasterBarSummary[],
  tick: number,
  direction: 1 | -1,
): number | null {
  const count = bars.length / TIMELINE_BAR_STRIDE;
  const starts = (index: number) => bars[index * TIMELINE_BAR_STRIDE] ?? 0;
  const hasSection = (index: number) =>
    (masterBars[bars[index * TIMELINE_BAR_STRIDE + 2] ?? -1]?.section ?? null) !== null;
  let index = 0;
  while (index + 1 < count && starts(index + 1) <= tick) index++;
  if (direction > 0) {
    for (let next = index + 1; next < count; next++) if (hasSection(next)) return starts(next);
    return null;
  }
  // Back to the start of the current section first, then to the one before.
  for (let previous = index; previous >= 0; previous--) {
    if (hasSection(previous) && starts(previous) < tick - 240) return starts(previous);
  }
  return null;
}

function stepSection(direction: 1 | -1): boolean {
  const { timeline, tick } = usePlayer.getState();
  const doc = activeDocument();
  if (timeline === null || doc === null) return false;
  return seek(sectionTick(timeline.bars, doc.summary.masterBars, tick, direction));
}

function barStartOrEnd(end: boolean): boolean {
  const { timeline } = usePlayer.getState();
  const bar = currentBar();
  if (timeline === null || bar === null) return false;
  return seek(end ? lastBeatTick(timeline, bar, visibleTracks()) : bar.startTick);
}

function songStartOrEnd(end: boolean): boolean {
  const { timeline } = usePlayer.getState();
  if (timeline === null) return false;
  if (!end) return seek(0);
  const last = occurrence(timeline, timeline.bars.length / TIMELINE_BAR_STRIDE - 1);
  return seek(last === null ? null : lastBeatTick(timeline, last, visibleTracks()));
}

/**
 * Keyboard selection: an anchor beat stays put while the focus beat moves. The range runs from
 * the earlier of the two to the end of the later one.
 */
let keyboardSelection: { anchor: number; focus: number; range: TickRange } | null = null;

type FocusMove =
  'beat-left' | 'beat-right' | 'bar-left' | 'bar-right' | 'bar-start' | 'bar-end' | 'song-start' | 'song-end';

function moveFocus(move: FocusMove): boolean {
  const player = usePlayer.getState();
  const timeline = player.timeline;
  if (timeline === null) return false;
  const tracks = visibleTracks();
  const selection = player.selection;
  const continuing =
    keyboardSelection !== null &&
    selection !== null &&
    selection.startTick === keyboardSelection.range.startTick &&
    selection.endTick === keyboardSelection.range.endTick;
  const anchor = continuing && keyboardSelection !== null ? keyboardSelection.anchor : player.tick;
  const focus = continuing && keyboardSelection !== null ? keyboardSelection.focus : player.tick;
  const focusBar = occurrence(timeline, findBarOccurrence(timeline, focus));
  const lastBar = occurrence(timeline, timeline.bars.length / TIMELINE_BAR_STRIDE - 1);
  let next: number | null = focus;
  switch (move) {
    case 'beat-left':
      next = stepBeat(timeline, focus, tracks, -1);
      break;
    case 'beat-right':
      next = stepBeat(timeline, focus, tracks, 1);
      break;
    case 'bar-left': {
      // First to the start of the focus bar, then a bar at a time.
      if (focusBar !== null && focus > focusBar.startTick) next = focusBar.startTick;
      else next = (focusBar === null ? null : occurrence(timeline, focusBar.index - 1))?.startTick ?? null;
      break;
    }
    case 'bar-right': {
      // First to the end of the focus bar, then a bar at a time.
      const end = focusBar === null ? null : lastBeatTick(timeline, focusBar, tracks);
      if (end !== null && end > focus) next = end;
      else {
        const following = focusBar === null ? null : occurrence(timeline, focusBar.index + 1);
        next = following === null ? null : lastBeatTick(timeline, following, tracks);
      }
      break;
    }
    case 'bar-start':
      next = focusBar?.startTick ?? null;
      break;
    case 'bar-end':
      next = focusBar === null ? null : lastBeatTick(timeline, focusBar, tracks);
      break;
    case 'song-start':
      next = 0;
      break;
    case 'song-end':
      next = lastBar === null ? null : lastBeatTick(timeline, lastBar, tracks);
      break;
  }
  if (next === null) return true;
  const startTick = Math.min(anchor, next);
  const last = Math.max(anchor, next);
  const endTick = stepBeat(timeline, last, tracks, 1) ?? timeline.endTick;
  const range = { startTick, endTick: Math.max(endTick, startTick + 1) };
  keyboardSelection = { anchor, focus: next, range };
  player.setSelection(range);
  return true;
}

function selectAll(): boolean {
  const { timeline, setSelection } = usePlayer.getState();
  if (timeline === null) return false;
  setSelection({ startTick: 0, endTick: timeline.endTick });
  return true;
}

/** Clears the selection, else leaves full screen. */
function clearSelection(): boolean {
  const player = usePlayer.getState();
  if (player.selection !== null) {
    player.setSelection(null);
    return true;
  }
  if (!useUi.getState().fullScreen) return false;
  leaveFullScreen();
  return true;
}

function changeSpeed(direction: 1 | -1): boolean {
  const player = usePlayer.getState();
  player.setSpeed(clampSpeed(player.speed + direction * SPEED_STEP));
  return true;
}

function zoomActive(change: (zoom: number) => number): boolean {
  const doc = activeDocument();
  if (doc === null) return false;
  useDocuments.getState().updateView(doc.key, { zoom: clampZoom(change(doc.view.zoom)) });
  return true;
}

/** Makes the previous or next track the active one (and shows it, while one track is shown). */
function stepTrack(step: number): boolean {
  const doc = activeDocument();
  if (doc === null) return false;
  const target = doc.activeTrack + step;
  if (target >= 0 && target < doc.summary.tracks.length)
    useDocuments.getState().setActiveTrack(doc.key, target);
  return true;
}

const ZOOM_STEPS = [
  0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6, 8,
];

/** The next zoom preset above or below `zoom`. */
export function zoomStep(zoom: number, direction: 1 | -1): number {
  if (direction > 0) return ZOOM_STEPS.find(step => step > zoom + 0.001) ?? MAX_ZOOM;
  return [...ZOOM_STEPS].reverse().find(step => step < zoom - 0.001) ?? MIN_ZOOM;
}

const s = strings.shortcuts.actions;

/** Runs an editing action on the document shown, if any. */
function onActive(action: (key: string) => boolean): boolean {
  const doc = activeDocument();
  return doc !== null && action(doc.key);
}

/** Moves the editor's caret on the document shown. */
function caret(move: CaretMove): () => boolean {
  return () => onActive(key => moveCaret(key, move, usePreferences.getState().invertedTab));
}

/** The score shown, focused, for the keys that follow to edit it. */
export function focusScore(): void {
  const doc = activeDocument();
  if (doc === null) return;
  document.querySelector<HTMLElement>(`[data-doc="${CSS.escape(doc.key)}"]`)?.focus({ preventScroll: true });
}

const DIGITS: readonly KeyBinding[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => ({
  key,
}));

/** The editor's keys (EDIT-004, EDIT-060), first: while editing, they come before other meanings. */
const EDITING: readonly Shortcut[] = [
  {
    id: 'edit-mode',
    group: 'editing',
    label: s.editMode,
    bindings: [{ key: 'F2' }],
    needsScore: true,
    run: () =>
      onActive(key => {
        void toggleEditing(key);
        focusScore();
        return true;
      }),
  },
  {
    id: 'undo',
    group: 'editing',
    label: s.undo,
    bindings: [{ key: 'z', mod: true }],
    needsScore: true,
    run: () => onActive(undoEdit),
  },
  {
    id: 'redo',
    group: 'editing',
    label: s.redo,
    bindings: [
      { key: 'z', mod: true, shift: true },
      { key: 'y', mod: true },
    ],
    needsScore: true,
    run: () => onActive(redoEdit),
  },
  {
    id: 'write-fret',
    group: 'editing',
    label: s.writeFret,
    bindings: DIGITS,
    needsScore: true,
    editing: true,
    run: key =>
      key !== undefined && /^[0-9]$/.test(key.key) && onActive(doc => typeFret(doc, Number(key.key))),
  },
  {
    id: 'caret-left',
    group: 'editing',
    label: s.caretLeft,
    bindings: [{ key: 'ArrowLeft' }],
    needsScore: true,
    editing: true,
    run: caret('left'),
  },
  {
    id: 'caret-right',
    group: 'editing',
    label: s.caretRight,
    bindings: [{ key: 'ArrowRight' }],
    needsScore: true,
    editing: true,
    run: caret('right'),
  },
  {
    id: 'caret-up',
    group: 'editing',
    label: s.caretUp,
    bindings: [{ key: 'ArrowUp' }],
    needsScore: true,
    editing: true,
    run: caret('up'),
  },
  {
    id: 'caret-down',
    group: 'editing',
    label: s.caretDown,
    bindings: [{ key: 'ArrowDown' }],
    needsScore: true,
    editing: true,
    run: caret('down'),
  },
  {
    id: 'caret-bar-left',
    group: 'editing',
    label: s.caretBarLeft,
    bindings: [{ key: 'ArrowLeft', mod: true }],
    needsScore: true,
    editing: true,
    run: caret('bar-left'),
  },
  {
    id: 'caret-bar-right',
    group: 'editing',
    label: s.caretBarRight,
    bindings: [{ key: 'ArrowRight', mod: true }],
    needsScore: true,
    editing: true,
    run: caret('bar-right'),
  },
  {
    id: 'delete-note',
    group: 'editing',
    label: s.deleteNote,
    bindings: [{ key: 'Backspace' }, { key: 'Delete' }],
    needsScore: true,
    editing: true,
    run: () => onActive(deleteNoteAtCaret),
  },
  {
    id: 'delete-beat',
    group: 'editing',
    label: s.deleteBeat,
    // Guitar Pro's keys: Shift Del, ⌘ − on a Mac.
    bindings: [
      { key: 'Delete', shift: true, platform: 'pc' },
      { key: '-', mod: true, platform: 'apple' },
    ],
    needsScore: true,
    editing: true,
    run: () => onActive(deleteBeatAtCaret),
  },
  {
    id: 'insert-bar',
    group: 'editing',
    label: s.insertBar,
    // Guitar Pro's keys: Ins, ⌘ + on a Mac.
    bindings: [
      { key: 'Insert', platform: 'pc' },
      { key: '+', mod: true, platform: 'apple' },
    ],
    needsScore: true,
    editing: true,
    run: () => onActive(insertBarAtCaret),
  },
  {
    id: 'delete-bar',
    group: 'editing',
    label: s.deleteBar,
    // Guitar Pro's keys: Ctrl Del, ⌃ − on a Mac.
    bindings: [
      { key: 'Delete', mod: true, platform: 'pc' },
      { key: '-', ctrl: true },
    ],
    needsScore: true,
    editing: true,
    run: () => onActive(deleteBarAtCaret),
  },
  {
    id: 'insert-beat',
    group: 'editing',
    label: s.insertBeat,
    // Guitar Pro's keys: Ctrl Ins, ⌃ + on a Mac.
    bindings: [
      { key: 'Insert', mod: true, platform: 'pc' },
      { key: '+', ctrl: true },
    ],
    needsScore: true,
    editing: true,
    run: () => onActive(insertBeatAtCaret),
  },
  {
    id: 'duration-longer',
    group: 'editing',
    label: s.durationLonger,
    // As in Guitar Pro: − lengthens the note, + shortens it.
    bindings: [{ key: '-' }, { key: '_' }],
    needsScore: true,
    editing: true,
    run: () => onActive(key => stepDurationAtCaret(key, true)),
  },
  {
    id: 'duration-shorter',
    group: 'editing',
    label: s.durationShorter,
    bindings: [{ key: '+' }, { key: '=' }],
    needsScore: true,
    editing: true,
    run: () => onActive(key => stepDurationAtCaret(key, false)),
  },
  {
    id: 'dot',
    group: 'editing',
    label: s.dot,
    bindings: [{ key: '.' }],
    needsScore: true,
    editing: true,
    run: () => onActive(toggleDotAtCaret),
  },
];

/** An editing shortcut that turns a technique on or off, Guitar Pro's keys (EDIT-014). */
function technique(
  id: string,
  label: string,
  bindings: readonly KeyBinding[],
  run: (key: string) => boolean,
): Shortcut {
  return { id, group: 'editing', label, bindings, needsScore: true, editing: true, run: () => onActive(run) };
}

/** Guitar Pro 8's keys for rhythm and techniques (its "Durations", "Ties", "Tuplets" and "Playing Effects"). */
const TECHNIQUES: readonly Shortcut[] = [
  technique('double-dot', s.doubleDot, [{ key: '.', mod: true }], toggleDoubleDotAtCaret),
  technique('rest', s.rest, [{ key: 'r' }], restAtCaret),
  technique('triplet', s.triplet, [{ key: '/' }], key => toggleBeatTechnique(key, 'triplet')),
  technique('tie', s.tie, [{ key: 'l' }], key => toggleNoteTechnique(key, 'tie')),
  technique('hammer', s.hammer, [{ key: 'h' }], key => toggleNoteTechnique(key, 'hammer')),
  technique('slide', s.slide, [{ key: 's' }], key => toggleNoteTechnique(key, 'slide')),
  technique('bend', s.bend, [{ key: 'b' }], key => toggleNoteTechnique(key, 'bend')),
  technique('vibrato', s.vibrato, [{ key: 'v' }], key => toggleNoteTechnique(key, 'vibrato')),
  technique('bar-vibrato', s.barVibrato, [{ key: 'w' }], key => toggleBeatTechnique(key, 'barVibrato')),
  technique('palm-mute', s.palmMute, [{ key: 'p' }], key => toggleNoteTechnique(key, 'palmMute')),
  technique('palm-mute-beat', s.palmMuteBeat, [{ key: 'p', shift: true }], togglePalmMuteBeat),
  technique('let-ring', s.letRing, [{ key: 'i' }], key => toggleNoteTechnique(key, 'letRing')),
  technique('dead', s.dead, [{ key: 'x' }], key => toggleNoteTechnique(key, 'dead')),
  technique('ghost', s.ghost, [{ key: 'o' }], key => toggleNoteTechnique(key, 'ghost')),
  technique('harmonic', s.harmonic, [{ key: 'y' }], key => toggleNoteTechnique(key, 'harmonic')),
  technique('accent', s.accent, [{ key: ';' }], key => toggleNoteTechnique(key, 'accent')),
  technique('heavy-accent', s.heavyAccent, [{ key: ':' }], key => toggleNoteTechnique(key, 'heavyAccent')),
  technique('staccato', s.staccato, [{ key: '!' }], key => toggleNoteTechnique(key, 'staccato')),
  technique('slap', s.slap, [{ key: '$' }], key => toggleBeatTechnique(key, 'slap')),
  technique('tap', s.tap, [{ key: ')' }], key => toggleBeatTechnique(key, 'tap')),
  technique('fade-in', s.fadeIn, [{ key: '<' }], key => toggleBeatTechnique(key, 'fadeIn')),
  technique('fade-out', s.fadeOut, [{ key: '>' }], key => toggleBeatTechnique(key, 'fadeOut')),
  technique('tremolo', s.tremolo, [{ key: '"' }], key => toggleBeatTechnique(key, 'tremolo')),
  technique('stroke-down', s.strokeDown, [{ key: 'd', shift: true }], key =>
    toggleBeatTechnique(key, 'strokeDown'),
  ),
  technique('stroke-up', s.strokeUp, [{ key: 'u', shift: true }], key =>
    toggleBeatTechnique(key, 'strokeUp'),
  ),
  // Guitar Pro's keys for a track: Ctrl Shift Ins, ⌥⌘N on a Mac.
  technique(
    'add-track',
    s.addTrack,
    [
      { key: 'Insert', mod: true, shift: true, platform: 'pc' },
      { key: 'n', code: 'KeyN', mod: true, alt: true, platform: 'apple' },
    ],
    openAddTrack,
  ),
  // Guitar Pro's bar keys: ⌘/ (Ctrl /) triplet feel, ⌥⇧L (Alt Shift L) free time.
  technique('triplet-feel-bar', s.tripletFeelBar, [{ key: '/', mod: true }], key =>
    toggleBarAtCaret(key, 'tripletFeel'),
  ),
  technique('free-time-bar', s.freeTimeBar, [{ key: 'l', code: 'KeyL', alt: true, shift: true }], key =>
    toggleBarAtCaret(key, 'freeTime'),
  ),
];

export const SHORTCUTS: readonly Shortcut[] = [
  ...EDITING,
  ...TECHNIQUES,
  {
    id: 'play-pause',
    group: 'playback',
    label: s.playPause,
    bindings: [{ key: ' ' }],
    needsScore: true,
    run: () => {
      usePlayer.getState().toggle();
      return true;
    },
  },
  {
    id: 'stop',
    group: 'playback',
    label: s.stop,
    bindings: [{ key: ' ', shift: true }],
    needsScore: true,
    run: () => {
      usePlayer.getState().stop();
      return true;
    },
  },
  {
    id: 'loop',
    group: 'playback',
    label: s.loop,
    bindings: [{ key: 'F9' }],
    needsScore: true,
    run: () => {
      const player = usePlayer.getState();
      player.setLoop(!player.loop);
      return true;
    },
  },
  {
    id: 'speed',
    group: 'playback',
    label: s.speed,
    bindings: [{ key: 'F9', mod: true }],
    needsScore: true,
    run: () => {
      useUi.getState().openPanel('speed');
      return true;
    },
  },
  {
    id: 'speed-down',
    group: 'playback',
    label: s.speedDown,
    bindings: [{ key: '-' }, { key: '_' }],
    needsScore: true,
    run: () => changeSpeed(-1),
  },
  {
    id: 'speed-up',
    group: 'playback',
    label: s.speedUp,
    bindings: [{ key: '=' }, { key: '+' }],
    needsScore: true,
    run: () => changeSpeed(1),
  },
  {
    id: 'metronome',
    group: 'playback',
    label: s.metronome,
    bindings: [{ key: 'm', code: 'KeyM', alt: true }],
    needsScore: true,
    run: () => {
      const practice = usePractice.getState();
      practice.set({ metronome: !practice.metronome });
      return true;
    },
  },
  {
    id: 'count-in',
    group: 'playback',
    label: s.countIn,
    bindings: [{ key: 'c', code: 'KeyC', alt: true }],
    needsScore: true,
    run: () => {
      const practice = usePractice.getState();
      practice.set({ countIn: !practice.countIn });
      return true;
    },
  },
  {
    id: 'beat-previous',
    group: 'navigation',
    label: s.beatPrevious,
    bindings: [{ key: 'ArrowLeft' }],
    needsScore: true,
    run: () => stepToBeat(-1, false),
  },
  {
    id: 'beat-next',
    group: 'navigation',
    label: s.beatNext,
    bindings: [{ key: 'ArrowRight' }],
    needsScore: true,
    run: () => stepToBeat(1, false),
  },
  {
    id: 'beat-previous-audible',
    group: 'navigation',
    label: s.beatPreviousAudible,
    bindings: [{ key: 'ArrowLeft', alt: true }],
    needsScore: true,
    run: () => stepToBeat(-1, true),
  },
  {
    id: 'beat-next-audible',
    group: 'navigation',
    label: s.beatNextAudible,
    bindings: [{ key: 'ArrowRight', alt: true }],
    needsScore: true,
    run: () => stepToBeat(1, true),
  },
  {
    id: 'bar-previous',
    group: 'navigation',
    label: s.barPrevious,
    bindings: [{ key: 'ArrowLeft', mod: true }],
    needsScore: true,
    run: () => stepBar(-1),
  },
  {
    id: 'bar-next',
    group: 'navigation',
    label: s.barNext,
    bindings: [{ key: 'ArrowRight', mod: true }],
    needsScore: true,
    run: () => stepBar(1),
  },
  {
    id: 'section-previous',
    group: 'navigation',
    label: s.sectionPrevious,
    // ⌘⌥← switches browser tabs on macOS, so Alt+Page Up works everywhere too.
    bindings: [
      { key: 'ArrowLeft', mod: true, alt: true },
      { key: 'PageUp', alt: true },
    ],
    needsScore: true,
    run: () => stepSection(-1),
  },
  {
    id: 'section-next',
    group: 'navigation',
    label: s.sectionNext,
    bindings: [
      { key: 'ArrowRight', mod: true, alt: true },
      { key: 'PageDown', alt: true },
    ],
    needsScore: true,
    run: () => stepSection(1),
  },
  {
    id: 'bar-start',
    group: 'navigation',
    label: s.barStart,
    bindings: [{ key: 'Home' }],
    needsScore: true,
    run: () => barStartOrEnd(false),
  },
  {
    id: 'bar-end',
    group: 'navigation',
    label: s.barEnd,
    bindings: [{ key: 'End' }],
    needsScore: true,
    run: () => barStartOrEnd(true),
  },
  {
    id: 'song-start',
    group: 'navigation',
    label: s.songStart,
    bindings: [{ key: 'Home', mod: true }],
    needsScore: true,
    run: () => songStartOrEnd(false),
  },
  {
    id: 'song-end',
    group: 'navigation',
    label: s.songEnd,
    bindings: [{ key: 'End', mod: true }],
    needsScore: true,
    run: () => songStartOrEnd(true),
  },
  {
    id: 'go-to',
    group: 'navigation',
    label: s.goTo,
    bindings: [{ key: 'g', mod: true }],
    needsScore: true,
    run: () => {
      useUi.getState().openPanel('goto');
      return true;
    },
  },
  {
    id: 'select-beat-left',
    group: 'selection',
    label: s.selectBeatLeft,
    bindings: [{ key: 'ArrowLeft', shift: true }],
    needsScore: true,
    run: () => moveFocus('beat-left'),
  },
  {
    id: 'select-beat-right',
    group: 'selection',
    label: s.selectBeatRight,
    bindings: [{ key: 'ArrowRight', shift: true }],
    needsScore: true,
    run: () => moveFocus('beat-right'),
  },
  {
    id: 'select-bar-left',
    group: 'selection',
    label: s.selectBarLeft,
    bindings: [{ key: 'ArrowLeft', mod: true, shift: true }],
    needsScore: true,
    run: () => moveFocus('bar-left'),
  },
  {
    id: 'select-bar-right',
    group: 'selection',
    label: s.selectBarRight,
    bindings: [{ key: 'ArrowRight', mod: true, shift: true }],
    needsScore: true,
    run: () => moveFocus('bar-right'),
  },
  {
    id: 'select-bar-start',
    group: 'selection',
    label: s.selectBarStart,
    bindings: [{ key: 'Home', shift: true }],
    needsScore: true,
    run: () => moveFocus('bar-start'),
  },
  {
    id: 'select-bar-end',
    group: 'selection',
    label: s.selectBarEnd,
    bindings: [{ key: 'End', shift: true }],
    needsScore: true,
    run: () => moveFocus('bar-end'),
  },
  {
    id: 'select-song-start',
    group: 'selection',
    label: s.selectSongStart,
    bindings: [{ key: 'Home', mod: true, shift: true }],
    needsScore: true,
    run: () => moveFocus('song-start'),
  },
  {
    id: 'select-song-end',
    group: 'selection',
    label: s.selectSongEnd,
    bindings: [{ key: 'End', mod: true, shift: true }],
    needsScore: true,
    run: () => moveFocus('song-end'),
  },
  {
    id: 'select-all',
    group: 'selection',
    label: s.selectAll,
    bindings: [{ key: 'a', mod: true }],
    needsScore: true,
    run: selectAll,
  },
  {
    id: 'clear-selection',
    group: 'selection',
    label: s.clearSelection,
    bindings: [{ key: 'Escape' }],
    needsScore: true,
    run: clearSelection,
  },
  {
    id: 'zoom-in',
    group: 'view',
    label: s.zoomIn,
    bindings: [
      { key: '=', mod: true },
      { key: '+', mod: true },
    ],
    needsScore: true,
    run: () => zoomActive(zoom => zoomStep(zoom, 1)),
  },
  {
    id: 'zoom-out',
    group: 'view',
    label: s.zoomOut,
    bindings: [
      { key: '-', mod: true },
      { key: '_', mod: true },
    ],
    needsScore: true,
    run: () => zoomActive(zoom => zoomStep(zoom, -1)),
  },
  {
    id: 'zoom-reset',
    group: 'view',
    label: s.zoomReset,
    bindings: [{ key: '0', mod: true }],
    needsScore: true,
    run: () => zoomActive(() => 1),
  },
  {
    id: 'fretboard',
    group: 'view',
    label: s.fretboard,
    bindings: [{ key: 'F6', mod: true }],
    needsScore: true,
    run: () => {
      const preferences = usePreferences.getState();
      preferences.set({ fretboard: !preferences.fretboard });
      return true;
    },
  },
  {
    id: 'overview',
    group: 'view',
    label: s.overview,
    // Guitar Pro's global view.
    bindings: [{ key: 'F8' }],
    needsScore: true,
    run: () => {
      const preferences = usePreferences.getState();
      preferences.set({ overview: !preferences.overview });
      return true;
    },
  },
  {
    id: 'stylesheet',
    group: 'view',
    label: s.stylesheet,
    // Guitar Pro's key for its stylesheet.
    bindings: [{ key: 'F7' }],
    needsScore: true,
    run: () => {
      useUi.getState().openPanel('stylesheet');
      return true;
    },
  },
  {
    id: 'full-screen',
    group: 'view',
    label: s.fullScreen,
    // Guitar Pro's keys: ⌃⌘F on macOS, F11 elsewhere.
    bindings: [{ key: 'f', mod: true, ctrl: true }, { key: 'F11' }],
    needsScore: true,
    run: () => {
      toggleFullScreen();
      return true;
    },
  },
  {
    id: 'track-previous',
    group: 'view',
    label: s.trackPrevious,
    bindings: [{ key: 'ArrowUp', mod: true }],
    needsScore: true,
    run: () => stepTrack(-1),
  },
  {
    id: 'track-next',
    group: 'view',
    label: s.trackNext,
    bindings: [{ key: 'ArrowDown', mod: true }],
    needsScore: true,
    run: () => stepTrack(1),
  },
  {
    id: 'open',
    group: 'files',
    label: s.open,
    bindings: [{ key: 'o', mod: true }],
    needsScore: false,
    inTextFields: true,
    run: () => {
      pickFiles();
      return true;
    },
  },
  {
    id: 'save',
    group: 'files',
    label: s.save,
    bindings: [{ key: 's', mod: true }],
    needsScore: true,
    inTextFields: true,
    run: () =>
      onActive(key => {
        void saveDocument(key);
        return true;
      }),
  },
  {
    id: 'print',
    group: 'files',
    label: s.print,
    bindings: [{ key: 'p', mod: true }],
    needsScore: true,
    inTextFields: true,
    run: () => {
      useUi.getState().requestPrint();
      return true;
    },
  },
  {
    id: 'shortcuts',
    group: 'help',
    label: s.shortcuts,
    bindings: [{ key: '?' }],
    needsScore: false,
    run: () => {
      useUi.getState().openPanel('shortcuts');
      return true;
    },
  },
  {
    // Guitar Pro 8 opens its palette with ⌘/Ctrl E; ⌘/Ctrl K as most applications do.
    id: 'command-palette',
    group: 'help',
    label: s.commandPalette,
    bindings: [
      { key: 'k', mod: true },
      { key: 'e', mod: true },
    ],
    needsScore: false,
    // Also from the palette's own field, to close it again.
    inTextFields: true,
    run: () => {
      const ui = useUi.getState();
      ui.setPanelOpen('palette', ui.panel !== 'palette');
      return true;
    },
  },
];

/** A printable character typed without ⌘/Ctrl or Alt: a "character key" shortcut. */
export function isCharacterBinding(binding: KeyBinding): boolean {
  return binding.key.length === 1 && binding.key !== ' ' && binding.mod !== true && binding.alt !== true;
}

export interface KeyInput {
  readonly key: string;
  readonly code: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

/** Whether a binding exists on a platform whose primary modifier is ⌘ (`apple`). */
export function onPlatform(binding: KeyBinding, apple: boolean): boolean {
  if (binding.platform !== undefined && (binding.platform === 'apple') !== apple) return false;
  return binding.ctrl !== true || apple;
}

/** Whether a key event matches a binding on a platform whose primary modifier is ⌘ (`apple`). */
export function matches(binding: KeyBinding, event: KeyInput, apple: boolean): boolean {
  if (!onPlatform(binding, apple)) return false;
  if (binding.code !== undefined) {
    if (event.code !== binding.code) return false;
  } else {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key !== binding.key) return false;
  }
  const primary = apple ? event.metaKey : event.ctrlKey;
  const other = apple ? event.ctrlKey : event.metaKey;
  if (
    primary !== (binding.mod === true) ||
    other !== (binding.ctrl === true) ||
    event.altKey !== (binding.alt === true)
  ) {
    return false;
  }
  // A printable character already says whether Shift was needed to type it (+, _, ?).
  const printable = binding.key.length === 1 && binding.key !== ' ' && !/[a-z0-9]/.test(binding.key);
  return printable || event.shiftKey === (binding.shift === true);
}

const KEY_NAMES: Readonly<Record<string, string>> = {
  ' ': 'Space',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Escape: 'Esc',
  Home: 'Home',
  End: 'End',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
};

/** How a binding is written in tooltips and the shortcut sheet: "⌘ ⇧ →", "Ctrl Alt ←", "⌃ ⌘ F". */
export function formatBinding(binding: KeyBinding, mod: string = modKey()): string {
  const parts: string[] = [];
  if (binding.ctrl === true) parts.push('⌃');
  if (binding.mod === true) parts.push(mod);
  if (binding.alt === true) parts.push(mod === '⌘' ? '⌥' : 'Alt');
  if (binding.shift === true) parts.push(mod === '⌘' ? '⇧' : 'Shift');
  parts.push(KEY_NAMES[binding.key] ?? (binding.key.length === 1 ? binding.key.toUpperCase() : binding.key));
  return parts.join(' ');
}

/** Keys set in the shortcut sheet in place of a shortcut's own, by shortcut (PLAT-036). */
export type KeyOverrides = Readonly<Record<string, readonly KeyBinding[]>>;

/** The keys of a shortcut: those set for it in the shortcut sheet, else its own. */
export function bindingsOf(
  shortcut: Shortcut,
  overrides: KeyOverrides = usePreferences.getState().keyBindings,
): readonly KeyBinding[] {
  return overrides[shortcut.id] ?? shortcut.bindings;
}

/** The bindings of a shortcut on this platform. */
export function platformBindings(
  shortcut: Shortcut,
  mod: string = modKey(),
  overrides: KeyOverrides = usePreferences.getState().keyBindings,
): readonly KeyBinding[] {
  return bindingsOf(shortcut, overrides).filter(binding => onPlatform(binding, mod === '⌘'));
}

/** The first binding of a shortcut on this platform, formatted, for tooltips. */
export function shortcutHint(id: string): string | undefined {
  const shortcut = SHORTCUTS.find(candidate => candidate.id === id);
  const binding = shortcut === undefined ? undefined : platformBindings(shortcut)[0];
  return binding === undefined ? undefined : formatBinding(binding);
}

/** Whether two bindings are the same keys. */
export function sameBinding(a: KeyBinding, b: KeyBinding): boolean {
  return (
    a.key === b.key &&
    (a.code ?? null) === (b.code ?? null) &&
    (a.mod === true) === (b.mod === true) &&
    (a.shift === true) === (b.shift === true) &&
    (a.alt === true) === (b.alt === true) &&
    (a.ctrl === true) === (b.ctrl === true) &&
    (a.platform ?? null) === (b.platform ?? null)
  );
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Fn', 'OS']);

/**
 * The binding a key press makes, as the shortcut sheet records it: ⌘ on Apple platforms, Ctrl
 * elsewhere, as the primary modifier; letters with Alt by their key code (⌥M types "µ"); a
 * modifier alone makes none.
 */
export function bindingFromKey(event: KeyInput, apple: boolean): KeyBinding | null {
  if (MODIFIER_KEYS.has(event.key)) return null;
  const letter = /^Key([A-Z])$/.exec(event.code);
  const byCode = event.altKey && letter !== null;
  const key = byCode
    ? (letter[1] ?? '').toLowerCase()
    : event.key.length === 1
      ? event.key.toLowerCase()
      : event.key;
  // A printable character already says whether Shift was needed to type it (+, _, ?).
  const printable = key.length === 1 && key !== ' ' && !/[a-z0-9]/.test(key);
  return {
    key,
    ...(byCode ? { code: event.code } : {}),
    ...((apple ? event.metaKey : event.ctrlKey) ? { mod: true } : {}),
    ...(event.shiftKey && !printable ? { shift: true } : {}),
    ...(event.altKey ? { alt: true } : {}),
    ...(apple && event.ctrlKey ? { ctrl: true } : {}),
  };
}

/**
 * The other shortcut, if any, that a binding already belongs to at the same moments: the editor's
 * own keys, while a score is edited, come before the others' and take nothing from them.
 */
export function shortcutUsing(
  binding: KeyBinding,
  except: string,
  overrides: KeyOverrides = usePreferences.getState().keyBindings,
): Shortcut | null {
  const editing = SHORTCUTS.find(shortcut => shortcut.id === except)?.editing === true;
  return (
    SHORTCUTS.find(
      shortcut =>
        shortcut.id !== except &&
        (shortcut.editing === true) === editing &&
        bindingsOf(shortcut, overrides).some(other => sameBinding(other, binding)),
    ) ?? null
  );
}
