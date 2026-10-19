import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, transformWithOxc, type Plugin } from 'vite';
import { headersFor, parseHeadersFile } from './build/netlify-headers.ts';

/**
 * The dev server sends the isolation headers only: the production CSP would block Vite's
 * inline hot-reload scripts.
 */
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

/** `vite preview` serves public/_headers exactly like Netlify, CSP included (ADR-0008). */
function productionHeaders(): Plugin {
  return {
    name: 'opentabz:production-headers',
    configurePreviewServer(server) {
      const rules = parseHeadersFile(readFileSync(join(import.meta.dirname, 'public', '_headers'), 'utf8'));
      server.middlewares.use((request, response, next) => {
        const path = new URL(request.url ?? '/', 'http://localhost').pathname;
        for (const [name, value] of headersFor(rules, path)) response.setHeader(name, value);
        next();
      });
    },
  };
}

/** Built files the service worker does not keep: source maps, and the host's and crawlers' own. */
const NOT_KEPT = /\.map$|^_headers$|^_redirects$|^robots\.txt$|^og\.png$|^sw\.js$|^\.vite\//;

function builtFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => relative(directory, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .filter(path => !NOT_KEPT.test(path))
    .sort();
}

/**
 * dist/sw.js (PLAT-001, PLAT-002): src/sw/service-worker.ts as a classic script, given every
 * built file to keep and a version made of their contents, so that any change installs anew.
 */
function serviceWorker(): Plugin {
  let outDir = '';
  return {
    name: 'opentabz:service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    async closeBundle() {
      const files = builtFiles(outDir);
      const version = createHash('sha256');
      for (const path of files) version.update(path).update(readFileSync(join(outDir, path)));
      const source = readFileSync(join(import.meta.dirname, 'src', 'sw', 'service-worker.ts'), 'utf8');
      const { code } = await transformWithOxc(source, 'service-worker.ts', { lang: 'ts' });
      const script = code
        .replaceAll('__PRECACHE__', JSON.stringify(files.map(path => `/${path}`)))
        .replaceAll('__VERSION__', JSON.stringify(version.digest('hex').slice(0, 16)));
      writeFileSync(join(outDir, 'sw.js'), script);
    },
  };
}

/**
 * alphaTab is patched with `pnpm patch` (patches/). A new patch installs alphaTab under another
 * path and invalidates the pre-bundled dependencies, so the dev server restarts itself, forcing
 * a new dependency optimization, whenever a patch changes.
 */
function restartOnPatchChange(): Plugin {
  const patches = join(import.meta.dirname, '..', '..', 'patches');
  return {
    name: 'opentabz:restart-on-patch-change',
    configureServer(server) {
      server.watcher.add(patches);
      const restart = (file: string) => {
        if (file.startsWith(patches)) void server.restart(true);
      };
      server.watcher.on('change', restart);
      server.watcher.on('add', restart);
    },
  };
}

/**
 * alphaTab's package entry auto-initializes its own worker message handlers when imported inside
 * a worker, and those crash on messages that are not alphaTab's. The engine worker therefore
 * imports the side-effect-free core module (ARCHITECTURE.md §4).
 */
// Through the package's symlink, not require.resolve: Node caches resolved real paths for the life
// of the process, so a dev server restarted after a new patch would keep the old copy.
const alphaTabCore = join(
  import.meta.dirname,
  'node_modules',
  '@coderline',
  'alphatab',
  'dist',
  'alphaTab.core.mjs',
);

/** The version people see (About), from package.json. */
const version = (
  JSON.parse(readFileSync(join(import.meta.dirname, 'package.json'), 'utf8')) as { version: string }
).version;

export default defineConfig({
  define: {
    __OPENTABZ_VERSION__: JSON.stringify(version),
  },
  plugins: [react(), tailwindcss(), productionHeaders(), restartOnPatchChange(), serviceWorker()],
  resolve: {
    alias: [{ find: /^@coderline\/alphatab$/, replacement: alphaTabCore }],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2023',
    sourcemap: true,
    modulePreload: { polyfill: false },
    // Never inline assets as data: URLs; the CSP only allows fonts and scripts from 'self'.
    assetsInlineLimit: 0,
    // dist/.vite/manifest.json: scripts/check-budgets.ts reads the initial chunk graph from it.
    manifest: true,
    reportCompressedSize: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: isolationHeaders,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
