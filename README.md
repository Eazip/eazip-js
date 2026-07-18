# Eazip JavaScript SDK

Zip downloads for browser apps — locally in the browser, or server-side with
Eazip Public Sessions when downloads get big.

This repository contains public, browser-facing SDK packages only. Server APIs,
dashboard code, infrastructure, and internal Eazip services are not part of
this repository.

**Documentation:** [Getting started](https://eazip.io/docs/getting-started?utm_source=eazip_js&utm_medium=github_readme&utm_campaign=oss_acquisition&utm_content=root_getting_started) ·
[Download multiple files as a ZIP from URLs](https://eazip.io/docs/recipes/create-zip-from-remote-urls?utm_source=eazip_js&utm_medium=github_readme&utm_campaign=oss_acquisition&utm_content=root_remote_urls) ·
[ZIP S3 or R2 objects](https://eazip.io/docs/recipes/zip-s3-or-r2-objects?utm_source=eazip_js&utm_medium=github_readme&utm_campaign=oss_acquisition&utm_content=root_s3_r2_objects) ·
[React](https://eazip.io/docs/react?utm_source=eazip_js&utm_medium=github_readme&utm_campaign=oss_acquisition&utm_content=root_react_docs) ·
[Cloud strategy](https://eazip.io/docs/cloud?utm_source=eazip_js&utm_medium=github_readme&utm_campaign=cloud_activation&utm_content=root_cloud_docs)

## Packages

- [`@eazip/core`](packages/core): framework-independent zip engine — one function
  (`createZip`), a job API (`startZip`/`resumeZip`), local + cloud strategies
- [`@eazip/react`](packages/react): React hooks and a drop-in download tray built
  on `@eazip/core`

## Install

```sh
npm install @eazip/core
# or, for React apps
npm install @eazip/react
```

## Quickstart (vanilla)

```ts
import { createZip } from '@eazip/core';

const result = await createZip({ files: input.files, zipName: 'documents.zip' });
result.download();
```

Files are zipped in the browser: `File[]`, `FileList`, `Blob`s, URL strings, and
`{ url | file, filename }` objects all work. Failed URL sources are skipped and
reported (`result.status === 'partial'`, `result.errors`) instead of failing the
whole export. Need progress or cancellation? `startZip` returns a subscribable
`ZipJob` — see [`packages/core`](packages/core/README.md).

## Quickstart (React)

One hook, one component:

```tsx
import { EazipTray, useEazip } from '@eazip/react';

function Gallery({ selectedFiles }: { selectedFiles: File[] }) {
  const zip = useEazip();
  return (
    <>
      <button onClick={() => zip.download({ files: selectedFiles })}>Download as ZIP</button>
      <EazipTray />
    </>
  );
}
```

The tray narrates the whole export inline — progress, completion, partial
results, errors, and expiry — with light/dark themes and `en`/`ja` locales.
See [`packages/react`](packages/react/README.md) for the full API.

## Large downloads: the cloud strategy

For thousands of files or multi-gigabyte exports, the same API switches to the
[Eazip Cloud strategy](https://eazip.io/docs/cloud?utm_source=eazip_js&utm_medium=github_readme&utm_campaign=cloud_activation&utm_content=root_cloud_strategy),
which builds the zip server-side:

```ts
const job = startZip({ strategy: 'cloud', publicKey: 'pk_ez_...', files: urls });
const result = await job.done;
result.download();
```

Cloud exports survive page reloads (`resumeZip`), split into multiple zips
automatically, and keep download links live for 24 hours.

For very large exports where the browser should not receive every source URL,
let your backend create the Public Session and pass only the session credential
back to the SDK:

```ts
const job = startZip({
  strategy: 'cloud',
  zipName: 'export.zip',
  createSession: async ({ signal }) => {
    const response = await fetch('/api/exports/123/eazip-session', {
      method: 'POST',
      credentials: 'include',
      signal,
    });
    if (!response.ok) throw new Error('Failed to create Eazip session');
    return response.json(); // { sessionId, clientSecret, apiBaseUrl? }
  },
});
```

## Try the Examples

```sh
cd examples/client   # vanilla TypeScript demo (port 5173)
# or
cd examples/react    # React demo with the tray (port 5174)
cp .env.example .env
npm install
npm run dev -- --host 0.0.0.0
```

Local mode works without an Eazip public key. Set `VITE_EAZIP_PUBLIC_KEY` in
`.env` only when testing Cloud mode. Your Public App must allow the origin you
open, such as `http://localhost:5173` or your Tailscale URL.

## Browser Scope

`@eazip/core` is designed for browser Public Session integrations. Backend
usage with secret keys should use Eazip server APIs directly.

## Contributing

Start with [ARCHITECTURE.md](ARCHITECTURE.md) — a map of the packages, the
`ZipJob` abstraction both packages are built around, and the invariants to
keep. `npm install && npm run build && npm run test` runs everything.

## Status

Use the beta channel while the SDK is in preview. APIs may change before `1.0.0`.
`@eazip/core` supersedes the earlier `@eazip/client` beta.

## License

MIT
