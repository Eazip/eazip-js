import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

/**
 * Shared nav/sidebar chrome for content pages under app/[...slug] (the
 * fumadocs DocsLayout). The homepage (app/page.tsx) renders its own nav
 * from its own components and does not use this.
 */
export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: 'https://github.com/Eazip/eazip-js',
    nav: {
      title: 'Eazip',
    },
    links: [
      { text: 'Get started', url: '/docs/getting-started' },
      { text: 'React', url: '/docs/react' },
      { text: 'Core', url: '/docs/core' },
      { text: 'Recipes', url: '/docs/recipes' },
      { text: 'API Reference', url: '/docs/api' },
    ],
  };
}

