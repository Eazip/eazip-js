import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

// Content lives directly under `content/` (not `content/docs/`) so routes
// mount at app/docs/[...slug]/page.tsx without an extra path segment. There
// is no Next basePath; the source loader's `baseUrl: '/docs'` (lib/source.ts)
// is what puts every generated link under eazip.io/docs/*.
export const docs = defineDocs({
  dir: 'content',
});

export default defineConfig();
