/**
 * The commands last run from the command palette, the latest first (UX-014: Guitar Pro browses
 * past commands), kept between visits in localStorage and guarded like the other preferences:
 * private windows and blocked storage simply start with none.
 */

export const PALETTE_STORAGE_KEY = 'opentabz.palette.v1';
/** How many past commands are kept. */
export const RECENT_COMMANDS = 6;

/** Past command ids from what was stored, or none when it is unreadable. */
export function parseRecent(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === 'string').slice(0, RECENT_COMMANDS);
  } catch {
    return [];
  }
}

/** `id` first, without its earlier place, as many as are kept. */
export function withRecent(recent: readonly string[], id: string): string[] {
  return [id, ...recent.filter(other => other !== id)].slice(0, RECENT_COMMANDS);
}

export function recallRecent(): string[] {
  try {
    return parseRecent(localStorage.getItem(PALETTE_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function rememberRecent(id: string): void {
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, JSON.stringify(withRecent(recallRecent(), id)));
  } catch {
    // Storage blocked: the palette simply forgets.
  }
}
