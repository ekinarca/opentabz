import { describe, expect, it, vi } from 'vitest';

vi.mock('../engine/instance.ts', async () => (await import('../test/fake-engine.ts')).fakeEngineModule);

describe('editing', () => {
  it('undoes an edit still being made when undo is pressed', async () => {
    const { useDocuments } = await import('./documents.ts');
    const { edited } = await import('../test/fake-engine.ts');
    const { editingOf, setScoreInfo, toggleEditing, undoEdit } = await import('./editing.ts');
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const [key = ''] = await useDocuments
      .getState()
      .open([{ name: 'song.gp', load: () => Promise.resolve({ ok: true, name: 'song.gp', bytes }) }]);
    await toggleEditing(key);
    expect(undoEdit(key)).toBe(false);
    const asked = edited.length;
    setScoreInfo(key, { title: 'Song' });
    // Pressed before the engine has made the edit: taken, and done once the edit is made.
    expect(undoEdit(key)).toBe(true);
    await vi.waitFor(() => {
      expect(edited.length).toBe(asked + 1);
      expect(editingOf(key).changes).toBe(2);
    });
    expect(editingOf(key).revision).toBe(0);
  });
});
