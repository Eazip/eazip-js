# Eazip JavaScript SDK

Create ZIP files from browser apps with Eazip Public Sessions.

This repository contains public, browser-facing SDK packages only. Server APIs,
dashboard code, infrastructure, and internal Eazip services are not part of
this repository.

## Packages

- `@eazip/client`: framework-independent browser client for Public Sessions
- `@eazip/react`: React bindings, planned

## Install

```sh
npm install @eazip/client@beta
```

## Create a ZIP

```ts
import { createZip } from '@eazip/client';

const result = await createZip({
  strategy: 'cloud',
  publicKey: 'pk_ez_...',
  files: [
    { url: 'https://assets.example.com/report.pdf', filename: 'report.pdf' },
  ],
  zipName: 'documents.zip',
  onStatusChange: (status) => {
    console.log(status);
  },
});

await result.download();
```

## Advanced Sessions

Use the lower-level session client when you want to store the session id,
customize polling, or control the download UI yourself.

```ts
import { EazipClient } from '@eazip/client';

const client = new EazipClient({ publicKey: 'pk_ez_...' });

const created = await client.sessions.create({
  files: [{ url: 'https://assets.example.com/report.pdf' }],
  zipName: 'documents.zip',
});

const session = await client.sessions.poll(created.id, {
  clientSecret: created.clientSecret,
});

const firstZip = session.job.zips[0];
if (firstZip?.downloadUrl) {
  window.location.assign(firstZip.downloadUrl);
}
```

## Browser Scope

`@eazip/client` is designed for browser Public Session integrations. Backend
usage with secret keys should use Eazip server APIs directly.

## Status

Use the beta channel while the SDK is in preview. APIs may change before `1.0.0`.

## License

MIT
