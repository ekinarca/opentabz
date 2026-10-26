import type { EditCommand } from '@opentabz/core/shared';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../engine/instance.ts', async () => (await import('../test/fake-engine.ts')).fakeEngineModule);

describe('recovering a draft', () => {
  it('makes its edits again on the score it opened, not on one opened meanwhile', async () => {
    const { useDocuments } = await import('../state/documents.ts');
    const { recoverDraft } = await import('./RecoverDialog.tsx');
    const { edited } = await import('../test/fake-engine.ts');
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
