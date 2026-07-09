'use client';

import type {
  CloudCreateSessionContext,
  CloudCreateSessionResult,
  EazipChallenge,
  EazipMode,
  EazipProgress,
  EazipStrategy,
  FetchLike,
  PollingOptions,
  ZipInput,
  ZipJobSnapshot,
} from '@eazip/core';

type EazipBaseDownloadOptions = {
  zipName?: string;
  failOnUrlError?: boolean;
  maxZipSizeBytes?: number;
  signal?: AbortSignal;
  fetch?: FetchLike;
  onChange?: (snapshot: ZipJobSnapshot) => void;
  autoDownload?: boolean;
};

export type EazipLocalDownloadOptions = EazipBaseDownloadOptions & {
  strategy?: 'local';
  files: ZipInput;
  compressionLevel?: number;
  concurrency?: number;
  onProgress?: (progress: EazipProgress) => void;
};

export type EazipCloudSourceDownloadOptions = EazipBaseDownloadOptions & {
  strategy: 'cloud';
  files: ZipInput;
  publicKey?: string;
  apiBaseUrl?: string;
  mode?: EazipMode;
  turnstileToken?: string;
  onChallenge?: (challenge: EazipChallenge) => Promise<string>;
  polling?: PollingOptions;
  createSession?: never;
};

export type EazipCloudSessionDownloadOptions = EazipBaseDownloadOptions & {
  strategy: 'cloud';
  createSession: (context: CloudCreateSessionContext) => Promise<CloudCreateSessionResult>;
  apiBaseUrl?: string;
  mode?: EazipMode;
  polling?: PollingOptions;
  filesTotal?: number;
  files?: never;
  publicKey?: never;
  turnstileToken?: never;
  onChallenge?: never;
};

export type EazipDownloadOptions =
  | EazipLocalDownloadOptions
  | EazipCloudSourceDownloadOptions
  | EazipCloudSessionDownloadOptions;

export type EazipTaskState = 'processing' | 'completed' | 'partial' | 'failed' | 'expired';

export type EazipTaskZip = {
  filename: string;
  size?: number;
  downloadUrl?: string;
  downloadStarted: boolean;
};

export type EazipTaskSkippedFile = {
  filename?: string;
  reason: string;
};

export type EazipTaskError = {
  code: string;
  message: string;
};

export type EazipTask = {
  id: string;
  state: EazipTaskState;
  strategy: EazipStrategy;
  zipName: string | null;
  filesTotal: number;
  progress: EazipProgress | null;
  zips: EazipTaskZip[];
  skippedCount: number;
  skipped: EazipTaskSkippedFile[];
  error: EazipTaskError | null;
  downloadStarted: boolean;
  createdAt: number;
  expiresAt: number | null;
  canRetry: boolean;
};

export type UseEazipResult = {
  /** Start a zip download. Fire & forget: returns the task id; errors surface on the task. */
  download: (options: EazipDownloadOptions) => string;
  task: EazipTask | null;
  tasks: EazipTask[];
  isBusy: boolean;
  cancel: (taskId?: string) => void;
  retry: (taskId?: string) => void;
  dismiss: (taskId?: string) => void;
  downloadZip: (taskId: string, zipIndex: number) => void;
  downloadAll: (taskId?: string) => void;
};

export type EazipConfig = {
  publicKey?: string;
  apiBaseUrl?: string;
  strategy?: EazipStrategy;
  defaults?: {
    zipName?: string;
    compressionLevel?: number;
    mode?: EazipMode;
    failOnUrlError?: boolean;
    maxZipSizeBytes?: number;
  };
  autoDownload?: boolean;
  persist?: boolean;
  storageKey?: string;
};

export type EazipSnapshot = {
  tasks: EazipTask[];
  expanded: boolean;
};
