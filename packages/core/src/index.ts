export type * from './shared/types.js';
export type { EazipErrorOptions } from './shared/errors.js';
export {
  EazipAbortError,
  EazipApiError,
  EazipChallengeRequiredError,
  EazipDownloadExpiredError,
  EazipErrorBase,
  EazipJobFailedError,
  EazipNetworkError,
  EazipQuotaError,
  EazipRateLimitError,
  EazipSessionExpiredError,
  EazipSessionRevokedError,
  EazipValidationError,
  isEazipError,
} from './shared/errors.js';
export { startLocalZip, createLocalZip } from './local/index.js';
export { startCloudZip, resumeZip } from './cloud/index.js';

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
