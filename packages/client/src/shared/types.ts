export type EazipStrategy = 'local' | 'cloud';

export type EazipSourceFile =
  | { url: string; filename?: string }
  | { file: File | Blob; filename?: string };

export type EazipStatus =
  | 'idle'
  | 'creating'
  | 'pending'
  | 'preparing'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'failed';

export type EazipCloudJobStatus = 'pending' | 'preparing' | 'processing' | 'completed' | 'failed';

export type EazipZipStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type EazipMode = 'stored' | 'stream';

export type EazipChallenge = {
  provider: 'turnstile';
  challengeUrl: string;
  siteKey?: string;
};

export type EazipZipOutput = {
  id?: string;
  sequence: number;
  status: EazipZipStatus;
  filename: string;
  fileCount?: number;
  size?: number;
  downloadUrl?: string;
};

export type EazipError = {
  code: string;
  message: string;
  fileIndex?: number;
  filename?: string;
  retryable?: boolean;
  file?: EazipSourceFile;
  cause?: unknown;
};

export type EazipCloudSessionSummary = {
  id: string;
  status: EazipCloudJobStatus;
  createdAt: string;
  expiresAt: string;
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

export type CreateCloudSessionOptions = {
  files: EazipSourceFile[];
  zipName?: string;
  mode?: EazipMode;
  failOnUrlError?: boolean;
  maxZipSizeBytes?: number;
  turnstileToken?: string;
  signal?: AbortSignal;
};

export type CreatedCloudSession = {
  id: string;
  clientSecret: string;
  status: EazipCloudJobStatus;
  createdAt: string;
  expiresAt: string;
};

export type GetCloudSessionOptions = {
  clientSecret: string;
  signal?: AbortSignal;
};

export type PollCloudSessionOptions = GetCloudSessionOptions & {
  onStatusChange?: (session: EazipCloudSession) => void;
  initialIntervalMs?: number;
  maxIntervalMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
};

export type CreateZipOptions = {
  files: EazipSourceFile[];
  zipName?: string;
  strategy?: EazipStrategy;
  signal?: AbortSignal;
  publicKey?: string;
  apiBaseUrl?: string;
  mode?: EazipMode;
  failOnUrlError?: boolean;
  maxZipSizeBytes?: number;
  onStatusChange?: (status: EazipStatus) => void;
};

export type CloudCreateZipResult = {
  strategy: 'cloud';
  status: 'completed';
  sessionId: string;
  zips: EazipZipOutput[];
  errors: EazipError[];
  download: () => Promise<void>;
};

export type CreateZipResult = CloudCreateZipResult;
