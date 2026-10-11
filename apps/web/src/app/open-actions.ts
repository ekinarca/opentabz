/**
 * Entry points into the open pipeline shared by buttons, shortcuts, drag-and-drop and paste.
 */
import { fileSource, textSource, urlSource } from '../features/open/intake.ts';
import { useDocuments } from '../state/documents.ts';

let picker: HTMLInputElement | null = null;

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

export function openFiles(files: readonly File[]): void {
  if (files.length > 0) void useDocuments.getState().open(files.map(fileSource));
}

export function openPastedText(text: string, name: string): void {
  if (text.trim().length > 0) void useDocuments.getState().open([textSource(name, text)]);
}

export function openUrl(url: URL): void {
  void useDocuments.getState().open([urlSource(url)]);
}
