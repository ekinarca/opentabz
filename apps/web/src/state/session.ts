/**
 * The scores open when the app was last left (UX-028): which, in their order, and which one was
 * in front, kept in localStorage by their fingerprints and opened again at the start when the
 * settings ask, from the scores kept on this device (recent-scores.ts). Guarded like the other
 * preferences: private windows and blocked storage simply start empty.
 */
import type { IntakeSource } from '../features/open/intake.ts';
import { strings } from '../strings.ts';
import { recentBytes, type RecentScore } from './recent-scores.ts';

export const SESSION_STORAGE_KEY = 'opentabz.session.v1';

export interface Session {
  /** The open scores, in their order, by fingerprint. */
  readonly fingerprints: readonly string[];
  /** Which one was in front, or -1. */
  readonly active: number;
}

export function parseSession(raw: string | null): Session | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const record = value as Record<string, unknown>;
    const fingerprints = record['fingerprints'];
    const active = record['active'];
    if (!Array.isArray(fingerprints)) return null;
    const items: unknown[] = fingerprints;
    if (!items.every((item): item is string => typeof item === 'string')) return null;
    if (typeof active !== 'number' || !Number.isInteger(active)) return null;
    return { fingerprints: items, active: active < items.length ? active : -1 };
  } catch {
    return null;
  }
}

/** The session of the documents open now: those whose fingerprints are known. */
export function sessionOf(
  docs: readonly { readonly key: string; readonly fingerprint: string | null }[],
  activeKey: string | null,
): Session {
  const known = docs.filter(doc => doc.fingerprint !== null);
  return {
    fingerprints: known.map(doc => doc.fingerprint ?? ''),
    active: known.findIndex(doc => doc.key === activeKey),
  };
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage blocked: the session is simply not kept.
  }
}

/** Forgets the scores open last time. */
export function forgetSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was kept.
  }
}

export function recallSession(): Session | null {
  try {
    return parseSession(localStorage.getItem(SESSION_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** A kept score, to open as if it had been dropped. */
export function recentSource(score: Pick<RecentScore, 'fingerprint' | 'name'>): IntakeSource {
  return {
    name: score.name,
    load: async () => {
      const bytes = await recentBytes(score.fingerprint);
      if (bytes === null) {
        return {
          ok: false,
          error: {
            code: 'read-failed',
            fileName: score.name,
            byteLength: 0,
            format: null,
            formatVersion: null,
            extensionMismatch: false,
            position: null,
            detail: strings.recent.gone,
          },
        };
      }
      return { ok: true, name: score.name, bytes };
    },
  };
}
