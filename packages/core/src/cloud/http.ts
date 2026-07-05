import {
  EazipApiError,
  EazipChallengeRequiredError,
  EazipDownloadExpiredError,
  EazipNetworkError,
  EazipQuotaError,
  EazipRateLimitError,
  EazipSessionExpiredError,
  EazipSessionRevokedError,
} from '../shared/errors.js';
import type { EazipChallenge, FetchLike } from '../shared/types.js';
import type { ApiErrorResponse, ApiResponse } from './api-types.js';

export type { FetchLike };

export async function readJsonResponse<T>(response: Response): Promise<T> {
  let payload: ApiResponse<T> | null = null;
  try {
    payload = await response.json() as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || isApiErrorResponse(payload)) {
    throw mapApiError(response, payload);
  }
  if (!payload) {
    throw new EazipApiError('INVALID_RESPONSE', 'API response was not valid JSON', {
      status: response.status,
      retryAfterMs: parseRetryAfter(response.headers),
    });
  }
  return payload as T;
}

export function normalizeApiBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/+$/, '');
}

export function getFetch(fetchImpl?: FetchLike): FetchLike {
  if (fetchImpl) return fetchImpl;
  if (!globalThis.fetch) {
    throw new EazipNetworkError('No fetch implementation is available');
  }
  return globalThis.fetch.bind(globalThis);
}

export function parseRetryAfter(headers: Headers): number | undefined {
  const value = headers.get('Retry-After');
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function mapApiError(response: Response, payload: unknown): Error {
  const retryAfterMs = parseRetryAfter(response.headers);
  const apiError = isApiErrorResponse(payload) ? payload.error : null;
  const code = apiError?.code ?? `HTTP_${response.status}`;
  const message = apiError?.message ?? (response.statusText || 'API request failed');
  const options = { status: response.status, retryAfterMs };

  if (code === 'PUBLIC_APP_CHALLENGE_REQUIRED' && apiError?.challenge) {
    return new EazipChallengeRequiredError(mapChallenge(apiError.challenge), message, options);
  }
  if (code === 'SESSION_EXPIRED') {
    return new EazipSessionExpiredError(message, options);
  }
  if (code === 'SESSION_REVOKED') {
    return new EazipSessionRevokedError(message, options);
  }
  if (code === 'DOWNLOAD_URL_EXPIRED') {
    return new EazipDownloadExpiredError(message, options);
  }
  if (code === 'QUOTA_EXCEEDED' || code === 'PLAN_LIMIT_EXCEEDED') {
    return new EazipQuotaError(code, message, options);
  }
  if (response.status === 429 || code === 'PUBLIC_APP_RATE_LIMITED' || code === 'EDGE_RATE_LIMITED') {
    return new EazipRateLimitError(code, message, options);
  }
  return new EazipApiError(code, message, options);
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { success?: unknown; error?: unknown };
  return candidate.success === false &&
    typeof candidate.error === 'object' &&
    candidate.error !== null;
}

function mapChallenge(challenge: ApiErrorResponse['error']['challenge']): EazipChallenge {
  return {
    provider: challenge!.provider,
    challengeUrl: challenge!.challenge_url,
    ...(challenge!.site_key ? { siteKey: challenge!.site_key } : {}),
  };
}
