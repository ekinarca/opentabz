import { describe, expect, it, vi } from 'vitest';

vi.mock('../engine/instance.ts', async () => (await import('../test/fake-engine.ts')).fakeEngineModule);

describe('closing a score', () => {
  it('asks about an edit made as it closes, and once closed leaves no changes behind', async () => {
    const { useDocuments } = await import('../state/documents.ts');
    const { anyDirty, setScoreInfo, toggleEditing } = await import('../state/editing.ts');
    const { requestClose, useCloseGuard } = await import('./save.ts');
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const [key = ''] = await useDocuments
      .getState()
      .open([{ name: 'song.gp', load: () => Promise.resolve({ ok: true, name: 'song.gp', bytes }) }]);
    await toggleEditing(key);
    // The first edit since the score was opened is being made when its tab is closed.
    setScoreInfo(key, { title: 'Song' });
    requestClose(key);
    await vi.waitFor(() => {
      expect(useCloseGuard.getState().pending).toBe(key);
    });
    expect(useDocuments.getState().docs.map(doc => doc.key)).toEqual([key]);
    // Closed anyway: nothing is left to ask about when the page is left.
    useDocuments.getState().close(key);
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(anyDirty()).toBe(false);
  });
});
