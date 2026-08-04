import type { EazipErrorBase } from './errors.js';

/** Selects whether the ZIP is created in the browser or by Eazip Cloud. */
export type EazipStrategy = 'local' | 'cloud';

/** Selects whether Cloud generates downloads on demand or stores them ahead of time. */
export type EazipMode = 'stored' | 'stream';

/** A remote URL or browser `File`/`Blob`, with an optional ZIP entry name. */
export type EazipSourceFile =
  | { url: string; filename?: string }
  | { file: File | Blob; filename?: string };

/** A single file source in any accepted shape. */
export type EazipFileInput = string | File | Blob | EazipSourceFile;

/** Anything `startZip`/`createZip` accept as the `files` option. */
export type ZipInput = readonly EazipFileInput[] | FileList | File | Blob;

/** A `fetch`-compatible implementation for custom runtimes, auth, or tests. */
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// ---------------------------------------------------------------------------
// Progress & per-file errors
// ---------------------------------------------------------------------------

/** The current stage of a local ZIP job. */
export type EazipProgressPhase = 'starting' | 'fetching' | 'adding' | 'finalizing' | 'completed';

/** Progress reported while a local ZIP is fetching and adding files. */
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

/** Lifecycle state for one ZIP output. */
export type EazipZipStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** Metadata and download location for one ZIP or split ZIP part. */
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

/** A completed browser-generated ZIP backed by a `Blob`. */
export type LocalZipOutput = EazipZipOutput & {
  status: 'completed';
  blob: Blob;
  size: number;
};

// ---------------------------------------------------------------------------
// Cloud session DTOs (Public Sessions API)
// ---------------------------------------------------------------------------

/** Lifecycle state returned by the Cloud Sessions API. */
export type EazipCloudJobStatus = 'pending' | 'preparing' | 'processing' | 'completed' | 'failed';

/** Details needed to complete an anti-abuse challenge. */
export type EazipChallenge = {
  provider: 'turnstile';
  challengeUrl: string;
  siteKey?: string;
};

/** Current Cloud job details attached to a session. */
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

/** A Cloud session and its latest job state. */
export type EazipCloudSession = {
  id: string;
  createdAt: string;
  expiresAt: string;
  job: EazipCloudJob;
};

/** Credentials and initial state returned after creating a Cloud session. */
export type CreatedCloudSession = {
  id: string;
  clientSecret: string;
  status: EazipCloudJobStatus;
  createdAt: string;
  expiresAt: string;
};

/** Request options used by `SessionsClient.create()`. */
export type CreateCloudSessionOptions = {
  files: EazipSourceFile[];
  zipName?: string;
  mode?: EazipMode;
  failOnUrlError?: boolean;
  maxZipSizeBytes?: number;
  turnstileToken?: string;
  signal?: AbortSignal;
};

/** Authentication and cancellation options used by `SessionsClient.get()`. */
export type GetCloudSessionOptions = {
  clientSecret: string;
  signal?: AbortSignal;
};

/** Options used to poll a Cloud session until it reaches a terminal state. */
export type PollCloudSessionOptions = GetCloudSessionOptions & {
  /** Called after each successful poll, including non-terminal states. */
  onSession?: (session: EazipCloudSession) => void;
  /** Initial delay between polls. */
  initialIntervalMs?: number;
  /** Upper bound for the backoff delay. */
  maxIntervalMs?: number;
  /** Multiplier applied after each non-terminal response. */
  backoffMultiplier?: number;
  /** Adds randomized delay to avoid synchronized polling clients. */
  jitter?: boolean;
};

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/** Backoff controls for Cloud session polling. */
export type PollingOptions = {
  /** Initial delay between polls. */
  initialIntervalMs?: number;
  /** Upper bound for the backoff delay. */
  maxIntervalMs?: number;
  /** Multiplier applied after each non-terminal response. */
  backoffMultiplier?: number;
  /** Adds randomized delay to avoid synchronized polling clients. */
  jitter?: boolean;
};

/**
 * Options shared by local and Cloud jobs.
 *
 * @inline
 */
type BaseZipOptions = {
  /** Requested archive filename. `.zip` is added when omitted. */
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
  /** Cancels local work or stops Cloud polling when aborted. */
  signal?: AbortSignal;
  /** Custom `fetch` implementation used for URL sources and Cloud requests. */
  fetch?: FetchLike;
  /** Convenience mirror of `job.subscribe`, called with each new snapshot. */
  onChange?: (snapshot: ZipJobSnapshot) => void;
};

/** Options for creating a ZIP entirely in the browser. */
export type LocalZipOptions = BaseZipOptions &
  { files: ZipInput } & {
    strategy?: 'local';
    /** 0-9, default 6. */
    compressionLevel?: number;
    /** Parallel URL fetches, default 4. */
    concurrency?: number;
    onProgress?: (progress: EazipProgress) => void;
  };

/** Values passed to a backend-provided Cloud session factory. */
export type CloudCreateSessionContext = {
  signal: AbortSignal;
  zipName?: string;
  mode: EazipMode;
  failOnUrlError?: boolean;
  maxZipSizeBytes?: number;
};

/** Session credentials returned by a backend-provided Cloud session factory. */
export type CloudCreateSessionResult = {
  sessionId: string;
  clientSecret: string;
  apiBaseUrl?: string;
  createdAt?: string;
  expiresAt?: string;
  status?: EazipCloudJobStatus;
};

/** Cloud options when the browser creates a session with a public key. */
export type CloudSourceZipOptions = BaseZipOptions &
  { files: ZipInput } & {
    strategy: 'cloud';
    apiBaseUrl?: string;
    /**
     * 'stream' (default): the zip is generated on demand at download time —
     * ready sooner, each download regenerates. 'stored': built once and kept
     * in storage. The Public App's allowed modes still apply.
     */
    mode?: EazipMode;
    polling?: PollingOptions;
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

/** Cloud options when a trusted backend creates the session. */
export type CloudSessionZipOptions = BaseZipOptions & {
    strategy: 'cloud';
    apiBaseUrl?: string;
    /**
     * 'stream' (default): the zip is generated on demand at download time —
     * ready sooner, each download regenerates. 'stored': built once and kept
     * in storage. The Public App's allowed modes still apply.
     */
    mode?: EazipMode;
    polling?: PollingOptions;
    createSession: (context: CloudCreateSessionContext) => Promise<CloudCreateSessionResult>;
    files?: never;
    publicKey?: never;
    turnstileToken?: never;
    onChallenge?: never;
    /** Optional initial count for UI before the first poll returns url_count. */
    filesTotal?: number;
  };

/** Either browser-created or backend-created Cloud session options. */
export type CloudZipOptions = CloudSourceZipOptions | CloudSessionZipOptions;

/** Options accepted by the framework-agnostic `startZip()` and `createZip()` APIs. */
export type StartZipOptions = LocalZipOptions | CloudZipOptions;

/** Credentials and polling controls for reconnecting to an existing Cloud session. */
export type ResumeZipOptions = {
  /** Existing Cloud session identifier. */
  sessionId: string;
  /** Bearer secret returned when the session was created. */
  clientSecret: string;
  /** Cloud API origin. Defaults to `DEFAULT_API_BASE_URL`. */
  apiBaseUrl?: string;
  /** Custom `fetch` implementation used for Cloud requests. */
  fetch?: FetchLike;
  /** Stops polling when aborted; it does not cancel the server-side job. */
  signal?: AbortSignal;
  polling?: PollingOptions;
  /** Called whenever the observable job snapshot changes. */
  onChange?: (snapshot: ZipJobSnapshot) => void;
};

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/** Result from a browser-generated ZIP job. */
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

/** Result from a completed or partially completed Cloud ZIP job. */
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

/** Result returned by either the local or Cloud strategy. */
export type ZipResult = LocalZipResult | CloudZipResult;

// ---------------------------------------------------------------------------
// ZipJob
// ---------------------------------------------------------------------------

/** Lifecycle state exposed by a `ZipJob` snapshot. */
export type ZipJobStatus = 'starting' | 'processing' | 'completed' | 'partial' | 'failed' | 'aborted';

/** Cloud credentials and the latest remote job state retained for resume flows. */
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

/** Immutable observable state for a running or completed ZIP job. */
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

/** Observable handle returned immediately when a ZIP job starts. */
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
