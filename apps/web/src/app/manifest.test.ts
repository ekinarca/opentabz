/**
 * The web app manifest (PLAT-001, PLAT-003, PLAT-004): what installs the app, and the files the
 * system may open it with or share to it: every format OpenTabz opens.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openableExtensions } from '@opentabz/core/shared';
import { describe, expect, it } from 'vitest';

const PUBLIC = join(import.meta.dirname, '..', '..', 'public');

interface Manifest {
  readonly name: string;
  readonly start_url: string;
  readonly display: string;
  readonly icons: readonly { readonly src: string; readonly sizes: string; readonly purpose?: string }[];
  readonly file_handlers: readonly {
    readonly action: string;
    readonly accept: Record<string, readonly string[]>;
  }[];
  readonly share_target: {
    readonly action: string;
    readonly method: string;
    readonly params: { readonly files: readonly { readonly accept: readonly string[] }[] };
  };
}

const manifest = JSON.parse(readFileSync(join(PUBLIC, 'manifest.webmanifest'), 'utf8')) as Manifest;

describe('the web app manifest', () => {
  it('installs the app: its name, its start, standalone, with icons that exist (PLAT-001)', () => {
    expect(manifest.name).toBe('OpenTabz');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.map(icon => icon.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some(icon => icon.purpose === 'maskable')).toBe(true);
    for (const icon of manifest.icons) expect(existsSync(join(PUBLIC, icon.src)), icon.src).toBe(true);
  });

  it('opens every format OpenTabz opens from the system (PLAT-003)', () => {
    const handled = new Set(manifest.file_handlers.flatMap(handler => Object.values(handler.accept).flat()));
    for (const extension of openableExtensions()) expect(handled, extension).toContain(`.${extension}`);
  });

  it('takes every format OpenTabz opens shared to it (PLAT-004)', () => {
    expect(manifest.share_target).toMatchObject({ action: '/share-target', method: 'POST' });
    const accepted = new Set(manifest.share_target.params.files.flatMap(file => file.accept));
    for (const extension of openableExtensions()) expect(accepted, extension).toContain(`.${extension}`);
  });
});
