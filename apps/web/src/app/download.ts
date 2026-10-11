/**
 * Saving a file the app made (an export) to the device, with nothing sent anywhere: the bytes go
 * to a blob URL and an anchor with `download` hands them to the browser.
 */

/** Characters no file system takes in a name. */
const RESERVED = /[\\/:*?"<>|]+/g;

/** A file name from a title: reserved and control characters replaced, trimmed, never empty. */
export function fileName(title: string, extension: string, fallback = 'Untitled'): string {
  const printable = Array.from(title, char => ((char.codePointAt(0) ?? 0) < 32 ? ' ' : char)).join('');
  const base = printable.replace(RESERVED, '-').replace(/\s+/g, ' ').trim().replace(/^\.+/, '');
  return `${base === '' ? fallback : base}.${extension}`;
}

export function download(bytes: Uint8Array, name: string, type: string): void {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // The browser has taken the file by then; the URL is not needed after.
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);
}
