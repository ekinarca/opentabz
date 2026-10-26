import { describe, expect, it, vi } from 'vitest';

vi.mock('../engine/instance.ts', async () => (await import('../test/fake-engine.ts')).fakeEngineModule);

function track(index: number, name: string, program: number) {
  return {
    index,
    name,
    program,
    mix: { mute: false, solo: false, balance: 8 },
    staves: [],
    channels: [],
    isPercussion: false,
  };
}

describe('documents', () => {
  it('does not remember the mixer of a score whose tracks were moved for the file', async () => {
    const { useDocuments } = await import('./documents.ts');
    const { opening } = await import('../test/fake-engine.ts');
    opening.tracks = [track(0, 'Guitar', 29), track(1, 'Bass', 33)];
    const bytes = new Uint8Array([9, 9, 9]).buffer;
    const source = {
      name: 'song.gp',
      load: () => Promise.resolve({ ok: true as const, name: 'song.gp', bytes: bytes.slice(0) }),
    };
    const [key = ''] = await useDocuments.getState().open([source]);
    await vi.waitFor(() => {
      expect(useDocuments.getState().docs[0]?.fingerprint).not.toBeNull();
    });
    // The bass moved above the guitar (EDIT-030), then the guitar muted.
    const summary = useDocuments.getState().docs[0]?.summary;
    if (summary === undefined) throw new Error('Not open.');
    useDocuments.getState().remapTracks(key, { ...summary, tracks: [...summary.tracks].reverse() }, [1, 0]);
    useDocuments.getState().updateMix(key, 1, { mute: true });
    expect(useDocuments.getState().docs[0]?.mix.map(mix => [mix.program, mix.mute])).toEqual([
      [33, false],
      [29, true],
    ]);
    useDocuments.getState().close(key);
    // The file opened again: its guitar is a guitar, and not muted.
    await useDocuments.getState().open([source]);
    await vi.waitFor(() => {
      expect(useDocuments.getState().docs[0]?.fingerprint).not.toBeNull();
    });
    expect(useDocuments.getState().docs[0]?.mix.map(mix => [mix.program, mix.mute])).toEqual([
      [29, false],
      [33, false],
    ]);
    useDocuments.getState().close(useDocuments.getState().docs[0]?.key ?? '');
    opening.tracks = [];
  });

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
