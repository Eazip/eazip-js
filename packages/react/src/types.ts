'use client';

import type { EazipMode, EazipProgress, EazipStrategy, ZipInput } from '@eazip/core';

export type EazipDownloadInput = ZipInput;

export type EazipDownloadOptions = {
  zipName?: string;
  strategy?: EazipStrategy;
  compressionLevel?: number;
  mode?: EazipMode;
  failOnUrlError?: boolean;
  maxZipSizeBytes?: number;
  publicKey?: string;
  apiBaseUrl?: string;
  autoDownload?: boolean;
};

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
  download: (files: EazipDownloadInput, options?: EazipDownloadOptions) => string;
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
  defaults?: Partial<
    Pick<EazipDownloadOptions, 'zipName' | 'compressionLevel' | 'mode' | 'failOnUrlError' | 'maxZipSizeBytes'>
  >;
  autoDownload?: boolean;
  persist?: boolean;
  storageKey?: string;
};

export type EazipSnapshot = {
  tasks: EazipTask[];
  expanded: boolean;
};
