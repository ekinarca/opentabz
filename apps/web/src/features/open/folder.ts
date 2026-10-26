/**
 * Opening a whole folder (OPEN-008): the scores in a folder dropped on the window or chosen in
 * the folder picker, and in the folders inside it. Files of other kinds are passed over by their
 * extension (a folder of songs often holds PDFs, audio and pictures too); the scores open in the
 * order of their paths, numbers counted as numbers ("2 Verse" before "10 Outro").
 */
import { openableExtensions } from '@opentabz/core/shared';

/** More than this many scores open only the first ones: each one is a tab and a layout. */
export const MAX_FOLDER_SCORES = 50;

/** Folders inside folders are read this deep. */
export const MAX_FOLDER_DEPTH = 8;

/** A file found in a folder, with its path inside the folder ("Album/01 Intro.gp"). */
export interface FolderFile {
  readonly path: string;
  readonly file: File;
}

export interface FolderScores {
  /** The scores to open, in order, at most MAX_FOLDER_SCORES. */
  readonly files: readonly File[];
  /** Scores found beyond MAX_FOLDER_SCORES, not opened. */
  readonly skipped: number;
}

const SCORE_EXTENSIONS: ReadonlySet<string> = new Set(openableExtensions());

/** Whether a file found in a folder is one to open: a score's extension, not a hidden file. */
export function isScoreFileName(name: string): boolean {
  if (name.startsWith('.')) return false;
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return false;
  return SCORE_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

const byPath = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** The scores among the files of a folder, in the order of their paths. */
export function folderScores(found: readonly FolderFile[]): FolderScores {
  const scores = found
    .filter(
      entry => isScoreFileName(entry.file.name) && !entry.path.split('/').some(part => part.startsWith('.')),
    )
    .sort((a, b) => byPath.compare(a.path, b.path));
  return {
    files: scores.slice(0, MAX_FOLDER_SCORES).map(entry => entry.file),
    skipped: Math.max(0, scores.length - MAX_FOLDER_SCORES),
  };
}

/** The files the folder picker returns, with their paths inside the folder chosen. */
export function pickedFolderFiles(files: readonly File[]): { name: string; found: FolderFile[] } {
  const found = files.map(file => {
    const relative = file.webkitRelativePath || file.name;
    // The picker's paths start with the folder chosen: "Songs/Album/01 Intro.gp".
    const slash = relative.indexOf('/');
    return { path: slash < 0 ? relative : relative.slice(slash + 1), file };
  });
  const first = files[0]?.webkitRelativePath ?? '';
  const name = first.includes('/') ? first.slice(0, first.indexOf('/')) : '';
  return { name, found };
}

/** The parts of the File and Directory Entries API a dropped folder is read with. */
export interface EntryLike {
  readonly name: string;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
}

export interface FileEntryLike extends EntryLike {
  file(success: (file: File) => void, failure?: (error: unknown) => void): void;
}

export interface DirectoryEntryLike extends EntryLike {
  createReader(): {
    readEntries(success: (entries: EntryLike[]) => void, failure?: (error: unknown) => void): void;
  };
}

function readAll(directory: DirectoryEntryLike): Promise<EntryLike[]> {
  const reader = directory.createReader();
  const entries: EntryLike[] = [];
  // Browsers hand the entries over in batches (Chromium: 100 at a time) until an empty one.
  return new Promise(resolve => {
    const next = () => {
      reader.readEntries(
        batch => {
          if (batch.length === 0) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          next();
        },
        () => {
          resolve(entries);
        },
      );
    };
    next();
  });
}

function fileOf(entry: FileEntryLike): Promise<File | null> {
  return new Promise(resolve => {
    entry.file(resolve, () => {
      resolve(null);
    });
  });
}

/**
 * Every file in a dropped folder and the folders inside it, with its path. Folders and files that
 * cannot be read are passed over; hidden folders are not entered.
 */
export async function readDroppedFolder(directory: DirectoryEntryLike, depth = 0): Promise<FolderFile[]> {
  const found: FolderFile[] = [];
  for (const entry of await readAll(directory)) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory) {
      if (depth + 1 >= MAX_FOLDER_DEPTH) continue;
      const inner = await readDroppedFolder(entry as DirectoryEntryLike, depth + 1);
      found.push(...inner.map(item => ({ path: `${entry.name}/${item.path}`, file: item.file })));
    } else if (entry.isFile && isScoreFileName(entry.name)) {
      const file = await fileOf(entry as FileEntryLike);
      if (file !== null) found.push({ path: entry.name, file });
    }
  }
  return found;
}
