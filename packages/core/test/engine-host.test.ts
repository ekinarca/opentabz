import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { EngineHost } from '../src/engine/host.ts';
import { ALPHATAB_VERSION } from '../src/engine/version.ts';
import type { ViewOptions } from '../src/shared/view.ts';
import { readFixture } from './helpers.ts';

const VIEW: ViewOptions = {
  trackIndexes: [0],
  layout: 'page',
  systemsLayout: 'auto',
  staffDisplay: 'default',
  width: 700,
  notationScale: 1,
};

function buffer(path: string): ArrayBuffer {
  const bytes = readFixture(path);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

describe('EngineHost', () => {
  it('warms up and reports the engine version', () => {
    const info = new EngineHost().init({});
    expect(info.alphaTabVersion).toBe(ALPHATAB_VERSION);
    expect(info.warmupMs).toBeGreaterThan(0);
  });

  it('opens a document and summarizes it', () => {
    const host = new EngineHost();
    const result = host.open({ name: 'score-info.gp', bytes: buffer('alphatab/guitarpro7/score-info.gp') });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary).toMatchObject({
      fileName: 'score-info.gp',
      format: 'gp',
      title: 'Title',
      artist: 'Artist',
      album: 'Album',
      extensionMismatch: false,
      truncated: false,
    });
    expect(result.summary.tracks.length).toBe(2);
    expect(result.summary.tracks[0]?.staves[0]?.tuning.length).toBe(6);
    expect(result.parseMs).toBeGreaterThanOrEqual(0);
  });

  it('returns typed errors instead of throwing', () => {
    const host = new EngineHost();
    const result = host.open({ name: 'empty.gp', bytes: new ArrayBuffer(0) });
    expect(result).toMatchObject({ ok: false, error: { code: 'empty' } });
    expect(host.documentCount).toBe(0);
  });

  it('lays out views, paints the current generation only and closes cleanly', () => {
    const host = new EngineHost();
    const opened = host.open({ name: 'effects.gp', bytes: buffer('alphatab/guitarpro7/effects.gp') });
    if (!opened.ok) throw new Error('fixture failed to open');
    const docId = opened.summary.id;
    const first = host.layoutView({ viewId: 'v1', docId, options: VIEW });
    const ids = first.partials.slice(0, 3).map(p => p.id);
    expect(host.paint({ viewId: 'v1', generation: first.generation, ids }).partials).toHaveLength(3);

    const second = host.layoutView({ viewId: 'v1', docId, options: { ...VIEW, width: 500 } });
    expect(host.paint({ viewId: 'v1', generation: first.generation, ids }).partials).toHaveLength(0);
    expect(
      host.paint({ viewId: 'v1', generation: second.generation, ids: [second.partials[0]?.id ?? ''] })
        .partials,
    ).toHaveLength(1);

    host.closeDocument({ docId });
    expect(host.documentCount).toBe(0);
    expect(host.paint({ viewId: 'v1', generation: second.generation, ids }).partials).toHaveLength(0);
    expect(() => host.layoutView({ viewId: 'v1', docId, options: VIEW })).toThrow(/Unknown document/);
  });

  it('keeps the bundled alphaTab version constant in sync with the installed package', () => {
    const require = createRequire(import.meta.url);
    const entry = require.resolve('@coderline/alphatab');
    const pkgPath = entry.replace(/dist[\\/][^\\/]+$/, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };
    expect(pkg.version).toBe(ALPHATAB_VERSION);
  });
});
