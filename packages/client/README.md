# @eazip/client

Framework-independent browser SDK for Eazip Public Sessions.

## Install

```sh
npm install @eazip/client
```

## Create and Poll a Session

```ts
import { EazipClient } from '@eazip/client';

const client = new EazipClient({
  publicKey: 'pk_ez_...',
});

const created = await client.sessions.create({
  files: [
    { url: 'https://assets.example.com/photo.jpg', filename: 'photo.jpg' },
  ],
  zipName: 'photos.zip',
});

const session = await client.sessions.poll(created.id, {
  clientSecret: created.clientSecret,
  onStatusChange: (next) => {
    console.log(next.job.status);
  },
});
```

## One-shot Helper

```ts
import { createZip } from '@eazip/client';

await createZip({
  strategy: 'cloud',
  publicKey: 'pk_ez_...',
  files: [{ url: 'https://assets.example.com/photo.jpg' }],
  zipName: 'photos.zip',
  onStatusChange: (status) => {
    console.log(status);
  },
});
```

## Error Handling

```ts
import {
  EazipChallengeRequiredError,
  EazipSessionExpiredError,
} from '@eazip/client';

try {
  await client.sessions.create({ files });
} catch (error) {
  if (error instanceof EazipChallengeRequiredError) {
    console.log(error.challenge.challengeUrl);
  }
  if (error instanceof EazipSessionExpiredError) {
    console.log('The session is no longer available.');
  }
}
```

## Notes

- This package is browser-first and uses Public Sessions.
- Cloud mode accepts URL source files.
- React bindings will live in `@eazip/react`.
