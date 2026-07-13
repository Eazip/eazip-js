import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default {
  ...defineCloudflareConfig(),
  // This workspace deliberately has no `build` script (so the monorepo-wide
  // `npm run build --workspaces` skips the docs app); point OpenNext at the
  // Next.js build directly instead of its `npm run build` default.
  buildCommand: 'npx next build',
};
