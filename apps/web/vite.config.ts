import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Same isolation headers as production (netlify.toml) so dev behaves identically. */
const isolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

/**
 * alphaTab's package entry auto-initializes its own worker message handlers when imported inside
 * a worker, and those crash on messages that are not alphaTab's. The engine worker therefore
 * imports the side-effect-free core module (ARCHITECTURE.md §4).
 */
const require = createRequire(import.meta.url);
const alphaTabCore = join(dirname(require.resolve('@coderline/alphatab')), 'alphaTab.core.mjs');

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
    headers: isolationHeaders,
  },
});
