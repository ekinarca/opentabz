/**
 * Global keyboard shortcuts (documented in docs/SHORTCUTS.md). Browser shortcuts are only
 * overridden where OpenTabz offers the same action for the score (zoom, open).
 */
import { useEffect } from 'react';
import { clampZoom, useDocuments } from '../state/documents.ts';
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

export function useShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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
