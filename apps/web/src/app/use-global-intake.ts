/**
 * Window-wide intake: drag-and-drop of files and folders anywhere, paste of files or text, and
 * `?url=` deep links.
 */
import { useEffect, useState } from 'react';
import { readDroppedFolder, type DirectoryEntryLike } from '../features/open/folder.ts';
import { parseHttpUrl } from '../features/open/intake.ts';
import { openFiles, openFolder, openPastedText, openUrl } from './open-actions.ts';
import { consumeLaunchedFiles, takeSharedFiles, type LaunchQueue } from './pwa.ts';

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

/**
 * Splits dropped items into files and folders. Entries must be taken while the drop event is
 * dispatched; the folders are read afterwards.
 */
function droppedItems(transfer: DataTransfer): { files: File[]; folders: DirectoryEntryLike[] } {
  const files: File[] = [];
  const folders: DirectoryEntryLike[] = [];
  for (const item of [...transfer.items]) {
    if (item.kind !== 'file') continue;
    const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
    if (entry?.isDirectory === true) {
      folders.push(entry as FileSystemDirectoryEntry);
      continue;
    }
    const file = item.getAsFile();
    if (file !== null) files.push(file);
  }
  return { files, folders };
}

/** Returns whether files are currently being dragged over the window. */
export function useGlobalIntake(): boolean {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let depth = 0;
    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event) || event.dataTransfer === null) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const { files, folders } = droppedItems(event.dataTransfer);
      openFiles(files);
      void (async () => {
        for (const folder of folders) openFolder(folder.name, await readDroppedFolder(folder));
      })();
    };
    const onPaste = (event: ClipboardEvent) => {
      if (isEditable(event.target) || event.clipboardData === null) return;
      const files = [...event.clipboardData.files];
      if (files.length > 0) {
        event.preventDefault();
        openFiles(files);
        return;
      }
      const text = event.clipboardData.getData('text/plain');
      const url = parseHttpUrl(text);
      event.preventDefault();
      if (url !== null && !text.includes('\n')) openUrl(url);
      else openPastedText(text, 'Pasted text');
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    document.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
      document.removeEventListener('paste', onPaste);
    };
  }, []);

  // Files shared to the installed app (OPEN-007), and those the system opens it with (OPEN-006).
  useEffect(() => {
    const shared = Number.parseInt(new URLSearchParams(window.location.search).get('shared') ?? '', 10);
    if (shared > 0) {
      void takeSharedFiles(shared).then(files => {
        if (files.length > 0) openFiles(files);
      });
      window.history.replaceState(null, '', window.location.pathname);
    }
    const queue =
      'launchQueue' in window ? (window as unknown as { launchQueue: LaunchQueue }).launchQueue : undefined;
    consumeLaunchedFiles(queue, openFiles);
  }, []);

  useEffect(() => {
    const parameter = new URLSearchParams(window.location.search).get('url');
    if (parameter === null) return;
    const url = parseHttpUrl(parameter);
    if (url !== null) openUrl(url);
    // The deep link has been consumed; keep the address bar clean.
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  return dragging;
}
