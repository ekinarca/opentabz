import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
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

/**
 * alphaTab's package entry auto-initializes its own worker message handlers when imported inside
 * a worker, and those crash on messages that are not alphaTab's. The engine worker therefore
 * imports the side-effect-free core module (ARCHITECTURE.md §4).
 */
const require = createRequire(import.meta.url);
const alphaTabCore = join(dirname(require.resolve('@coderline/alphatab')), 'alphaTab.core.mjs');

export default defineConfig({
  plugins: [react(), tailwindcss(), productionHeaders()],
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
