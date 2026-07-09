import type { EazipErrorBase } from './errors.js';

export type EazipStrategy = 'local' | 'cloud';

export type EazipMode = 'stored' | 'stream';

export type EazipSourceFile =
  | { url: string; filename?: string }
  | { file: File | Blob; filename?: string };

/** A single file source in any accepted shape. */
export type EazipFileInput = string | File | Blob | EazipSourceFile;

/** Anything `startZip`/`createZip` accept as the `files` option. */
export type ZipInput = readonly EazipFileInput[] | FileList | File | Blob;

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// ---------------------------------------------------------------------------
// Progress & per-file errors
// ---------------------------------------------------------------------------

export type EazipProgressPhase = 'starting' | 'fetching' | 'adding' | 'finalizing' | 'completed';

export type EazipProgress = {
  phase: EazipProgressPhase;
  filesTotal: number;
  /** Processed files: added to a zip or skipped with a per-file error. */
  filesCompleted: number;
  /** Grows as sizes become known (Content-Length / blob sizes); may be incomplete. */
  bytesTotal?: number;
  bytesProcessed?: number;
  currentFileIndex?: number;
  currentFileName?: string;
};

/** A non-fatal, per-file error. The zip is still produced without this file. */
export type EazipError = {
  code: string;
  message: string;
  fileIndex?: number;
  filename?: string;
  cause?: unknown;
};

// ---------------------------------------------------------------------------
// Zip outputs
// ---------------------------------------------------------------------------

export type EazipZipStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type EazipZipOutput = {
  id?: string;
  sequence: number;
  status: EazipZipStatus;
  filename: string;
  fileCount?: number;
  size?: number;
  /** Local: object URL. Cloud: signed download URL. */
  downloadUrl?: string;
};

export type LocalZipOutput = EazipZipOutput & {
  status: 'completed';
  blob: Blob;
  size: number;
};

// ---------------------------------------------------------------------------
// Cloud session DTOs (Public Sessions API)
// ---------------------------------------------------------------------------

export type EazipCloudJobStatus = 'pending' | 'preparing' | 'processing' | 'completed' | 'failed';

export type EazipChallenge = {
  provider: 'turnstile';
  challengeUrl: string;
  siteKey?: string;
};

export type EazipCloudJob = {
  status: EazipCloudJobStatus;
  mode: EazipMode;
  urlCount: number;
  fileCount?: number;
  zipFilename: string;
  failOnUrlError: boolean;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  multiZip: boolean;
  maxZipSizeBytes: number | null;
  zipCount: number;
  totalSize: number | null;
  zips: EazipZipOutput[];
};

export type EazipCloudSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  job: EazipCloudJob;
};

export type CreatedCloudSession = {
  id: string;
  clientSecret: string;
  status: EazipCloudJobStatus;
  createdAt: string;
  expiresAt: string;
};

export type CreateCloudSessionOptions = {
  files: EazipSourceFile[];
  zipName?: string;
  mode?: EazipMode;
  failOnUrlError?: boolean;
  maxZipSizeBytes?: number;
  turnstileToken?: string;
  signal?: AbortSignal;
};

export type GetCloudSessionOptions = {
  clientSecret: string;
  signal?: AbortSignal;
};

export type PollCloudSessionOptions = GetCloudSessionOptions & {
  onSession?: (session: EazipCloudSession) => void;
  initialIntervalMs?: number;
  maxIntervalMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
};

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export type PollingOptions = {
  initialIntervalMs?: number;
  maxIntervalMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
};

type BaseZipOptions = {
  zipName?: string;
  /**
   * false (local default): failed URL sources are skipped and reported in
   * `errors`, producing a partial result. true: fail on the first URL error.
   */
  failOnUrlError?: boolean;
  /**
   * Best-effort size cap per zip: the output is split into multiple zips so
   * that each stays under this size. A single file larger than the cap gets
   * its own (over-limit) zip — same as the Eazip API default.
   */
  maxZipSizeBytes?: number;
  signal?: AbortSignal;
  fetch?: FetchLike;
  /** Convenience mirror of `job.subscribe`, called with each new snapshot. */
  onChange?: (snapshot: ZipJobSnapshot) => void;
};

type FileZipOptions = BaseZipOptions & {
  files: ZipInput;
};

export type LocalZipOptions = FileZipOptions & {
  strategy?: 'local';
  /** 0-9, default 6. */
  compressionLevel?: number;
  /** Parallel URL fetches, default 4. */
  concurrency?: number;
  onProgress?: (progress: EazipProgress) => void;
};

type CloudBaseZipOptions = BaseZipOptions & {
  strategy: 'cloud';
  apiBaseUrl?: string;
  /**
   * 'stream' (default): the zip is generated on demand at download time —
   * ready sooner, each download regenerates. 'stored': built once and kept
   * in storage. The Public App's allowed modes still apply.
   */
  mode?: EazipMode;
  polling?: PollingOptions;
};

export type CloudCreateSessionContext = {
  signal: AbortSignal;
  zipName?: string;
  mode: EazipMode;
  failOnUrlError?: boolean;
  maxZipSizeBytes?: number;
};

export type CloudCreateSessionResult = {
  sessionId: string;
  clientSecret: string;
  apiBaseUrl?: string;
  createdAt?: string;
  expiresAt?: string;
  status?: EazipCloudJobStatus;
};

export type CloudSourceZipOptions = FileZipOptions & CloudBaseZipOptions & {
  publicKey: string;
  createSession?: never;
  /** Pre-obtained Turnstile token, sent with the first create request. */
  turnstileToken?: string;
  /**
   * Called when the API requires a Turnstile challenge. Resolve with a token
   * and the SDK retries the create once; a second challenge propagates.
   */
  onChallenge?: (challenge: EazipChallenge) => Promise<string>;
};

export type CloudSessionZipOptions = CloudBaseZipOptions & {
  createSession: (context: CloudCreateSessionContext) => Promise<CloudCreateSessionResult>;
  files?: never;
  publicKey?: never;
  turnstileToken?: never;
  onChallenge?: never;
  /** Optional initial count for UI before the first poll returns url_count. */
  filesTotal?: number;
};

export type CloudZipOptions = CloudSourceZipOptions | CloudSessionZipOptions;

export type StartZipOptions = LocalZipOptions | CloudZipOptions;

export type ResumeZipOptions = {
  sessionId: string;
  clientSecret: string;
  apiBaseUrl?: string;
  fetch?: FetchLike;
  signal?: AbortSignal;
  polling?: PollingOptions;
  onChange?: (snapshot: ZipJobSnapshot) => void;
};

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type LocalZipResult = {
  strategy: 'local';
  status: 'completed' | 'partial';
  /** Base zip filename; part files are named `<stem>_partNN.zip` when split. */
  zipFilename: string;
  totalSize: number;
  zips: LocalZipOutput[];
  errors: EazipError[];
  skippedCount: number;
  download: (zipIndex?: number) => void;
  downloadAll: () => void;
  /** Revokes the object URLs backing `zips[].downloadUrl`. */
  dispose: () => void;
};

export type CloudZipResult = {
  strategy: 'cloud';
  status: 'completed' | 'partial';
  sessionId: string;
  clientSecret: string;
  expiresAt: string;
  session: EazipCloudSession;
  zips: EazipZipOutput[];
  errors: EazipError[];
  skippedCount: number;
  download: (zipIndex?: number) => void;
  downloadAll: () => void;
};

export type ZipResult = LocalZipResult | CloudZipResult;

// ---------------------------------------------------------------------------
// ZipJob
// ---------------------------------------------------------------------------

export type ZipJobStatus = 'starting' | 'processing' | 'completed' | 'partial' | 'failed' | 'aborted';

export type ZipJobSession = {
  sessionId: string;
  clientSecret: string;
  apiBaseUrl: string;
  createdAt: string;
  expiresAt: string;
  /** Latest polled cloud job status; null before the first poll. */
  jobStatus: EazipCloudJobStatus | null;
  /** Latest full job detail; null before the first poll. */
  job: EazipCloudJob | null;
};

export type ZipJobSnapshot = {
  jobId: string;
  strategy: EazipStrategy;
  status: ZipJobStatus;
  zipFilename: string | null;
  filesTotal: number;
  /** Local only; null for cloud jobs. */
  progress: EazipProgress | null;
  zips: EazipZipOutput[];
  /** Per-file skips (local). Always [] for cloud (the API reports counts only). */
  errors: EazipError[];
  skippedCount: number;
  /** Fatal error when status === 'failed'. */
  error: EazipErrorBase | null;
  /** Cloud: populated as soon as the session is created (resume: immediately). */
  session: ZipJobSession | null;
  /** Set when status is 'completed' or 'partial'. */
  result: ZipResult | null;
};

export interface ZipJob<R extends ZipResult = ZipResult> {
  readonly id: string;
  readonly strategy: EazipStrategy;
  /** Returns the same reference until the next state change (useSyncExternalStore-ready). */
  getSnapshot(): ZipJobSnapshot;
  subscribe(listener: () => void): () => void;
  /**
   * Resolves on 'completed' or 'partial'; rejects with EazipAbortError on
   * abort and with the fatal error on 'failed'. Safe to ignore — an internal
   * handler prevents unhandled rejection warnings.
   */
  readonly done: Promise<R>;
  /** Local: cancels fetching/zipping. Cloud: stops polling (the server job continues). */
  abort(): void;
  /** Downloads zips[zipIndex] (default 0). Throws EazipValidationError('NOT_READY') before completion. */
  download(zipIndex?: number): void;
  downloadAll(): void;
  /** Releases local object URLs. No-op for cloud jobs. */
  dispose(): void;
}
