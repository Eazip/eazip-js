import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

/**
 * `fumadocs-ui`'s component types resolve React through this app's React 19
 * workspace, while `mdx/types` (`@types/mdx`) resolves its ambient JSX
 * globals through the monorepo root's React 18 install (pulled in
 * transitively by `@eazip/react`'s compiled `.d.ts` output, which is a
 * sibling workspace built against React 18). The two `MDXComponents` shapes
 * are structurally compatible at runtime but nominally distinct to
 * TypeScript, so the merge is cast at this single, well-understood
 * boundary instead of loosening types everywhere.
 */
export function getMDXComponents(components?: Record<string, unknown>): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...components,
  } as MDXComponents;
}
