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

export type SessionsClientOptions = {
  publicKey: string;
  apiBaseUrl: string;
  fetch?: FetchLike;
};

export class SessionsClient {
  private readonly publicKey: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: SessionsClientOptions) {
    this.publicKey = options.publicKey;
    this.apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl);
    this.fetchImpl = getFetch(options.fetch);
  }

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
