import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Point the workspace package at its sources so the dev server never serves
// a stale dist build (and package edits hot-reload).
const pkg = (path: string) => fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@eazip\/core$/, replacement: pkg('core/src/index.ts') },
      { find: /^@eazip\/core\/(.+)$/, replacement: pkg('core/src/$1') },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
