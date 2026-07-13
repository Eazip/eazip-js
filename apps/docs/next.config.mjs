import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Served at the eazip.io root: the homepage is app/page.tsx and all
  // content pages live under the /docs segment (app/docs/[...slug]), so
  // internal links are written with an explicit /docs prefix.
};

export default withMDX(config);
