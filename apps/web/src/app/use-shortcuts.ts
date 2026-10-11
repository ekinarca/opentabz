/**
 * Global keyboard shortcuts (documented in docs/SHORTCUTS.md). Browser shortcuts are only
 * overridden where OpenTabz offers the same action for the score (zoom, open).
 */
import { useEffect } from 'react';
import { findBarOccurrence, occurrence, resizeRangeByBar } from '../score-view/timeline-lookup.ts';
import { clampZoom, useDocuments } from '../state/documents.ts';
import { usePlayer } from '../state/player.ts';
import { pickFiles } from './open-actions.ts';
import { hasPrimaryModifier } from './platform.ts';
import { zoomStep } from './Workspace.tsx';

function zoomActive(change: (zoom: number) => number): boolean {
  const { docs, activeKey, updateView } = useDocuments.getState();
  const doc = docs.find(candidate => candidate.key === activeKey);
  if (doc === undefined) return false;
  updateView(doc.key, { zoom: clampZoom(change(doc.view.zoom)) });
  return true;
}

/** Roles whose widgets use Space or the arrow keys themselves. */
const KEYBOARD_ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
]);

/** Elements where Space and arrow keys keep their native meaning. */
function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName) ||
    KEYBOARD_ROLES.has(target.getAttribute('role') ?? '')
  );
}

function isTextField(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    (target instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'button'].includes(target.type))
  );
}

/** Moves playback to the start of the previous or next bar (in playback order). */
function stepBar(direction: 1 | -1): boolean {
  const player = usePlayer.getState();
  const timeline = player.timeline;
  if (timeline === null) return false;
  const index = findBarOccurrence(timeline, player.tick);
  const current = occurrence(timeline, index);
  if (current === null) return false;
  // "Previous" first returns to the start of the current bar when already inside it.
  const target =
    direction < 0 && player.tick - current.startTick > 240
      ? current
      : occurrence(timeline, Math.max(0, index + direction));
  if (target === null) return false;
  player.seek(target.startTick);
  return true;
}

/** Grows or shrinks the selection by a bar (Shift+→ / Shift+←); starts from the playing bar. */
function resizeSelection(direction: 1 | -1): boolean {
  const player = usePlayer.getState();
  if (player.timeline === null) return false;
  const range = resizeRangeByBar(player.timeline, player.selection, player.tick, direction);
  if (range !== player.selection) player.setSelection(range);
  return true;
}

/** Inside a dialog, menu or popover, keys belong to that layer. */
function insideLayer(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest('[role="dialog"], [role="menu"], [role="listbox"]') !== null
  );
}

function playerShortcut(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  if (useDocuments.getState().activeKey === null || insideLayer(event.target)) return false;
  if (event.key === 'Escape') {
    if (usePlayer.getState().selection === null || isTextField(event.target)) return false;
    usePlayer.getState().setSelection(null);
    return true;
  }
  if (isInteractive(event.target)) return false;
  switch (event.key) {
    case ' ':
      if (event.shiftKey) usePlayer.getState().stop();
      else usePlayer.getState().toggle();
      return true;
    case 'ArrowLeft':
      return event.shiftKey ? resizeSelection(-1) : stepBar(-1);
    case 'ArrowRight':
      return event.shiftKey ? resizeSelection(1) : stepBar(1);
    default:
      return false;
  }
}

export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (playerShortcut(event)) {
        event.preventDefault();
        return;
      }
      if (!hasPrimaryModifier(event) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'o' && !event.shiftKey) {
        event.preventDefault();
        pickFiles();
      } else if (key === '=' || key === '+') {
        if (zoomActive(zoom => zoomStep(zoom, 1))) event.preventDefault();
      } else if (key === '-' || key === '_') {
        if (zoomActive(zoom => zoomStep(zoom, -1))) event.preventDefault();
      } else if (key === '0') {
        if (zoomActive(() => 1)) event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
