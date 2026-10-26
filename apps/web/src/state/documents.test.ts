import { describe, expect, it, vi } from 'vitest';

vi.mock('../engine/instance.ts', async () => (await import('../test/fake-engine.ts')).fakeEngineModule);

describe('documents', () => {
  it('keeps a score opened while the restarted engine opens the others again', async () => {
    const { useDocuments } = await import('./documents.ts');
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    const source = (name: string) => ({
      name,
      load: () => Promise.resolve({ ok: true as const, name, bytes: bytes.slice(0) }),
    });
    const [a = '', b = ''] = await useDocuments.getState().open([source('a.gp'), source('b.gp')]);
    const before = useDocuments.getState().docs.map(doc => doc.engineId);
    const restarted = useDocuments.getState().reopenAll();
    await new Promise(resolve => setTimeout(resolve, 5));
    // Dropped while the engine opens the other scores again.
    const opening = useDocuments.getState().open([source('c.gp')]);
    const [[c = '']] = await Promise.all([opening, restarted]);
    const docs = useDocuments.getState().docs;
    expect(docs.map(doc => doc.key)).toEqual([a, b, c]);
    expect(docs.slice(0, 2).map(doc => doc.engineId)).not.toEqual(before);
    expect(useDocuments.getState().activeKey).toBe(c);
  });
});
