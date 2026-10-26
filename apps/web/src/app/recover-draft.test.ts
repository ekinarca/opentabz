import type { EditCommand } from '@opentabz/core/shared';
import { describe, expect, it, vi } from 'vitest';

/** The documents the engine was asked to edit. */
const edited: string[] = [];

vi.mock('../engine/instance.ts', () => {
  let opened = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const summaryOf = (id: string, name: string) => ({
    id,
    title: name,
    artist: '',
    subtitle: '',
    tracks: [],
    masterBars: [],
    hasModelLayout: false,
    truncated: false,
    extensionMismatch: false,
    format: 'gp',
    formatVersion: null,
    tempo: 120,
  });
  // As the engine worker: one request after another, each taking a moment.
  const call = (method: string, args: { readonly name?: string; readonly docId?: string }) => {
    const answer = queue
      .then(() => new Promise(resolve => setTimeout(resolve, 20)))
      .then(() => {
        if (method === 'open') {
          opened += 1;
          return { ok: true, summary: summaryOf(`doc-${opened}`, args.name ?? '') };
        }
        if (method === 'edit') {
          edited.push(args.docId ?? '');
          const docId = args.docId ?? '';
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
  };
  return { getEngine: () => ({ call }), onEngineRestart: () => undefined };
});

describe('recovering a draft', () => {
  it('makes its edits again on the score it opened, not on one opened meanwhile', async () => {
    const { useDocuments } = await import('../state/documents.ts');
    const { recoverDraft } = await import('./RecoverDialog.tsx');
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    // The last session's score is opening (at the start) when Recover is clicked.
    const session = useDocuments
      .getState()
      .open([
        { name: 'other-song.gp', load: () => Promise.resolve({ ok: true, name: 'other-song.gp', bytes }) },
      ]);
    await new Promise(resolve => setTimeout(resolve, 5));
    const done: EditCommand[][] = [[{ kind: 'insert-bar', bar: 0 } as unknown as EditCommand]];
    await Promise.all([
      session,
      recoverDraft({
        id: 'old',
        name: 'my-song.gp',
        title: 'My song',
        bytes,
        blank: false,
        done,
        undone: [],
        writtenAt: 0,
      }),
    ]);
    const mine = useDocuments.getState().docs.find(doc => doc.source.name === 'my-song.gp');
    expect(edited).toEqual([mine?.engineId]);
  });
});
