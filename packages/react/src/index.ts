'use client';

export { useEazip } from './use-eazip.js';
export { EazipProvider, type EazipProviderProps } from './context.js';
export { EazipTray, type EazipTrayProps } from './tray/EazipTray.js';

export type {
  EazipConfig,
  EazipCloudSessionDownloadOptions,
  EazipCloudSourceDownloadOptions,
  EazipDownloadOptions,
  EazipLocalDownloadOptions,
  EazipSnapshot,
  EazipTask,
  EazipTaskError,
  EazipTaskSkippedFile,
  EazipTaskState,
  EazipTaskZip,
  UseEazipResult,
} from './types.js';

export { en, ja, type EazipTrayLocale, type EazipTrayMessages } from './i18n/index.js';

export { EazipStore, type EazipStoreDeps } from './store/store.js';

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
} from '@eazip/core';

export type {
  EazipError,
  EazipMode,
  EazipProgress,
  EazipSourceFile,
  EazipStrategy,
  EazipZipOutput,
  ZipInput,
  ZipJob,
  ZipJobSnapshot,
  ZipJobStatus,
} from '@eazip/core';
