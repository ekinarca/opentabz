/**
 * Edits not saved, kept on this device (EDIT-061, EDIT-124): a document's file as it was opened
 * and the edits made to it, written as they are made; offered back after a crash, a reload or a
 * closed tab, and forgotten once the document is saved, undone back to as it was, or closed
 * without saving. A document open in another tab holds its draft, which is not offered here.
 */
import type { EditCommand } from '@opentabz/core/shared';
import { DRAFTS_STORE, openDatabase } from './database.ts';

export interface Draft {
  /** The document's own: a draft per open document. */
  readonly id: string;
  /** The file's name, and the score's title. */
  readonly name: string;
  readonly title: string;
  /** The file as it was opened. */
  readonly bytes: ArrayBuffer;
  /** A new score (COMP-001), not a file. */
  readonly blank: boolean;
  /** The edits made, first to last; then those undone, the last undone last. */
  readonly done: readonly (readonly EditCommand[])[];
  readonly undone: readonly (readonly EditCommand[])[];
  /** When it was written (ms since 1970). */
  readonly writtenAt: number;
}

/** Whether something read back is a draft (its edits are trusted as the app wrote them). */
export function isDraft(value: unknown): value is Draft {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const steps = (list: unknown): boolean => Array.isArray(list) && list.every(step => Array.isArray(step));
  return (
    typeof record['id'] === 'string' &&
    typeof record['name'] === 'string' &&
    typeof record['title'] === 'string' &&
    record['bytes'] instanceof ArrayBuffer &&
    typeof record['blank'] === 'boolean' &&
    steps(record['done']) &&
    steps(record['undone']) &&
    typeof record['writtenAt'] === 'number'
  );
}

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    };
  });
}

function database(): Promise<IDBDatabase> {
  return openDatabase(() => new Error('IndexedDB is not available.'));
}

/** The name of the lock an open document holds on its draft. */
function lockName(id: string): string {
  return `opentabz-draft-${id}`;
}

const held = new Map<string, () => void>();

/** Holds a document's draft while it is open here: another tab does not offer it back. */
export function holdDraft(id: string): void {
  if (held.has(id) || !('locks' in navigator)) return;
  void navigator.locks.request(
    lockName(id),
    () =>
      new Promise<void>(release => {
        held.set(id, release);
      }),
  );
}

/** Lets go of a document's draft (it is closed). */
export function releaseDraft(id: string): void {
  held.get(id)?.();
  held.delete(id);
}

/** Whether a draft's document is open in a tab (this one or another). */
async function isHeld(id: string): Promise<boolean> {
  if (held.has(id)) return true;
  if (!('locks' in navigator)) return false;
  const state = await navigator.locks.query();
  return (state.held ?? []).some(lock => lock.name === lockName(id));
}

/** Keeps a document's draft, in place of the one before. */
export async function writeDraft(draft: Draft): Promise<void> {
  try {
    const db = await database();
    await done(db.transaction(DRAFTS_STORE, 'readwrite').objectStore(DRAFTS_STORE).put(draft));
  } catch {
    // Storage blocked or full: the edits are simply not kept.
  }
}

export async function deleteDraft(id: string): Promise<void> {
  try {
    const db = await database();
    await done(db.transaction(DRAFTS_STORE, 'readwrite').objectStore(DRAFTS_STORE).delete(id));
  } catch {
    // Nothing was kept.
  }
}

/** The drafts no open document holds, the latest first: edits to offer back. */
export async function orphanDrafts(): Promise<Draft[]> {
  try {
    const db = await database();
    const records: unknown[] = await done(db.transaction(DRAFTS_STORE).objectStore(DRAFTS_STORE).getAll());
    const drafts = records.filter(isDraft);
    const free = await Promise.all(drafts.map(async draft => !(await isHeld(draft.id))));
    return drafts.filter((_, index) => free[index]).sort((a, b) => b.writtenAt - a.writtenAt);
  } catch {
    return [];
  }
}
