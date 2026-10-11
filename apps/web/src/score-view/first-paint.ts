/**
 * Which documents have painted their score once, and who waits for that. The engine worker does
 * one thing at a time: playback is prepared (MIDI generation, long for big scores) only after the
 * first systems are on screen, so it never holds them back.
 */
const painted = new Set<string>();
const waiting = new Map<string, (() => void)[]>();

export function markPainted(key: string): void {
  painted.add(key);
  const resolvers = waiting.get(key) ?? [];
  waiting.delete(key);
  for (const resolve of resolvers) resolve();
}

/** Resolves once the document has painted, or after `timeoutMs` so that nothing waits forever. */
export function whenPainted(key: string, timeoutMs: number): Promise<void> {
  if (painted.has(key)) return Promise.resolve();
  return new Promise(resolve => {
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    waiting.set(key, [...(waiting.get(key) ?? []), done]);
  });
}

/** The document's view is gone: a new one paints again. */
export function forgetPainted(key: string): void {
  painted.delete(key);
}
