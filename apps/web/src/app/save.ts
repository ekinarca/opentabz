/**
 * Saving a score as a Guitar Pro 7/8 file (EDIT-064), edited or not, and the guard that asks
 * before a score with changes not saved is closed (EDIT-123).
 */
import { create } from 'zustand';
import { getEngine } from '../engine/instance.ts';
import { useDocuments, type OpenDocument } from '../state/documents.ts';
import { afterEdits, anyDirty, editingOf, isDirty } from '../state/editing.ts';
import { strings } from '../strings.ts';
import { download, fileBase } from './download.ts';

/** The saved file's name: the document's own, as a .gp file. */
export function savedName(doc: OpenDocument): string {
  return `${fileBase(doc.source.name.replace(/\.[^.]+$/, ''))}.gp`;
}

/** Saves a document as it is once its edits are made; whether it was saved. */
export function saveDocument(key: string): Promise<boolean> {
  return afterEdits(key, async () => {
    const doc = useDocuments.getState().docs.find(candidate => candidate.key === key);
    if (doc === undefined) return false;
    try {
      const { bytes } = await getEngine().call('saveDocument', { docId: doc.engineId });
      const name = savedName(doc);
      download(new Uint8Array(bytes), name, 'application/octet-stream');
      useDocuments.getState().notify({
        title: strings.editing.saved(name),
        description: strings.editing.savedWhere,
        tone: 'info',
      });
      return true;
    } catch (error) {
      useDocuments.getState().notify({
        title: strings.editing.saveFailed,
        description: error instanceof Error ? error.message : String(error),
        tone: 'error',
      });
      return false;
    }
  });
}

interface CloseGuardState {
  /** The document whose closing waits for an answer: save, close anyway, or keep it open. */
  readonly pending: string | null;
}

export const useCloseGuard = create<CloseGuardState>(() => ({ pending: null }));

/** Closes a document, or first asks when it has changes not saved. */
export function requestClose(key: string): void {
  if (isDirty(editingOf(key))) useCloseGuard.setState({ pending: key });
  else useDocuments.getState().close(key);
}

/** Leaving the page with changes not saved: the browser asks first. */
export function guardUnload(event: BeforeUnloadEvent): void {
  if (!anyDirty()) return;
  event.preventDefault();
}
