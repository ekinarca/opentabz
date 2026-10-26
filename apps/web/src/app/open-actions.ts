/**
 * Entry points into the open pipeline shared by buttons, shortcuts, drag-and-drop and paste.
 */
import { folderScores, pickedFolderFiles, type FolderFile } from '../features/open/folder.ts';
import { fileSource, textSource, urlSource } from '../features/open/intake.ts';
import { useDocuments } from '../state/documents.ts';
import { strings } from '../strings.ts';

let picker: HTMLInputElement | null = null;
let folderPicker: HTMLInputElement | null = null;

/** Opens the system file picker. Any file can be chosen: formats are detected by content. */
export function pickFiles(): void {
  if (picker === null) {
    picker = document.createElement('input');
    picker.type = 'file';
    picker.multiple = true;
    picker.style.display = 'none';
    picker.addEventListener('change', () => {
      const files = picker?.files ? [...picker.files] : [];
      if (picker !== null) picker.value = '';
      if (files.length > 0) void useDocuments.getState().open(files.map(fileSource));
    });
    document.body.append(picker);
  }
  picker.click();
}

/** Whether this browser can pick a folder (phones mostly cannot). */
export function canPickFolder(): boolean {
  return typeof document !== 'undefined' && 'webkitdirectory' in document.createElement('input');
}

/** Opens the system folder picker: the scores in the folder chosen open (OPEN-008). */
export function pickFolder(): void {
  if (folderPicker === null) {
    folderPicker = document.createElement('input');
    folderPicker.type = 'file';
    folderPicker.webkitdirectory = true;
    folderPicker.style.display = 'none';
    folderPicker.addEventListener('change', () => {
      const files = folderPicker?.files ? [...folderPicker.files] : [];
      if (folderPicker !== null) folderPicker.value = '';
      const { name, found } = pickedFolderFiles(files);
      openFolder(name, found);
    });
    document.body.append(folderPicker);
  }
  folderPicker.click();
}

/** Opens the scores among the files of a folder, or says there are none or too many. */
export function openFolder(name: string, found: readonly FolderFile[]): void {
  const { files, skipped } = folderScores(found);
  const { notify } = useDocuments.getState();
  if (files.length === 0) {
    const text = strings.drop.folderEmpty(name);
    notify({ title: text.title, description: text.explanation, tone: 'warning' });
    return;
  }
  if (skipped > 0) {
    const text = strings.drop.folderTooMany(name, files.length, skipped);
    notify({ title: text.title, description: text.explanation, tone: 'info' });
  }
  openFiles(files);
}

export function openFiles(files: readonly File[]): void {
  if (files.length > 0) void useDocuments.getState().open(files.map(fileSource));
}

export function openPastedText(text: string, name: string): void {
  if (text.trim().length > 0) void useDocuments.getState().open([textSource(name, text)]);
}

export function openUrl(url: URL): void {
  void useDocuments.getState().open([urlSource(url)]);
}
