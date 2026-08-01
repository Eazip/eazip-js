export * from './shared/index.js';
export { startLocalZip, createLocalZip, normalizeEntryName, normalizeZipFilename, uniqueEntryName } from './local/index.js';
export { startCloudZip, resumeZip, DEFAULT_API_BASE_URL, SessionsClient, type SessionsClientOptions } from './cloud/index.js';

import { startCloudZip } from './cloud/index.js';
import { startLocalZip } from './local/index.js';
import type {
  CloudZipOptions,
  LocalZipOptions,
  StartZipOptions,
  CloudZipResult,
  LocalZipResult,
  ZipJob,
  ZipResult,
} from './shared/types.js';

/**
 * Starts a local or Cloud ZIP job and returns its observable handle immediately.
 *
 * Observe progress with `getSnapshot()` / `subscribe()`, or await `job.done`.
 */
export function startZip(options: LocalZipOptions): ZipJob<LocalZipResult>;
export function startZip(options: CloudZipOptions): ZipJob<CloudZipResult>;
export function startZip(options: StartZipOptions): ZipJob;
export function startZip(options: StartZipOptions): ZipJob {
  return options.strategy === 'cloud' ? startCloudZip(options) : startLocalZip(options);
}

/**
 * Starts a local or Cloud ZIP job and waits for its result.
 *
 * This is the one-shot alternative to `startZip()`. The returned promise
 * rejects for validation, cancellation, and fatal job errors.
 */
export function createZip(options: LocalZipOptions): Promise<LocalZipResult>;
export function createZip(options: CloudZipOptions): Promise<CloudZipResult>;
export function createZip(options: StartZipOptions): Promise<ZipResult>;
export async function createZip(options: StartZipOptions): Promise<ZipResult> {
  return startZip(options).done;
}
