import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/docs/getting-started',
        destination: '/docs',
        permanent: true,
      },
      {
        source: '/docs/getting-started/quickstart-vanilla',
        destination: '/docs/getting-started/javascript',
        permanent: true,
      },
      {
        source: '/docs/api/:path*',
        destination: '/docs/reference/:path*',
        permanent: true,
      },
      {
        source: '/docs/recipes/:path*',
        destination: '/docs/guides/:path*',
        permanent: true,
      },
      {
        source: '/docs/core/:path*',
        destination: '/docs/concepts/:path*',
        permanent: true,
      },
    ];
  },
  // Served at the eazip.io root: the homepage is app/page.tsx and all
  // content pages live under the /docs segment (app/docs/[[...slug]]), so
  // internal links are written with an explicit /docs prefix.
};

export default withMDX(config);
