# @eazip/core

Zip downloads for browser apps — one function.

```ts
import { createZip } from '@eazip/core';

const result = await createZip({ files: input.files, zipName: 'photos.zip' });
result.download();
```

Files are zipped **in the browser** (ZIP64, per-file progress, no upload).
`files` accepts `File[]`, a `FileList`, `Blob`s, URL strings, or `{ url | file, filename }`
objects. Failed URL sources are skipped and reported instead of killing the export:

```ts
const result = await createZip({ files: urls });
result.status;        // 'completed' | 'partial'
result.errors;        // per-file skips: [{ code, message, filename }]
result.zips;          // one or more zips (see maxZipSizeBytes)
```

React app? Use [`@eazip/react`](https://github.com/Eazip/eazip-js/tree/main/packages/react) —
`useEazip()` + `<EazipTray />` add a drop-in download tray on top of this package.

## Install

```sh
npm install @eazip/core
```

## Jobs: progress, cancellation, subscriptions

`createZip` is a thin wrapper over `startZip`, which returns a `ZipJob` synchronously:

```ts
import { startZip } from '@eazip/core';

const job = startZip({ files, zipName: 'export.zip' });

const unsubscribe = job.subscribe(() => {
  const { status, progress } = job.getSnapshot();
  console.log(status, progress?.filesCompleted, '/', progress?.filesTotal);
});

// job.abort();       // cancel
const result = await job.done;   // resolves on 'completed' | 'partial'
result.download();               // first zip
result.downloadAll();            // every zip
```

The snapshot/subscribe contract is `useSyncExternalStore`-compatible, so building
UI on top of a job is trivial.

## Splitting large exports

`maxZipSizeBytes` splits the output into multiple zips, each kept under the cap
(best effort — a single file larger than the cap gets its own zip):

```ts
const result = await createZip({ files, zipName: 'export.zip', maxZipSizeBytes: 1_000_000_000 });
result.zips; // export_part01.zip, export_part02.zip, ...
```

## Large downloads: the cloud strategy

Browser-side zipping holds everything in memory and dies with the tab. For
thousands of files or multi-gigabyte exports, switch the same API to
[Eazip](https://eazip.io) Public Sessions — the zip is built server-side:

```ts
const job = startZip({
  strategy: 'cloud',
  publicKey: 'pk_ez_...',        // from eazip.io
  files: urls,                    // URL sources, fetched by the Eazip API
  zipName: 'export.zip',
});

job.getSnapshot().session;        // { sessionId, clientSecret, expiresAt } — available immediately
const result = await job.done;    // polls with backoff; pauses in hidden tabs
result.download();                // signed URL, valid for 24h by default
```

If your backend already knows the source URLs, keep that list off the browser
and provide a session creator instead. The SDK still owns polling, completion,
downloads, and cancellation:

```ts
const job = startZip({
  strategy: 'cloud',
  zipName: 'export.zip',
  filesTotal: 50_000,              // optional initial UI count
  createSession: async ({ signal, zipName, mode }) => {
    const response = await fetch('/api/exports/123/eazip-session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ zipName, mode }),
    });
    if (!response.ok) throw new Error('Failed to create Eazip session');
    return response.json();        // { sessionId, clientSecret, apiBaseUrl? }
  },
});
```

Cloud zips default to **stream mode**: the archive is generated on demand at
download time, so it's ready sooner — a good fit for interactive, front-end
exports. Each download regenerates the zip; pass `mode: 'stored'` to build it
once and keep it in storage instead.

Cloud jobs are **resumable**: persist `sessionId` + `clientSecret` and pick the
job back up after a reload:

```ts
import { resumeZip } from '@eazip/core';

const job = resumeZip({ sessionId, clientSecret });
await job.done;
```

## Error handling

```ts
import { createZip, isEazipError, EazipSessionExpiredError, EazipRateLimitError } from '@eazip/core';

try {
  const result = await createZip({ strategy: 'cloud', publicKey, files });
} catch (error) {
  if (error instanceof EazipSessionExpiredError) {
    // links aged out — re-run the export
  } else if (error instanceof EazipRateLimitError) {
    console.log('retry after', error.retryAfterMs);
  } else if (isEazipError(error)) {
    console.log(error.code, error.message);
  }
}
```

Per-file problems never throw — they land in `result.errors` with the zip still
produced (`status: 'partial'`). Only fatal problems (abort, invalid input, API
failures) reject.

Turnstile-protected apps can pass `turnstileToken`, or provide
`onChallenge: (challenge) => Promise<string>` to solve the challenge lazily —
the SDK retries the session create once with the returned token.

## Lower-level cloud access

`SessionsClient` exposes the raw Public Sessions API (create / get / poll with
exponential backoff and `Retry-After` handling) when you want to manage the
lifecycle yourself:

```ts
import { SessionsClient } from '@eazip/core/cloud';

const client = new SessionsClient({ publicKey: 'pk_ez_...', apiBaseUrl: 'https://api.eazip.io' });
const created = await client.create({ files });
const session = await client.poll(created.id, { clientSecret: created.clientSecret });
```

## Entry points

- `@eazip/core` — everything
- `@eazip/core/local` — browser zipping only (no cloud code)
- `@eazip/core/cloud` — cloud sessions only (no zip.js)
- `@eazip/core/shared` — types, errors, input/download utilities

## Notes

- Browser-first ESM. Local URL sources are fetched by the browser and must be
  CORS-accessible; cloud URL sources are fetched by the Eazip API.
- `@eazip/core` supersedes the earlier `@eazip/client` beta.
- Use the beta channel while in preview: APIs may change before `1.0.0`.

## License

MIT
