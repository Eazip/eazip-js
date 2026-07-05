import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Point the workspace packages at their sources so the dev server never
// serves a stale dist build (and package edits hot-reload).
const pkg = (path: string) => fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@eazip\/react$/, replacement: pkg('react/src/index.ts') },
      { find: /^@eazip\/core$/, replacement: pkg('core/src/index.ts') },
      { find: /^@eazip\/core\/(.+)$/, replacement: pkg('core/src/$1') },
    ],
  },
  server: {
    port: 5174,
    strictPort: true,
  },
});
