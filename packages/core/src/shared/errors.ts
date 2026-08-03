import type { EazipChallenge, EazipCloudFailure } from './types.js';

/** Optional HTTP and cause metadata attached to Eazip errors. */
export type EazipErrorOptions = {
  status?: number | undefined;
  retryAfterMs?: number | undefined;
  cause?: unknown;
};

/** Base class for errors surfaced by the Core and React packages. */
export class EazipErrorBase extends Error {
  readonly code: string;
  readonly status: number | undefined;
  readonly retryAfterMs: number | undefined;
  override readonly cause?: unknown;

  constructor(code: string, message: string, options: EazipErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = options.status;
    this.retryAfterMs = options.retryAfterMs;
    this.cause = options.cause;
  }
}

/** Error response returned by an Eazip Cloud API. */
export class EazipApiError extends EazipErrorBase {}

/** Network transport failure before a usable API response was received. */
export class EazipNetworkError extends EazipErrorBase {
  constructor(message = 'Network request failed', options: EazipErrorOptions = {}) {
    super('NETWORK_ERROR', message, options);
  }
}

/** Cloud requires the caller to complete the attached anti-abuse challenge. */
export class EazipChallengeRequiredError extends EazipApiError {
  readonly challenge: EazipChallenge;

  constructor(challenge: EazipChallenge, message = 'Additional verification is required', options: EazipErrorOptions = {}) {
    super('PUBLIC_APP_CHALLENGE_REQUIRED', message, options);
    this.challenge = challenge;
  }
}

/** A generated download URL has expired or is no longer available. */
export class EazipDownloadExpiredError extends EazipApiError {
  constructor(message = 'Download URL is expired or unavailable', options: EazipErrorOptions = {}) {
    super('DOWNLOAD_URL_EXPIRED', message, options);
  }
}

/** The Cloud session expired before it could be used or resumed. */
export class EazipSessionExpiredError extends EazipApiError {
  constructor(message = 'Session has expired', options: EazipErrorOptions = {}) {
    super('SESSION_EXPIRED', message, options);
  }
}

/** The Cloud session was explicitly revoked. */
export class EazipSessionRevokedError extends EazipApiError {
  constructor(message = 'Session has been revoked', options: EazipErrorOptions = {}) {
    super('SESSION_REVOKED', message, options);
  }
}

/** A request was rejected by a rate limit and may include a retry delay. */
export class EazipRateLimitError extends EazipApiError {
  constructor(code = 'RATE_LIMITED', message = 'Too many requests', options: EazipErrorOptions = {}) {
    super(code, message, options);
  }
}

/** A Cloud plan or usage quota prevented the operation. */
export class EazipQuotaError extends EazipApiError {
  constructor(code: string, message = 'Plan or quota limit reached', options: EazipErrorOptions = {}) {
    super(code, message, options);
  }
}

/** The remote Cloud ZIP job reached a failed state. */
export class EazipJobFailedError extends EazipApiError {
  readonly failedCount: number;
  readonly failures: readonly EazipCloudFailure[];

  constructor(
    message = 'The zip job failed',
    options: EazipErrorOptions & {
      failedCount?: number;
      failures?: readonly EazipCloudFailure[];
    } = {},
  ) {
    super('JOB_FAILED', message, options);
    this.failures = Object.freeze([...(options.failures ?? [])]);
    this.failedCount = options.failedCount ?? this.failures.length;
  }
}

/** The caller cancelled the operation with `AbortSignal` or `ZipJob.abort()`. */
export class EazipAbortError extends EazipErrorBase {
  constructor(message = 'Operation aborted', options: EazipErrorOptions = {}) {
    super('ABORT_ERR', message, options);
  }
}

/** The SDK rejected invalid options, input, or an unavailable operation. */
export class EazipValidationError extends EazipErrorBase {
  constructor(code: string, message: string, options: EazipErrorOptions = {}) {
    super(code, message, options);
  }
}

/** Returns true when an unknown value is an SDK error with a stable `code`. */
export function isEazipError(error: unknown): error is EazipErrorBase {
  return error instanceof EazipErrorBase;
}

/** Coerce an arbitrary thrown value into an EazipErrorBase for job snapshots. */
export function toEazipError(error: unknown): EazipErrorBase {
  if (isEazipError(error)) return error;
  if (error instanceof Error) {
    return new EazipErrorBase('UNKNOWN', error.message, { cause: error });
  }
  return new EazipErrorBase('UNKNOWN', String(error), { cause: error });
}
