/**
 * Window-wide intake: drag-and-drop anywhere, paste of files or text, and `?url=` deep links.
 */
import { useEffect, useState } from 'react';
import { parseHttpUrl } from '../features/open/intake.ts';
import { useDocuments } from '../state/documents.ts';
import { strings } from '../strings.ts';
import { openFiles, openPastedText, openUrl } from './open-actions.ts';

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

/** Splits dropped items into files and folders (folders cannot be opened as scores). */
function droppedFiles(transfer: DataTransfer): { files: File[]; folders: string[] } {
  const files: File[] = [];
  const folders: string[] = [];
  for (const item of [...transfer.items]) {
    if (item.kind !== 'file') continue;
    const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
    if (entry?.isDirectory === true) {
      folders.push(entry.name);
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
      const { files, folders } = droppedFiles(event.dataTransfer);
      for (const folder of folders) {
        const text = strings.drop.folder(folder);
        useDocuments.getState().notify({ title: text.title, description: text.explanation, tone: 'warning' });
      }
      openFiles(files);
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
