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
 * Start a zip job. Returns synchronously; observe it via `getSnapshot()` /
 * `subscribe()` or await `job.done`.
 */
export function startZip(options: LocalZipOptions): ZipJob<LocalZipResult>;
export function startZip(options: CloudZipOptions): ZipJob<CloudZipResult>;
export function startZip(options: StartZipOptions): ZipJob;
export function startZip(options: StartZipOptions): ZipJob {
  return options.strategy === 'cloud' ? startCloudZip(options) : startLocalZip(options);
}

/** One-shot: start a zip job and wait for its result. Always rejects (never throws synchronously). */
export function createZip(options: LocalZipOptions): Promise<LocalZipResult>;
export function createZip(options: CloudZipOptions): Promise<CloudZipResult>;
export function createZip(options: StartZipOptions): Promise<ZipResult>;
export async function createZip(options: StartZipOptions): Promise<ZipResult> {
  return startZip(options).done;
}
