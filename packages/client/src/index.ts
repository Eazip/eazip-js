export { EazipClient } from './cloud/index.js';
export * from './local/index.js';
export * from './shared/types.js';
export * from './shared/errors.js';

import { EazipClient } from './cloud/index.js';
import { createLocalZip } from './local/index.js';
import { EazipDownloadExpiredError } from './shared/errors.js';
import type { CloudCreateZipResult, CreateZipOptions, CreateZipResult, EazipCloudSession } from './shared/types.js';

export async function createZip(options: CreateZipOptions): Promise<CreateZipResult> {
  const strategy = options.strategy ?? 'local';
  if (strategy === 'local') return createLocalZip(options);
  if (!options.publicKey) {
    throw new TypeError('createZip with strategy "cloud" requires publicKey');
  }

  options.onStatusChange?.('creating');
  const client = new EazipClient({
    publicKey: options.publicKey,
    ...(options.apiBaseUrl ? { apiBaseUrl: options.apiBaseUrl } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
  const createOptions = {
    files: options.files,
    mode: options.mode ?? 'stored',
    ...(options.zipName ? { zipName: options.zipName } : {}),
    ...(options.failOnUrlError != null ? { failOnUrlError: options.failOnUrlError } : {}),
    ...(options.maxZipSizeBytes != null ? { maxZipSizeBytes: options.maxZipSizeBytes } : {}),
    ...(options.signal ? { signal: options.signal } : {}),
  };
  const created = await client.sessions.create(createOptions);
  options.onStatusChange?.(created.status);

  const pollOptions = {
    clientSecret: created.clientSecret,
    onStatusChange: (next: EazipCloudSession) => options.onStatusChange?.(next.job.status),
    ...(options.signal ? { signal: options.signal } : {}),
  };
  const session = await client.sessions.poll(created.id, pollOptions);

  const result: CloudCreateZipResult = {
    strategy: 'cloud',
    status: 'completed',
    sessionId: session.id,
    zips: session.job.zips,
    errors: [],
    download: async () => {
      const firstUrl = session.job.zips.find((zip) => zip.status === 'completed' && zip.downloadUrl)?.downloadUrl;
      if (!firstUrl) throw new EazipDownloadExpiredError();
      globalThis.location?.assign(firstUrl);
    },
  };
  return result;
}
