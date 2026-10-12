/**
 * Turning files, pasted text and URLs into bytes for the engine. Failures before the engine is
 * involved (unreadable files, downloads) become typed `OpenError`s like every other failure.
 */
import type { OpenError } from '@opentabz/core/shared';

/** Same limit as the engine (packages/core MAX_FILE_BYTES). */
export const MAX_INTAKE_BYTES = 256 * 1024 * 1024;

export type IntakeResult =
  | { readonly ok: true; readonly name: string; readonly bytes: ArrayBuffer }
  | { readonly ok: false; readonly error: OpenError };

export interface IntakeSource {
  readonly name: string;
  readonly load: () => Promise<IntakeResult>;
  /** A new score (COMP-001): not a file to open again from the recent scores. */
  readonly blank?: boolean;
}

function error(code: OpenError['code'], fileName: string, byteLength: number, detail: string): IntakeResult {
  return {
    ok: false,
    error: {
      code,
      fileName,
      byteLength,
      format: null,
      formatVersion: null,
      extensionMismatch: false,
      position: null,
      detail,
    },
  };
}

export function fileSource(file: File): IntakeSource {
  return {
    name: file.name,
    load: async () => {
      if (file.size > MAX_INTAKE_BYTES) {
        return error(
          'too-large',
          file.name,
          file.size,
          `The file is ${file.size} bytes; the limit is ${MAX_INTAKE_BYTES}.`,
        );
      }
      try {
        return { ok: true, name: file.name, bytes: await file.arrayBuffer() };
      } catch (cause) {
        const detail = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
        return error('read-failed', file.name, file.size, detail);
      }
    },
  };
}

export function textSource(name: string, text: string): IntakeSource {
  return {
    name,
    load: () => {
      const bytes = new TextEncoder().encode(text);
      return Promise.resolve({
        ok: true,
        name,
        bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      });
    },
  };
}

/** Parses user input into an http(s) URL, or returns null. */
export function parseHttpUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/** A file name for downloaded bytes: Content-Disposition first, then the URL path. */
export function nameFromDownload(url: URL, contentDisposition: string | null): string {
  if (contentDisposition !== null) {
    const extended = /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/.exec(contentDisposition);
    if (extended?.[1] !== undefined) {
      try {
        return decodeURIComponent(extended[1].trim());
      } catch {
        // fall through to the plain parameter
      }
    }
    const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
    if (plain?.[1] !== undefined) return plain[1].trim();
  }
  const segment = url.pathname
    .split('/')
    .filter(part => part.length > 0)
    .pop();
  if (segment !== undefined) {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }
  return url.hostname;
}

export function urlSource(url: URL): IntakeSource {
  const fallbackName = nameFromDownload(url, null);
  return {
    name: fallbackName,
    load: async () => {
      let response: Response;
      try {
        response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          redirect: 'follow',
        });
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        return error(
          'network',
          fallbackName,
          0,
          `Request to ${url.origin} failed (${detail}). The site may not allow cross-origin downloads (CORS).`,
        );
      }
      const name = nameFromDownload(url, response.headers.get('content-disposition'));
      if (!response.ok)
        return error(
          'network',
          name,
          0,
          `${url.href} answered HTTP ${response.status} ${response.statusText}.`.trim(),
        );
      const declared = Number(response.headers.get('content-length') ?? '0');
      if (declared > MAX_INTAKE_BYTES)
        return error('too-large', name, declared, `The server reports ${declared} bytes.`);
      try {
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > MAX_INTAKE_BYTES)
          return error('too-large', name, bytes.byteLength, `Downloaded ${bytes.byteLength} bytes.`);
        return { ok: true, name, bytes };
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        return error('network', name, 0, `The download from ${url.origin} was interrupted (${detail}).`);
      }
    },
  };
}
