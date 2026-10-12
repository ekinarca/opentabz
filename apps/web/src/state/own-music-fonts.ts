/**
 * Music fonts of one's own (REND-241): any SMuFL font, its file (.otf, .ttf or WOFF 1.0, which
 * exports can draw from) and its metadata (.json) chosen together, checked, and kept in this
 * browser's IndexedDB under an id made from the font's bytes. Nothing leaves the device.
 */
import { isSmuflMetadata, OWN_MUSIC_FONT_PREFIX, type SmuflMetadataJson } from '@opentabz/core/shared';
import { create } from 'zustand';
import { strings } from '../strings.ts';

export interface OwnMusicFont {
  readonly id: string;
  /** As the metadata names it, else after its file. */
  readonly name: string;
  readonly font: ArrayBuffer;
  readonly metadata: SmuflMetadataJson;
}

const DATABASE = 'opentabz';
const STORE = 'musicFonts';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('The browser’s storage could not be opened.'));
    };
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(database.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('The browser’s storage failed.'));
      };
    });
  } finally {
    database.close();
  }
}

function isOwnMusicFont(value: unknown): value is OwnMusicFont {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<Record<keyof OwnMusicFont, unknown>>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    record.font instanceof ArrayBuffer &&
    isSmuflMetadata(record.metadata)
  );
}

export async function getOwnMusicFont(id: string): Promise<OwnMusicFont | null> {
  const value: unknown = await transact('readonly', store => store.get(id));
  return isOwnMusicFont(value) ? value : null;
}

async function listOwnMusicFonts(): Promise<{ readonly id: string; readonly name: string }[]> {
  const values: unknown[] = await transact('readonly', store => store.getAll());
  return values
    .filter(isOwnMusicFont)
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface OwnMusicFontsState {
  /** One's own fonts, by name; loaded on first use. */
  readonly fonts: readonly { readonly id: string; readonly name: string }[];
  readonly refresh: () => Promise<void>;
}

export const useOwnMusicFonts = create<OwnMusicFontsState>(set => ({
  fonts: [],
  refresh: async () => {
    try {
      set({ fonts: await listOwnMusicFonts() });
    } catch {
      // No storage (private mode, blocked): no fonts of one's own.
      set({ fonts: [] });
    }
  },
}));

export class OwnMusicFontError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'OwnMusicFontError';
  }
}

async function hashOf(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest.subarray(0, 8)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** The code points every SMuFL font draws: the treble clef and the black notehead. */
const SMUFL_PROBES = [0xe050, 0xe0a4];

/**
 * Checks a font file and its metadata, chosen together, and keeps them; returns the font's id.
 * The font must be one exports can draw from (.otf, .ttf or WOFF 1.0) and hold SMuFL symbols.
 */
export async function addOwnMusicFont(files: readonly File[]): Promise<string> {
  const s = strings.stylesheet.ownFonts;
  const json = files.filter(file => /\.json$/i.test(file.name));
  const fonts = files.filter(file => !/\.json$/i.test(file.name));
  const [metadataFile] = json;
  const [fontFile] = fonts;
  if (json.length !== 1 || fonts.length !== 1 || metadataFile === undefined || fontFile === undefined)
    throw new OwnMusicFontError(s.chooseBoth);
  let metadata: unknown;
  try {
    metadata = JSON.parse(await metadataFile.text());
  } catch {
    throw new OwnMusicFontError(s.notMetadata(metadataFile.name));
  }
  if (!isSmuflMetadata(metadata)) throw new OwnMusicFontError(s.notMetadata(metadataFile.name));
  const font = await fontFile.arrayBuffer();
  // Exports draw the symbols from the font's outlines: read them now, once.
  const { readOutlines } = await import('@opentabz/core/print');
  try {
    const outlines = readOutlines(new Uint8Array(font));
    if (SMUFL_PROBES.some(codePoint => outlines.glyph(codePoint) === undefined))
      throw new OwnMusicFontError(s.notSmufl(fontFile.name));
  } catch (error) {
    if (error instanceof OwnMusicFontError) throw error;
    throw new OwnMusicFontError(
      s.notReadable(fontFile.name, error instanceof Error ? error.message : String(error)),
    );
  }
  const named = (metadata as { fontName?: unknown }).fontName;
  const name =
    typeof named === 'string' && named.trim().length > 0
      ? named.trim()
      : fontFile.name.replace(/\.[^.]+$/, '');
  const id = `${OWN_MUSIC_FONT_PREFIX}${await hashOf(font)}`;
  const record: OwnMusicFont = { id, name, font, metadata };
  await transact('readwrite', store => store.put(record));
  await useOwnMusicFonts.getState().refresh();
  return id;
}

export async function deleteOwnMusicFont(id: string): Promise<void> {
  await transact('readwrite', store => store.delete(id));
  await useOwnMusicFonts.getState().refresh();
}
