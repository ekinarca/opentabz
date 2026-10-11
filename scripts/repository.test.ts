/**
 * Repository rules that are easy to break by accident: required files, licence, trademark
 * notices, third-party notices covering every runtime dependency, and the brief's hard
 * guardrails on what the product may reference.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function filesBelow(dir: string, pattern: RegExp): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (pattern.test(name)) found.push(relative(root, path));
    }
  };
  walk(join(root, dir));
  return found;
}

describe('repository', () => {
  it('has the files an open-source project needs', () => {
    for (const path of [
      'README.md',
      'CONTRIBUTING.md',
      'CODE_OF_CONDUCT.md',
      'SECURITY.md',
      'LICENSE',
      'THIRD_PARTY_NOTICES.md',
      'CHANGELOG.md',
      'renovate.json',
      '.github/PULL_REQUEST_TEMPLATE.md',
      '.github/ISSUE_TEMPLATE/bug_report.yml',
      '.github/ISSUE_TEMPLATE/feature_request.yml',
      '.github/workflows/ci.yml',
      'docs/ARCHITECTURE.md',
      'docs/DECISIONS.md',
      'docs/FEATURE_MATRIX.md',
      'docs/PARITY.md',
      'docs/RESEARCH.md',
      'docs/SHORTCUTS.md',
      'docs/upstream/README.md',
    ]) {
      expect(existsSync(join(root, path)), path).toBe(true);
    }
    expect(() => JSON.parse(read('renovate.json')) as unknown).not.toThrow();
  });

  it('is licensed under the AGPL, and says so everywhere', () => {
    expect(read('LICENSE')).toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
    for (const path of [
      'package.json',
      'apps/web/package.json',
      'packages/core/package.json',
      'packages/audio/package.json',
      'packages/ui/package.json',
    ]) {
      expect((JSON.parse(read(path)) as { license?: string }).license, path).toBe('AGPL-3.0-or-later');
    }
  });

  it('carries the Guitar Pro trademark notice in the README, the notices and the app', () => {
    const notice = 'Guitar Pro is a registered trademark of Arobas Music';
    expect(read('README.md')).toContain(notice);
    expect(read('THIRD_PARTY_NOTICES.md')).toContain(notice);
    expect(read('docs/PARITY.md')).toContain(notice);
    expect(read('apps/web/src/strings.ts')).toContain(notice);
  });

  it('lists every runtime dependency in THIRD_PARTY_NOTICES.md', () => {
    const notices = read('THIRD_PARTY_NOTICES.md');
    const displayNames: Record<string, string> = {
      '@coderline/alphatab': 'alphaTab',
      '@fontsource-variable/instrument-sans': 'Instrument Sans',
      '@fontsource-variable/jetbrains-mono': 'JetBrains Mono',
      '@fontsource/arimo': 'Arimo',
      '@fontsource/gelasio': 'Gelasio',
      '@fontsource/instrument-serif': 'Instrument Serif',
      fflate: 'fflate',
      'lucide-react': 'Lucide',
      'radix-ui': 'Radix UI',
      react: 'React',
      'react-dom': 'React DOM',
      zustand: 'Zustand',
    };
    for (const path of [
      'apps/web/package.json',
      'packages/core/package.json',
      'packages/audio/package.json',
      'packages/ui/package.json',
    ]) {
      const manifest = JSON.parse(read(path)) as { dependencies?: Record<string, string> };
      for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
        if (version.startsWith('workspace:')) continue;
        const display = displayNames[name];
        expect(display, `${name} (${path}) needs a display name in this test`).toBeDefined();
        expect(notices, `${name} is missing from THIRD_PARTY_NOTICES.md`).toContain(display ?? name);
      }
    }
  });

  it('never references Ultimate Guitar in the product (brief: zero integration)', () => {
    const product = [
      ...filesBelow('apps/web/src', /\.(ts|tsx|css)$/),
      ...filesBelow('apps/web/public', /\.(js|svg|txt|json|webmanifest)$|^_/),
      ...filesBelow('packages/core/src', /\.ts$/),
      ...filesBelow('packages/audio/src', /\.ts$/),
      ...filesBelow('packages/ui/src', /\.(ts|tsx|css)$/),
      'apps/web/index.html',
    ];
    expect(product.length).toBeGreaterThan(50);
    for (const path of product) {
      expect(read(path), path).not.toMatch(/ultimate[\s-]?guitar|ultimate-guitar\.com/i);
    }
  });

  it('loads nothing from third-party origins in the page or its styles', () => {
    const sources = [
      'apps/web/index.html',
      ...filesBelow('apps/web/src', /\.(ts|tsx|css)$/),
      ...filesBelow('packages/ui/src', /\.(ts|tsx|css)$/),
    ];
    for (const path of sources) {
      const text = read(path);
      // Imports, stylesheets, fonts and scripts must come from the app itself.
      expect(text, path).not.toMatch(
        /@import\s+url\(\s*['"]?https?:|<script[^>]+src=["']https?:|<link[^>]+href=["']https?:\/\/(?!opentabz\.com)/i,
      );
    }
  });
});
