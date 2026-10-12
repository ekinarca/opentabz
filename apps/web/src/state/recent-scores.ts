/**
 * The scores opened lately (LIB-005), kept on this device only, in IndexedDB: what the home page
 * lists to open again, and what reopens the last session's scores (UX-028). Nothing leaves the
 * device; turning "Remember recent scores" off forgets them all. Storage that is blocked or full
 * simply keeps nothing.
 */
import { create } from 'zustand';

export interface RecentScore {
  /** SHA-256 of the file: the same file opened again is one entry. */
  readonly fingerprint: string;
  /** The file's name. */
  readonly name: string;
  readonly title: string;
  readonly artist: string;
  /** When it was last opened (ms since 1970). */
  readonly openedAt: number;
  /** The file's size in bytes. */
  readonly size: number;
}

/** How many scores are kept, and how many bytes they may take together. */
export const MAX_RECENT = 20;
export const MAX_RECENT_BYTES = 64 * 1024 * 1024;

/** The latest first, as many as both limits allow; the rest to forget. */
export function keptRecent(
  entries: readonly RecentScore[],
  limit: number = MAX_RECENT,
  maxBytes: number = MAX_RECENT_BYTES,
): { readonly keep: RecentScore[]; readonly drop: RecentScore[] } {
  const keep: RecentScore[] = [];
  const drop: RecentScore[] = [];
  let bytes = 0;
  for (const entry of [...entries].sort((a, b) => b.openedAt - a.openedAt)) {
    if (keep.length < limit && bytes + entry.size <= maxBytes) {
      keep.push(entry);
      bytes += entry.size;
    } else drop.push(entry);
  }
  return { keep, drop };
}

/** Whether something read back is a recent score's record. */
export function isRecentScore(value: unknown): value is RecentScore {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['fingerprint'] === 'string' &&
    typeof record['name'] === 'string' &&
    typeof record['title'] === 'string' &&
    typeof record['artist'] === 'string' &&
    typeof record['openedAt'] === 'number' &&
    typeof record['size'] === 'number'
  );
}

const DATABASE = 'opentabz';
const VERSION = 1;
/** Each score's record, by fingerprint. */
const RECENT = 'recent';
/** Each score's bytes, by fingerprint: read only to open it. */
const FILES = 'files';

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

function finished(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onabort = transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    };
  });
}

let opening: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECENT)) db.createObjectStore(RECENT, { keyPath: 'fingerprint' });
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB is not available.'));
    };
  }).catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}

/** The scores kept, the latest first; none when storage is not available. */
export async function listRecent(): Promise<RecentScore[]> {
  try {
    const db = await database();
    const records: unknown[] = await done(db.transaction(RECENT).objectStore(RECENT).getAll());
    return records.filter(isRecentScore).sort((a, b) => b.openedAt - a.openedAt);
  } catch {
    return [];
  }
}

/** Keeps a score just opened, and forgets the oldest beyond the limits. */
export async function rememberScore(entry: RecentScore, bytes: ArrayBuffer): Promise<void> {
  try {
    const db = await database();
    const others = (await listRecent()).filter(other => other.fingerprint !== entry.fingerprint);
    const { drop } = keptRecent([entry, ...others]);
    const transaction = db.transaction([RECENT, FILES], 'readwrite');
    transaction.objectStore(RECENT).put(entry);
    transaction.objectStore(FILES).put(bytes, entry.fingerprint);
    for (const old of drop) {
      transaction.objectStore(RECENT).delete(old.fingerprint);
      transaction.objectStore(FILES).delete(old.fingerprint);
    }
    await finished(transaction);
  } catch {
    // Storage blocked or full: the score is simply not remembered.
  }
}

/** A kept score's bytes, or null when it is not kept (any more). */
export async function recentBytes(fingerprint: string): Promise<ArrayBuffer | null> {
  try {
    const db = await database();
    const bytes: unknown = await done(db.transaction(FILES).objectStore(FILES).get(fingerprint));
    return bytes instanceof ArrayBuffer ? bytes : null;
  } catch {
    return null;
  }
}

/** Forgets every score kept. */
export async function forgetRecent(): Promise<void> {
  try {
    const db = await database();
    const transaction = db.transaction([RECENT, FILES], 'readwrite');
    transaction.objectStore(RECENT).clear();
    transaction.objectStore(FILES).clear();
    await finished(transaction);
  } catch {
    // Nothing could be kept either.
  }
}

interface RecentScoresState {
  /** The scores kept, the latest first. */
  readonly list: readonly RecentScore[];
  /** Reads the list again. */
  readonly refresh: () => Promise<void>;
  readonly remember: (entry: RecentScore, bytes: ArrayBuffer) => Promise<void>;
  readonly clear: () => Promise<void>;
}

export const useRecentScores = create<RecentScoresState>(set => ({
  list: [],
  refresh: async () => {
    set({ list: await listRecent() });
  },
  remember: async (entry, bytes) => {
    await rememberScore(entry, bytes);
    set({ list: await listRecent() });
  },
  clear: async () => {
    await forgetRecent();
    set({ list: [] });
  },
}));
