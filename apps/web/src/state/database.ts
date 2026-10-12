/**
 * The app's one IndexedDB database on this device: music fonts of one's own (REND-241), the
 * recent scores with their files (LIB-005) and the edits not saved (EDIT-124). Every store is made in its one upgrade, so that each
 * part of the app finds the stores of the others, whichever opens the database first.
 */

const DATABASE = 'opentabz';
/** 1: music fonts. 2: recent scores and their files. 3: edits not saved. */
const VERSION = 3;

export const MUSIC_FONTS_STORE = 'musicFonts';
export const RECENT_STORE = 'recent';
export const FILES_STORE = 'files';
export const DRAFTS_STORE = 'drafts';

let opening: Promise<IDBDatabase> | null = null;

/** The database, made or brought up to date on first use; `unavailable` when it cannot open. */
export function openDatabase(unavailable: () => Error): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MUSIC_FONTS_STORE))
        db.createObjectStore(MUSIC_FONTS_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(RECENT_STORE))
        db.createObjectStore(RECENT_STORE, { keyPath: 'fingerprint' });
      if (!db.objectStoreNames.contains(FILES_STORE)) db.createObjectStore(FILES_STORE);
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      const db = request.result;
      // A newer version of the app, in another tab, brings the database up to date: let it.
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      reject(request.error ?? unavailable());
    };
  }).catch((error: unknown) => {
    opening = null;
    throw error;
  });
  return opening;
}
