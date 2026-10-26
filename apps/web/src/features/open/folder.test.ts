import { describe, expect, it } from 'vitest';
import {
  folderScores,
  isScoreFileName,
  MAX_FOLDER_DEPTH,
  MAX_FOLDER_SCORES,
  pickedFolderFiles,
  readDroppedFolder,
  type DirectoryEntryLike,
  type EntryLike,
  type FileEntryLike,
} from './folder.ts';

function file(name: string, relative = ''): File {
  const made = new File(['x'], name);
  if (relative.length > 0) Object.defineProperty(made, 'webkitRelativePath', { value: relative });
  return made;
}

function fileEntry(name: string, unreadable = false): FileEntryLike {
  return {
    name,
    isFile: true,
    isDirectory: false,
    file: (success, failure) => {
      if (unreadable) failure?.(new Error('gone'));
      else success(file(name));
    },
  };
}

/** A folder whose reader hands its entries over in batches of two, as browsers do in batches. */
function folder(name: string, entries: EntryLike[]): DirectoryEntryLike {
  return {
    name,
    isFile: false,
    isDirectory: true,
    createReader: () => {
      let next = 0;
      return {
        readEntries: success => {
          const batch = entries.slice(next, next + 2);
          next += batch.length;
          success(batch);
        },
      };
    },
  };
}

describe('opening a folder', () => {
  it('knows a score by its extension, whatever its case, and passes hidden files over', () => {
    expect(isScoreFileName('Song.gp')).toBe(true);
    expect(isScoreFileName('Song.GP5')).toBe(true);
    expect(isScoreFileName('song.musicxml')).toBe(true);
    expect(isScoreFileName('song.mxl')).toBe(true);
    expect(isScoreFileName('song.capx')).toBe(true);
    expect(isScoreFileName('song.atex')).toBe(true);
    expect(isScoreFileName('song.pdf')).toBe(false);
    expect(isScoreFileName('song.mp3')).toBe(false);
    expect(isScoreFileName('song.mid')).toBe(false);
    expect(isScoreFileName('gp')).toBe(false);
    expect(isScoreFileName('._Song.gp')).toBe(false);
    expect(isScoreFileName('.gp')).toBe(false);
  });

  it('opens the scores in the order of their paths, numbers counted as numbers', () => {
    const found = [
      { path: '10 Outro.gp', file: file('10 Outro.gp') },
      { path: 'cover.jpg', file: file('cover.jpg') },
      { path: '2 Verse.gp', file: file('2 Verse.gp') },
      { path: 'b/1 Intro.gp5', file: file('1 Intro.gp5') },
      { path: '.trash/Old.gp', file: file('Old.gp') },
      { path: 'a/1 Intro.gp5', file: file('1 Intro.gp5') },
    ];
    const { files, skipped } = folderScores(found);
    expect(files).toEqual([found[2]?.file, found[0]?.file, found[5]?.file, found[3]?.file]);
    expect(skipped).toBe(0);
  });

  it(`opens at most ${MAX_FOLDER_SCORES} scores and counts the others`, () => {
    const found = Array.from({ length: MAX_FOLDER_SCORES + 3 }, (_, index) => ({
      path: `${index + 1}.gp`,
      file: file(`${index + 1}.gp`),
    }));
    const { files, skipped } = folderScores(found);
    expect(files).toHaveLength(MAX_FOLDER_SCORES);
    expect(files[0]?.name).toBe('1.gp');
    expect(files.at(-1)?.name).toBe(`${MAX_FOLDER_SCORES}.gp`);
    expect(skipped).toBe(3);
  });

  it('takes the folder picker’s paths from inside the folder chosen', () => {
    const picked = [file('a.gp', 'Songs/Album/a.gp'), file('b.gp', 'Songs/b.gp')];
    const { name, found } = pickedFolderFiles(picked);
    expect(name).toBe('Songs');
    expect(found.map(entry => entry.path)).toEqual(['Album/a.gp', 'b.gp']);
    expect(pickedFolderFiles([]).name).toBe('');
  });

  it('reads a dropped folder and the folders inside it, batch after batch', async () => {
    const dropped = folder('Songs', [
      fileEntry('b.gp'),
      fileEntry('notes.txt'),
      folder('Album', [fileEntry('c.gpx'), fileEntry('d.pdf'), fileEntry('e.gp5')]),
      folder('.git', [fileEntry('f.gp')]),
      fileEntry('.hidden.gp'),
      fileEntry('gone.gp', true),
      fileEntry('a.gp'),
    ]);
    const found = await readDroppedFolder(dropped);
    expect(found.map(entry => entry.path)).toEqual(['b.gp', 'Album/c.gpx', 'Album/e.gp5', 'a.gp']);
    expect(folderScores(found).files.map(entry => entry.name)).toEqual(['a.gp', 'c.gpx', 'e.gp5', 'b.gp']);
  });

  it(`enters folders ${MAX_FOLDER_DEPTH} deep at most`, async () => {
    let deepest: DirectoryEntryLike = folder('deepest', [fileEntry('deep.gp')]);
    for (let level = 0; level < MAX_FOLDER_DEPTH; level++) deepest = folder(`level ${level}`, [deepest]);
    expect(await readDroppedFolder(folder('top', [fileEntry('top.gp'), deepest]))).toEqual([
      { path: 'top.gp', file: expect.any(File) as File },
    ]);
  });
});
