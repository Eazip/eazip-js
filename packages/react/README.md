# @eazip/react

Zip downloads for React apps — one hook, one component.

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

`zip.download(...)` is fire & forget: it kicks off the export and returns immediately.
`<EazipTray />` takes it from there — an inline floating tray that shows progress,
completion, partial results, failures, and expiry, then gets out of the way. No CSS
import, no provider, no configuration required.

## Install

```sh
npm install @eazip/react
```

Requires React 18+. Files are zipped in the browser by default (via
[`@eazip/core`](https://github.com/Eazip/eazip-js/tree/main/packages/core)) — nothing
is uploaded.

## `useEazip()`

```ts
const zip = useEazip();

zip.download(options);         // start an export, returns a task id
zip.task;                      // current task (state, progress, zips, errors) or null
zip.isBusy;                    // true while an export is processing
zip.cancel();                  // abort the running export
zip.retry();                   // re-run the last export
zip.dismiss();                 // clear the tray
zip.downloadZip(taskId, i);    // download one zip of a multi-zip result
zip.downloadAll();             // download every zip
```

`files` accepts `File[]`, a `FileList`, URL strings, or `@eazip/core` source objects:

```ts
zip.download({
  files: [
    { file: blob, filename: 'notes.txt' },
    { url: 'https://assets.example.com/hero.png' },
  ],
  zipName: 'assets.zip',
});
```

Errors never reject the call — they land on `zip.task` and render as a calm, recoverable
state in the tray.

## `<EazipTray />`

| Prop | Default | Description |
| --- | --- | --- |
| `placement` | `'corner'` | `'corner'` (bottom-right), `'bar'` (bottom-center), `'anchored'` (top-right) |
| `theme` | `'auto'` | `'light'`, `'dark'`, or follow `prefers-color-scheme` |
| `accent` | `'#3056d3'` | accent color for progress and highlights |
| `autoDownload` | `true` | start the download automatically when the zip is ready |
| `autoHideMs` | `20000` | auto-dismiss delay after a started download; `0` disables |
| `locale` | `'en'` | `'en'` or `'ja'` |
| `messages` | — | partial override of any tray copy |
| `className` | — | extra class on the tray root |
| `zIndex` | `9999` | stacking context for the tray |
| `offset` | — | `{ x, y }` pixel shift from the default anchor |
| `container` | `document.body` | portal target |
| `onStateChange` | — | called on task state transitions |

The tray is invisible until a download starts, expands inline (never a modal), and stays
until the file is actually downloaded. It announces state changes politely
(`role="status"`), supports keyboard use, and respects `prefers-reduced-motion`.

## Configuration with `EazipProvider` (optional)

Everything works without a provider. Add one to share configuration:

```tsx
import { EazipProvider } from '@eazip/react';

<EazipProvider
  config={{
    strategy: 'cloud',
    publicKey: 'pk_ez_...',
    defaults: { zipName: 'export.zip' },
  }}
>
  <App />
</EazipProvider>;
```

## Large downloads: the cloud strategy

Browser-side zipping is great for a handful of files, but it holds everything in memory
and dies with the tab. For hundreds or thousands of files — or multi-gigabyte exports —
switch the same API to
[Eazip Cloud Public Sessions](https://eazip.io/docs/cloud?utm_source=eazip_js&utm_medium=package_readme&utm_campaign=cloud_activation&utm_content=react_cloud_docs):

```tsx
zip.download({ strategy: 'cloud', publicKey: 'pk_ez_...', files: urls });
```

For very large exports, your backend can create the Public Session so the
browser never receives the full URL list:

```tsx
zip.download({
  strategy: 'cloud',
  zipName: 'export.zip',
  filesTotal: 50_000,
  createSession: async ({ signal, zipName, mode }) => {
    const response = await fetch('/api/exports/123/eazip-session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ zipName, mode }),
    });
    if (!response.ok) throw new Error('Failed to create Eazip session');
    return response.json(); // { sessionId, clientSecret, apiBaseUrl? }
  },
});
```

With the cloud strategy the zip is built server-side and the tray gains superpowers:

- exports survive a page reload — the tray restores itself and resumes progress
- download links stay valid for 24 hours (the tray shows a calm expiry state after)
- huge exports split into multiple zips automatically, listed in the tray

[Create a Public App](https://eazip.io/cloud/?utm_source=eazip_js&utm_medium=package_readme&utm_campaign=cloud_activation&utm_content=react_public_app)
to get a public key. Cloud sources must be URLs reachable by the Eazip API. Cloud zips
default to stream mode (generated on demand at download time — ready sooner); pass
`mode: 'stored'` to keep a built archive instead.

## Error handling

`@eazip/react` re-exports the `@eazip/core` error classes and types, so advanced flows
(Turnstile challenges, custom session handling) need only one import:

```ts
import { isEazipError, EazipChallengeRequiredError } from '@eazip/react';
```

## Notes

- ESM only, React 18+, works in Next.js App Router out of the box (`'use client'` is baked in).
- State is kept in a tiny external store; cloud exports persist to `localStorage`
  (`persist: false` opts out).
- Use the beta channel while in preview: APIs may change before `1.0.0`.

## License

MIT
