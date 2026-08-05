# @eazip/docs

The Eazip site (Next.js + Fumadocs), served at the **eazip.io** root: the
homepage — including a live `<EazipTray />` demo — lives at `/`, and all
content pages live under `/docs/...` (the `app/docs/[...slug]` segment;
there is no Next `basePath`).

## Develop

```sh
npm run dev:docs           # from the repo root (or: npm run dev -w @eazip/docs)
# open http://localhost:3000   (content pages start at /docs)
```

The dev server resolves `@eazip/core` / `@eazip/react` through the workspace
`dist`, so build them once first: `npm run build -w @eazip/core -w @eazip/react`.

Content lives in [content/](content/) (MDX + `meta.json` per section) — docs
fixes and improvements are welcome. Style note: display text says “Eazip” /
“Eazip Cloud”; package names, commands, and domains stay lowercase.

Before adding or reorganizing content, read the
[documentation guide](CONTENT_GUIDE.md). It defines the target information
architecture, the role of each section, page-placement rules, writing
conventions, and the review checklist.

## Build

```sh
npm run build:docs -w @eazip/docs      # next build (static pages)
npm run build:worker -w @eazip/docs    # OpenNext → .open-next/worker.js
npm run preview:worker -w @eazip/docs  # serve the built worker locally
```

This workspace deliberately has **no `build` script** so the repo-wide
`npm run build --workspaces` (used by the npm publish workflow) skips it.
OpenNext is pointed at `npx next build` via `buildCommand` in
[open-next.config.ts](open-next.config.ts).

CI ([docs-ci.yml](../../.github/workflows/docs-ci.yml)) runs the type check
and both builds on pull requests. Deployment to eazip.io is handled by the
maintainers outside this repository — no credentials live here, and
contributors never need to deploy anything.

## Gotchas

- **React types pin**: every workspace runs React 19, but
  [tsconfig.json](tsconfig.json) still pins `react`/`react-dom` *types* to
  this workspace's copies so a stray transitive `@types/react` elsewhere in
  the monorepo can't flip this build onto mismatched types.
