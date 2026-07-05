# Architecture

This document is a map of the codebase for contributors: what lives where, the
invariants each layer maintains, and why the design is shaped the way it is.
It intentionally avoids details you can read from the code — when this document
and the code disagree, the code wins and this file needs a PR.

## Bird's eye view

eazip-js ships browser SDKs for zip downloads with two interchangeable
strategies behind one API:

- **local** — files are fetched/read and zipped inside the browser
  (`@zip.js/zip.js`, ZIP64).
- **cloud** — a zip job runs on the Eazip API (Public Sessions); the browser
  polls until signed download URLs are ready.

```
packages/core    @eazip/core   — framework-independent engine (the heart)
packages/react   @eazip/react  — React bindings + <EazipTray /> UI
examples/client  vanilla TS demo (Vite, port 5173)
examples/react   React demo (Vite, port 5174)
scripts/         release + packaging guards
```

`@eazip/react` depends on `@eazip/core`. Nothing depends on `@eazip/react`.
The server side of the cloud strategy is **not** in this repository; the SDK
talks to it over a fixed wire contract (see "Cloud" below).

## The central abstraction: `ZipJob`

Everything in `@eazip/core` hangs off one abstraction, defined in
[`shared/types.ts`](packages/core/src/shared/types.ts) and implemented by
`JobController` in [`shared/job.ts`](packages/core/src/shared/job.ts):

```
startZip(options)  ──►  ZipJob ── getSnapshot() / subscribe()   (state)
createZip(options) ──►  await job.done                          (one-shot sugar)
resumeZip(session) ──►  ZipJob                                  (cloud, after reload)
```

- A job is **created synchronously**; all work starts on a microtask so callers
  can subscribe before the first state transition.
- State is an **immutable snapshot** with stable function identities — the
  contract is exactly what React's `useSyncExternalStore` needs, so UIs (and
  `@eazip/react`'s store) can consume a job directly.
- State machine: `starting → processing → completed | partial | failed | aborted`.
  Terminal transitions happen exactly once; later events are ignored.
- **Partial results are data, not exceptions.** `done` resolves for both
  `completed` and `partial`; it rejects only for fatal errors and abort. Per-file
  problems land in `snapshot.errors` / `result.errors`. An internal no-op
  `catch` on `done` keeps subscribe-only consumers free of unhandled-rejection
  noise.
- Cloud jobs expose `{ sessionId, clientSecret, expiresAt }` on the snapshot
  **as soon as the session is created**, not when the job finishes. This is what
  makes reload-resume possible for callers that persist the session.

The engines (`local/engine.ts`, `cloud/engine.ts`) drive a `JobController` and
never touch listeners or promises directly; the controller owns commit
discipline, abort linking, and terminal-once semantics.

## @eazip/core layout

```
src/
  index.ts          startZip strategy dispatch, createZip, re-exports
  shared/
    types.ts        the shared vocabulary (options, snapshots, results, DTOs)
    errors.ts       error taxonomy (EazipErrorBase + subclasses, wire codes)
    job.ts          JobController — snapshot store, done deferred, abort
    input.ts        toSourceFiles(): File[]/FileList/string[]/Blob → sources
    download.ts     triggerDownload (anchor click), object URLs, stagger
    abort.ts        AbortSignal helpers
  local/
    engine.ts       fetch pool → sequential zip writer → split → result
    pool.ts         ordered concurrency-limited mapper
    filenames.ts    zip/entry name sanitization + dedup
  cloud/
    engine.ts       create (+ challenge retry) → poll → result; resumeZip
    sessions.ts     SessionsClient — raw Public Sessions API
    polling.ts      backoff + jitter + visibility-aware poll loop
    http.ts         fetch wrapper, error envelope mapping, Retry-After
    mappers.ts      snake_case ⇄ camelCase
    api-types.ts    wire DTOs
```

### Entry-point isolation (invariant)

- `@eazip/core/local` must not import any cloud code.
- `@eazip/core/cloud` must not import `@zip.js/zip.js`.

The root entry imports both by design; the subpaths are the tree-shaken routes.
`scripts/check-package-imports.mjs` greps `dist/` and fails the build if this
invariant breaks.

### Local engine

Pipeline (see `runLocal` in [`local/engine.ts`](packages/core/src/local/engine.ts)):

1. **Fetch stage** — URL sources are fetched through `pool.ts` with a
   concurrency limit (default 4). Results come back as promises **in input
   order**, so the writer can consume sequentially while later fetches run
   ahead. Blob/File sources resolve immediately.
2. **Write stage** — a single sequential `ZipWriter` keeps entry order
   deterministic and makes size accounting well-defined.

Key semantics:

- `failOnUrlError: false` (default): a failed URL becomes a per-file
  `EazipError` (`LOCAL_SOURCE_FETCH_FAILED` / `LOCAL_SOURCE_READ_FAILED`), the
  entry is skipped, and the result is `partial`. If *every* source fails, the
  job fails with `ALL_SOURCES_FAILED` — an empty zip is never a useful partial.
- `maxZipSizeBytes` is a **best-effort split boundary**, mirroring the cloud
  API: output is split into multiple zips so each stays under the cap. The
  estimate for "would the next file overflow this part?" is conservative
  (uncompressed size + deflate worst-case expansion + entry overhead), corrected
  with the actual `compressedSize` after each `add()`. A single file larger
  than the cap gets its own over-limit part — never an error.
- Part filenames are assigned after all parts are closed (`export.zip` when
  single, `export_part01.zip…` when split), which is safe because a zip's own
  filename is not part of the archive bytes.
- Entry names go through `filenames.ts`: path-traversal sanitization plus
  ` (N)` dedup suffixes.

### Cloud engine

The wire contract (fixed, implemented server-side outside this repo):

```
POST /v1/sessions            X-Eazip-Public-Key, Origin-validated, snake_case body
  → { session: {id, status, created_at, expires_at}, client_secret }
GET  /v1/sessions/:id        Authorization: Bearer <client_secret>
  → { session: { …, job: { status, url_count, file_count, zips: [...] } } }
```

Polling is the only status channel. `polling.ts` implements exponential backoff
with jitter (2s → 10s, ×1.5), pauses while the tab is hidden, honors
`Retry-After`, and treats a server-side `job.status === 'failed'` as
`EazipJobFailedError`.

Flow in [`cloud/engine.ts`](packages/core/src/cloud/engine.ts):

1. `create` — on `PUBLIC_APP_CHALLENGE_REQUIRED` with an `onChallenge` handler,
   retry exactly once with the returned Turnstile token; a second challenge
   propagates.
2. Commit the session into the snapshot immediately (the resume contract).
3. Poll to terminal; every poll updates `snapshot.session.jobStatus`/`zips`.
4. `partial` is computed client-side as `url_count - file_count` (the public
   API does not expose per-URL failure details).

`resumeZip` runs the same engine minus the create step. `SessionsClient` stays
exported as the low-level escape hatch.

Product-opinionated defaults live in the engine layer, not in `SessionsClient`:
the engine sends `mode: 'stream'` unless the caller chooses otherwise (front-end
exports favor time-to-ready), while `SessionsClient` omits unset fields and
defers to server defaults. Keep new defaults at the engine level for the same
reason.

### Error taxonomy

`EazipErrorBase` carries `code`, optional HTTP `status`, and `retryAfterMs`.
Dedicated subclasses exist only where a consumer realistically branches:
challenge, session expired/revoked, download expired, rate limit, quota, job
failed, abort, validation. Every other wire code stays a generic
`EazipApiError` with `code` preserved — don't add subclasses without a caller
that needs `instanceof`.

## @eazip/react layout

```
src/
  use-eazip.ts       useEazip() — useSyncExternalStore over the store
  context.tsx        optional EazipProvider (config / store isolation)
  internal/          context-or-default-store resolution + hydration effect
  store/
    store.ts         EazipStore — a single-task UI adapter over ZipJob
    task.ts          ZipJobSnapshot → EazipTask mapping
    persistence.ts   versioned localStorage envelope (cloud tasks only)
  tray/              EazipTray + state bodies, theme, injected CSS
  i18n/              en/ja message catalogs (typed, overridable)
```

Design rules:

- **The store does not orchestrate zipping.** It calls `startZip`/`resumeZip`
  and mirrors job snapshots into an `EazipTask` (adding UI-only state:
  `downloadStarted` flags, the `expired` state, expand/collapse). If you find
  yourself re-implementing engine behavior in the store, the logic belongs in
  `@eazip/core`.
- **Single-job tray**: a new `download()` aborts and replaces the current task.
  The API exposes `tasks: EazipTask[]` for forward compatibility, but its
  length is ≤ 1 today.
- **Provider-optional**: `useEazip()` and `<EazipTray/>` fall back to a lazily
  created module-level store. `EazipProvider` exists for shared config and for
  isolation (tests inject a store with fake deps via its `store` prop).
- **Persistence** (`eazip-tray-v1`, versioned envelope): cloud tasks only —
  the session (`sessionId` + `clientSecret`) is persisted as soon as it appears
  and polling resumes on hydrate. Local results are blobs and cannot survive a
  reload, so they are deliberately not persisted. Hydration runs only from an
  effect, never during render or module evaluation.
- **`expired` is a react-side state**: the store maps
  `EazipSessionExpired/Revoked/DownloadExpired` failures and passed
  `expiresAt` deadlines onto it; core jobs only know `failed`.
- **Tray styling** is an injected `<style>` tag + CSS custom properties
  (`--ez-*`), no CSS file import. Copy comes exclusively from the i18n
  catalogs; components must not contain literal UI strings.
- Every source file starts with `'use client'` (preserved by tsc) and nothing
  touches `window`/`localStorage`/`matchMedia` at module scope — the packages
  must import cleanly in Node and Next.js App Router SSR.

## Cross-cutting conventions

- **Build**: plain `tsc` per package (`dist/` mirrors `src/`), ESM only,
  NodeNext resolution — relative imports must end in `.js`. `strict`,
  `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`; prefer conditional
  spreads over assigning `undefined` to optional properties.
- **Testing** (`vitest`; jsdom only in the react package): everything
  side-effectful is injectable — `fetch` in core options, and the react store
  takes `{ startZip, resumeZip, getStorage, now, generateId }` so tests drive a
  `FakeZipJob` instead of real engines. Core tests build real zips in-memory
  and read them back with zip.js.
- **Releases**: `npm run release:info` validates version/tag pairs
  (`beta` ⇄ `-beta.N`), the `Publish` workflow (manual dispatch) publishes one
  package at a time and tags `core-vX` / `react-vX`. `pack:dry-run` and
  `test:package-imports` (imports + entry isolation) are release gates.

## What this repo is not

- No server code: the Public Sessions API, dashboards, and infrastructure live
  elsewhere. The SDK treats the API as a fixed external contract.
- No backend SDK: browser-first only; secret-key usage is out of scope.
- Streaming zips to disk (File System Access API), webhooks/SSE status, and
  session cancellation are currently out of scope — see README "Status".
