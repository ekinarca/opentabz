/**
 * A stand-in for the engine worker in unit tests (`vi.mock('../engine/instance.ts', …)`): it
 * answers one request after another, each after a moment, opening any bytes as an empty score
 * and making every edit.
 */

/** The documents the engine was asked to edit, in order. */
export const edited: string[] = [];

/** The tracks of every score the engine opens (none unless a test sets them). */
export const opening: { tracks: readonly unknown[] } = { tracks: [] };

function summaryOf(id: string, name: string) {
  return {
    id,
    title: name,
    artist: '',
    subtitle: '',
    tracks: opening.tracks,
    masterBars: [],
    hasModelLayout: false,
    truncated: false,
    extensionMismatch: false,
    format: 'gp',
    formatVersion: null,
    tempo: 120,
  };
}

let opened = 0;
let queue: Promise<unknown> = Promise.resolve();

function call(method: string, args: { readonly name?: string; readonly docId?: string }): Promise<unknown> {
  const answer = queue
    .then(() => new Promise(resolve => setTimeout(resolve, 20)))
    .then(() => {
      if (method === 'open') {
        opened += 1;
        return { ok: true, summary: summaryOf(`doc-${opened}`, args.name ?? '') };
      }
      if (method === 'undo' || method === 'redo') {
        const docId = args.docId ?? '';
        return {
          changed: true,
          summary: summaryOf(docId, docId),
          trackOrigins: null,
          canUndo: method === 'redo',
          canRedo: method === 'undo',
        };
      }
      if (method === 'edit') {
        const docId = args.docId ?? '';
        edited.push(docId);
        return {
          changed: true,
          summary: summaryOf(docId, docId),
          trackOrigins: null,
          canUndo: true,
          canRedo: false,
        };
      }
      return {};
    });
  queue = answer.catch(() => undefined);
  return answer;
}

/** The module `../engine/instance.ts` as the tests see it. */
export const fakeEngineModule = {
  getEngine: () => ({ call }),
  onEngineRestart: () => undefined,
};
