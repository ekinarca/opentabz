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
import { clampZoom, useDocuments, type OpenDocument } from '../state/documents.ts';
import { clampSpeed, usePlayer } from '../state/player.ts';
import { usePractice } from '../state/practice.ts';
import { useUi } from '../state/ui.ts';
import { strings } from '../strings.ts';
import { pickFiles } from './open-actions.ts';
import { modKey } from './platform.ts';

export type ShortcutGroup = 'playback' | 'navigation' | 'selection' | 'view' | 'files' | 'help';

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
  /** Returns whether the key was handled (otherwise it keeps its usual meaning). */
  readonly run: () => boolean;
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

function clearSelection(): boolean {
  const player = usePlayer.getState();
  if (player.selection === null) return false;
  player.setSelection(null);
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

const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

/** The next zoom preset above or below `zoom`. */
export function zoomStep(zoom: number, direction: 1 | -1): number {
  if (direction > 0) return ZOOM_STEPS.find(step => step > zoom + 0.001) ?? 4;
  return [...ZOOM_STEPS].reverse().find(step => step < zoom - 0.001) ?? 0.25;
}

const s = strings.shortcuts.actions;

export const SHORTCUTS: readonly Shortcut[] = [
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

/** Whether a key event matches a binding on a platform whose primary modifier is ⌘ (`apple`). */
export function matches(binding: KeyBinding, event: KeyInput, apple: boolean): boolean {
  if (binding.code !== undefined) {
    if (event.code !== binding.code) return false;
  } else {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key !== binding.key) return false;
  }
  const primary = apple ? event.metaKey : event.ctrlKey;
  const other = apple ? event.ctrlKey : event.metaKey;
  if (primary !== (binding.mod === true) || other || event.altKey !== (binding.alt === true)) return false;
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

/** How a binding is written in tooltips and the shortcut sheet: "⌘ ⇧ →", "Ctrl Alt ←". */
export function formatBinding(binding: KeyBinding, mod: string = modKey()): string {
  const parts: string[] = [];
  if (binding.mod === true) parts.push(mod);
  if (binding.alt === true) parts.push(mod === '⌘' ? '⌥' : 'Alt');
  if (binding.shift === true) parts.push(mod === '⌘' ? '⇧' : 'Shift');
  parts.push(KEY_NAMES[binding.key] ?? (binding.key.length === 1 ? binding.key.toUpperCase() : binding.key));
  return parts.join(' ');
}

/** The first binding of a shortcut, formatted, for tooltips. */
export function shortcutHint(id: string): string | undefined {
  const binding = SHORTCUTS.find(shortcut => shortcut.id === id)?.bindings[0];
  return binding === undefined ? undefined : formatBinding(binding);
}
