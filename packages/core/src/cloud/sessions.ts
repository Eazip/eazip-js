import { EazipNetworkError } from '../shared/errors.js';
import type {
  CreatedCloudSession,
  CreateCloudSessionOptions,
  EazipCloudSession,
  GetCloudSessionOptions,
  PollCloudSessionOptions,
} from '../shared/types.js';
import type { ApiCreateSessionResponse, ApiSessionDetailResponse } from './api-types.js';
import type { FetchLike } from './http.js';
import { getFetch, normalizeApiBaseUrl, readJsonResponse } from './http.js';
import { mapCreatedSession, mapSessionDetail, toCreateSessionRequest } from './mappers.js';
import { pollSession, retryAfterDelay } from './polling.js';

/** Connection options for the low-level Cloud Sessions API client. */
export type SessionsClientOptions = {
  publicKey: string;
  apiBaseUrl: string;
  fetch?: FetchLike;
};

/**
 * Low-level client for creating, reading, and polling Eazip Cloud sessions.
 *
 * Most applications should use `startZip({ strategy: 'cloud' })`. Use this
 * client when you need direct control over the session lifecycle.
 */
export class SessionsClient {
  private readonly publicKey: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: SessionsClientOptions) {
    this.publicKey = options.publicKey;
    this.apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl);
    this.fetchImpl = getFetch(options.fetch);
  }

  /** Creates a Cloud session from URL sources. */
  async create(options: CreateCloudSessionOptions): Promise<CreatedCloudSession> {
    try {
      const response = await this.fetchImpl(`${this.apiBaseUrl}/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Eazip-Public-Key': this.publicKey,
        },
        body: JSON.stringify(toCreateSessionRequest(options)),
        ...(options.signal ? { signal: options.signal } : {}),
      });
      return mapCreatedSession(await readJsonResponse<ApiCreateSessionResponse>(response));
    } catch (error) {
      if (error instanceof Error && error.name !== 'TypeError') throw error;
      throw new EazipNetworkError(undefined, { cause: error });
    }
  }

  /** Fetches the latest state of one authenticated Cloud session. */
  async get(sessionId: string, options: GetCloudSessionOptions): Promise<EazipCloudSession> {
    try {
      const response = await this.fetchImpl(`${this.apiBaseUrl}/v1/sessions/${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${options.clientSecret}`,
        },
        ...(options.signal ? { signal: options.signal } : {}),
      });
      return mapSessionDetail(await readJsonResponse<ApiSessionDetailResponse>(response));
    } catch (error) {
      if (error instanceof Error && error.name !== 'TypeError') throw error;
      throw new EazipNetworkError(undefined, { cause: error });
    }
  }

  /** Polls a Cloud session until it completes, fails, expires, or is aborted. */
  async poll(sessionId: string, options: PollCloudSessionOptions): Promise<EazipCloudSession> {
    return pollSession(async (signal) => {
      while (true) {
        try {
          return await this.get(sessionId, {
            clientSecret: options.clientSecret,
            ...(signal ? { signal } : {}),
          });
        } catch (error) {
          if (await retryAfterDelay(error, signal)) continue;
          throw error;
        }
      }
    }, options);
  }
}
