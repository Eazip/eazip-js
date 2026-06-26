import type { EazipChallenge } from './types';

export type EazipErrorOptions = {
  status?: number | undefined;
  retryAfterMs?: number | undefined;
  cause?: unknown;
};

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

export class EazipApiError extends EazipErrorBase {}

export class EazipNetworkError extends EazipErrorBase {
  constructor(message = 'Network request failed', options: EazipErrorOptions = {}) {
    super('NETWORK_ERROR', message, options);
  }
}

export class EazipChallengeRequiredError extends EazipApiError {
  readonly challenge: EazipChallenge;

  constructor(challenge: EazipChallenge, message = 'Additional verification is required', options: EazipErrorOptions = {}) {
    super('PUBLIC_APP_CHALLENGE_REQUIRED', message, options);
    this.challenge = challenge;
  }
}

export class EazipDownloadExpiredError extends EazipApiError {
  constructor(message = 'Download URL is expired or unavailable', options: EazipErrorOptions = {}) {
    super('DOWNLOAD_URL_EXPIRED', message, options);
  }
}

export class EazipSessionExpiredError extends EazipApiError {
  constructor(message = 'Session has expired', options: EazipErrorOptions = {}) {
    super('SESSION_EXPIRED', message, options);
  }
}

export class EazipAbortError extends EazipErrorBase {
  constructor(message = 'Operation aborted', options: EazipErrorOptions = {}) {
    super('ABORT_ERR', message, options);
  }
}

export class EazipUnsupportedError extends EazipErrorBase {
  constructor(code: string, message: string, options: EazipErrorOptions = {}) {
    super(code, message, options);
  }
}

export function isEazipError(error: unknown): error is EazipErrorBase {
  return error instanceof EazipErrorBase;
}
