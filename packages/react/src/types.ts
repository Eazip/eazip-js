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

/**
 * Options shared by all React download strategies.
 *
 * @inline
 */
type EazipBaseDownloadOptions = {
  /** Requested archive filename. `.zip` is added when omitted. */
  zipName?: string;
  /** Fails the whole job instead of returning a partial ZIP when a URL fails. */
  failOnUrlError?: boolean;
  /** Best-effort maximum size for each split ZIP output. */
  maxZipSizeBytes?: number;
  /** Cancels local work or stops Cloud polling when aborted. */
  signal?: AbortSignal;
  /** Custom `fetch` implementation for URL sources and Cloud requests. */
  fetch?: FetchLike;
  /** Called whenever the underlying Core job snapshot changes. */
  onChange?: (snapshot: ZipJobSnapshot) => void;
  /** Starts downloading automatically when the result becomes ready. */
  autoDownload?: boolean;
};

/** Download options for creating a ZIP entirely in the browser. */
export type EazipLocalDownloadOptions = EazipBaseDownloadOptions & {
  strategy?: 'local';
  /** Files, blobs, URLs, or source descriptors to include. */
  files: ZipInput;
  /** Deflate level from 0 through 9. Defaults to 6. */
  compressionLevel?: number;
  /** Maximum parallel URL fetches. Defaults to 4. */
  concurrency?: number;
  /** Called with local fetch and archive progress. */
  onProgress?: (progress: EazipProgress) => void;
};

/** Cloud download options when the browser creates a session with a public key. */
export type EazipCloudSourceDownloadOptions = EazipBaseDownloadOptions & {
  strategy: 'cloud';
  /** URL sources to include in the Cloud ZIP. */
  files: ZipInput;
  /** Browser-safe Eazip Cloud public key; falls back to provider config. */
  publicKey?: string;
  /** Cloud API origin; falls back to provider config or the SDK default. */
  apiBaseUrl?: string;
  /** Cloud generation mode. */
  mode?: EazipMode;
  /** Pre-obtained Turnstile token sent with session creation. */
  turnstileToken?: string;
  /** Resolves an anti-abuse challenge and returns its verification token. */
  onChallenge?: (challenge: EazipChallenge) => Promise<string>;
  polling?: PollingOptions;
  createSession?: never;
};

/** Cloud download options when a trusted backend creates the session. */
export type EazipCloudSessionDownloadOptions = EazipBaseDownloadOptions & {
  strategy: 'cloud';
  /** Trusted callback that creates a Cloud session without exposing credentials. */
  createSession: (context: CloudCreateSessionContext) => Promise<CloudCreateSessionResult>;
  /** Cloud API origin; falls back to provider config or the SDK default. */
  apiBaseUrl?: string;
  /** Cloud generation mode passed to the session callback. */
  mode?: EazipMode;
  polling?: PollingOptions;
  /** Initial UI count before the first session poll returns. */
  filesTotal?: number;
  files?: never;
  publicKey?: never;
  turnstileToken?: never;
  onChallenge?: never;
};

/** Options accepted by `useEazip().download()`. */
export type EazipDownloadOptions =
  | EazipLocalDownloadOptions
  | EazipCloudSourceDownloadOptions
  | EazipCloudSessionDownloadOptions;

/** UI lifecycle state for the active tray task. */
export type EazipTaskState = 'processing' | 'completed' | 'partial' | 'failed' | 'expired';

/** One downloadable ZIP shown in a React task. */
export type EazipTaskZip = {
  filename: string;
  size?: number;
  downloadUrl?: string;
  downloadStarted: boolean;
};

/** A source omitted from a partial local ZIP result. */
export type EazipTaskSkippedFile = {
  filename?: string;
  reason: string;
};

/** Serializable fatal error shown by the React integration. */
export type EazipTaskError = {
  code: string;
  message: string;
};

/** UI-facing representation of a Core ZIP job. */
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

/** Commands and observable task state returned by `useEazip()`. */
export type UseEazipResult = {
  /** Start a zip download. Fire & forget: returns the task id; errors surface on the task. */
  download: (options: EazipDownloadOptions) => string;
  /** Most recently active task, or null when the tray is idle. */
  task: EazipTask | null;
  /** All observable tasks. Currently contains at most the active task. */
  tasks: EazipTask[];
  /** True while the latest task is processing. */
  isBusy: boolean;
  /** Cancels and removes the matching task, or the latest task when omitted. */
  cancel: (taskId?: string) => void;
  /** Restarts a retained failed or expired request. */
  retry: (taskId?: string) => void;
  /** Removes the matching task from the UI. */
  dismiss: (taskId?: string) => void;
  /** Downloads one ZIP part from a completed task. */
  downloadZip: (taskId: string, zipIndex: number) => void;
  /** Downloads every ZIP part from a completed task. */
  downloadAll: (taskId?: string) => void;
};

/** Shared defaults for `EazipProvider`, `useEazip`, and `EazipTray`. */
export type EazipConfig = {
  /** Browser-safe Cloud key applied when a download does not provide one. */
  publicKey?: string;
  /** Cloud API origin applied when a download does not provide one. */
  apiBaseUrl?: string;
  /** Default execution strategy. */
  strategy?: EazipStrategy;
  /** Shared download defaults; per-call options take precedence. */
  defaults?: {
    zipName?: string;
    compressionLevel?: number;
    mode?: EazipMode;
    failOnUrlError?: boolean;
    maxZipSizeBytes?: number;
  };
  /** Automatically start downloads when ZIP output becomes ready. */
  autoDownload?: boolean;
  /** Persist resumable Cloud task metadata in local storage. Defaults to true. */
  persist?: boolean;
  /** Local-storage key used for persistence. */
  storageKey?: string;
};

/** Immutable state exposed by `EazipStore`. */
export type EazipSnapshot = {
  tasks: EazipTask[];
  expanded: boolean;
};
