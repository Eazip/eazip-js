import type { FetchLike } from './http';
import { SessionsClient } from './sessions';

export type EazipClientOptions = {
  publicKey: string;
  apiBaseUrl?: string;
  fetch?: FetchLike;
};

export class EazipClient {
  readonly sessions: SessionsClient;

  constructor(options: EazipClientOptions) {
    if (!options.publicKey) {
      throw new TypeError('EazipClient requires a publicKey');
    }
    const sessionOptions = {
      publicKey: options.publicKey,
      apiBaseUrl: options.apiBaseUrl ?? 'https://api.eazip.io',
      ...(options.fetch ? { fetch: options.fetch } : {}),
    };
    this.sessions = new SessionsClient({
      ...sessionOptions,
    });
  }
}
