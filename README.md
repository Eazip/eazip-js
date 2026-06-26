# Eazip JavaScript SDK

Browser SDKs for creating ZIP files with Eazip Public Sessions.

This repository contains public, browser-facing SDK packages only. Server APIs,
dashboard code, infrastructure, and internal Eazip services are not part of
this repository.

## Packages

- `@eazip/client`: framework-independent browser client for Public Sessions
- `@eazip/react`: React bindings, planned

## Install

```sh
npm install @eazip/client
```

## Usage

```ts
import { EazipClient } from '@eazip/client';

const eazip = new EazipClient({
  publicKey: 'pk_ez_...',
});

const created = await eazip.sessions.create({
  files: [
    { url: 'https://assets.example.com/report.pdf', filename: 'report.pdf' },
  ],
  zipName: 'documents.zip',
});

const session = await eazip.sessions.poll(created.id, {
  clientSecret: created.clientSecret,
  onStatusChange: (next) => {
    console.log(next.job.status);
  },
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

This SDK is currently in early preview. APIs may change before `1.0.0`.

## License

MIT
