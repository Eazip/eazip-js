export { EazipClient } from './cloud';
export * from './shared/types';
export * from './shared/errors';

import { EazipClient } from './cloud';
import { EazipDownloadExpiredError, EazipUnsupportedError } from './shared/errors';
import type { CloudCreateZipResult, CreateZipOptions, CreateZipResult, EazipCloudSession } from './shared/types';

export async function createZip(options: CreateZipOptions): Promise<CreateZipResult> {
  const strategy = options.strategy ?? 'local';
  if (strategy !== 'cloud') {
    throw new EazipUnsupportedError('LOCAL_NOT_IMPLEMENTED', 'Local ZIP creation is not implemented yet');
  }
  if (!options.publicKey) {
    throw new TypeError('createZip with strategy "cloud" requires publicKey');
  }

  options.onStatusChange?.('creating');
  const client = new EazipClient({
    publicKey: options.publicKey,
    ...(options.apiBaseUrl ? { apiBaseUrl: options.apiBaseUrl } : {}),
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
