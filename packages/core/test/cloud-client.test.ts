import { describe, expect, it, vi } from 'vitest';
import { SessionsClient, startCloudZip, resumeZip } from '../src/cloud/index.js';
import { startZip } from '../src/index.js';
import {
  EazipApiError,
  EazipChallengeRequiredError,
  EazipJobFailedError,
  EazipQuotaError,
  EazipRateLimitError,
  EazipSessionExpiredError,
  EazipSessionRevokedError,
  EazipValidationError,
} from '../src/shared/errors.js';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
}

function createdBody(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    session: {
      id: 'zs_123',
      status: 'pending',
      created_at: '2026-06-10T00:00:00.000Z',
      expires_at: '2026-06-10T12:00:00.000Z',
      ...overrides,
    },
    client_secret: 'zcs_secret',
  };
}

function sessionBody(jobOverrides: Record<string, unknown> = {}) {
  return {
    success: true,
    session: {
      id: 'zs_123',
      created_at: '2026-06-10T00:00:00.000Z',
      expires_at: '2026-06-10T12:00:00.000Z',
      job: {
        status: 'completed',
        mode: 'stored',
        url_count: 1,
        file_count: 1,
        zip_filename: 'docs.zip',
        fail_on_url_error: false,
        created_at: '2026-06-10T00:00:00.000Z',
        completed_at: '2026-06-10T00:02:00.000Z',
        expires_at: '2026-06-10T12:00:00.000Z',
        multi_zip: false,
        max_zip_size_bytes: null,
        zip_count: 1,
        total_size: 123,
        zips: [{
          id: 'zip_1',
          sequence: 1,
          status: 'completed',
          filename: 'docs.zip',
          file_count: 1,
          size: 123,
          download_url: 'https://api.example.test/download/token',
        }],
        ...jobOverrides,
      },
    },
  };
}

function fetchQueue(responses: (() => Response)[]) {
  let index = 0;
  return vi.fn(async () => {
    const next = responses[Math.min(index, responses.length - 1)]!;
    index += 1;
    return next();
  });
}

const FAST_POLLING = { initialIntervalMs: 1, jitter: false };

describe('SessionsClient', () => {
  it('creates a session with the public key header and snake_case body', async () => {
    const fetch = vi.fn(async () => jsonResponse(createdBody()));
    const client = new SessionsClient({ publicKey: 'pk_ez_test', apiBaseUrl: 'https://api.example.test/', fetch });

    const session = await client.create({
      files: [{ url: 'https://assets.example/a.pdf', filename: 'a.pdf' }],
      zipName: 'docs.zip',
      mode: 'stored',
      failOnUrlError: false,
      maxZipSizeBytes: 1_000_000_000,
    });

    expect(session).toEqual({
      id: 'zs_123',
      clientSecret: 'zcs_secret',
      status: 'pending',
      createdAt: '2026-06-10T00:00:00.000Z',
      expiresAt: '2026-06-10T12:00:00.000Z',
    });
    expect(fetch).toHaveBeenCalledWith('https://api.example.test/v1/sessions', expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Eazip-Public-Key': 'pk_ez_test',
      },
    }));
    const request = JSON.parse((fetch.mock.calls[0]?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(request).toMatchObject({
      zip_filename: 'docs.zip',
      mode: 'stored',
      fail_on_url_error: false,
      max_zip_size_bytes: 1_000_000_000,
    });
    expect(request['files']).toEqual([{ url: 'https://assets.example/a.pdf', filename: 'a.pdf' }]);
  });

  it('gets a session with the client secret bearer token and maps zips to camelCase', async () => {
    const fetch = vi.fn(async () => jsonResponse(sessionBody()));
    const client = new SessionsClient({ publicKey: 'pk_ez_test', apiBaseUrl: 'https://api.example.test', fetch });

    const session = await client.get('zs_123', { clientSecret: 'zcs_secret' });

    expect(fetch).toHaveBeenCalledWith('https://api.example.test/v1/sessions/zs_123', expect.objectContaining({
      method: 'GET',
      headers: { Authorization: 'Bearer zcs_secret' },
    }));
    expect(session.job).toMatchObject({
      status: 'completed',
      urlCount: 1,
      fileCount: 1,
      zipFilename: 'docs.zip',
      zipCount: 1,
      totalSize: 123,
    });
    expect(session.job.zips[0]).toEqual({
      id: 'zip_1',
      sequence: 1,
      status: 'completed',
      filename: 'docs.zip',
      fileCount: 1,
      size: 123,
      downloadUrl: 'https://api.example.test/download/token',
    });
  });

  it('omits mode when unset (raw layer defers to the server default)', async () => {
    const fetch = vi.fn(async () => jsonResponse(createdBody()));
    const client = new SessionsClient({ publicKey: 'pk', apiBaseUrl: 'https://api.example.test', fetch });
    await client.create({ files: [{ url: 'https://a/x' }] });
    const request = JSON.parse((fetch.mock.calls[0]?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect('mode' in request).toBe(false);
  });

  it('maps typed API errors', async () => {
    const cases: [Record<string, unknown>, number, new (...args: never[]) => Error][] = [
      [{ code: 'SESSION_EXPIRED' }, 410, EazipSessionExpiredError],
      [{ code: 'SESSION_REVOKED' }, 403, EazipSessionRevokedError],
      [{ code: 'QUOTA_EXCEEDED' }, 403, EazipQuotaError],
      [{ code: 'PLAN_LIMIT_EXCEEDED' }, 403, EazipQuotaError],
      [{ code: 'PUBLIC_APP_RATE_LIMITED' }, 429, EazipRateLimitError],
    ];
    for (const [error, status, expected] of cases) {
      const fetch = vi.fn(async () => jsonResponse({ success: false, error }, { status }));
      const client = new SessionsClient({ publicKey: 'pk', apiBaseUrl: 'https://api.example.test', fetch });
      await expect(client.get('zs_123', { clientSecret: 's' })).rejects.toBeInstanceOf(expected);
    }
  });

  it('exposes Retry-After on rate limit errors', async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({ success: false, error: { code: 'PUBLIC_APP_RATE_LIMITED', message: 'slow down' } }, {
        status: 429,
        headers: { 'Retry-After': '2' },
      }),
    );
    const client = new SessionsClient({ publicKey: 'pk', apiBaseUrl: 'https://api.example.test', fetch });
    await expect(client.create({ files: [{ url: 'https://a/x' }] })).rejects.toMatchObject({
      retryAfterMs: 2_000,
    });
  });

  it('does not retry edge rate limited polling responses', async () => {
    const fetch = vi.fn(async () => jsonResponse({
      success: false,
      error: { code: 'EDGE_RATE_LIMITED', message: 'Too many requests' },
    }, { status: 429, headers: { 'Retry-After': '1' } }));
    const client = new SessionsClient({ publicKey: 'pk_ez_test', apiBaseUrl: 'https://api.example.test', fetch });

    await expect(client.poll('zs_123', {
      clientSecret: 'zcs_secret',
      ...FAST_POLLING,
    })).rejects.toBeInstanceOf(EazipApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('startCloudZip', () => {
  it('exposes the session in the snapshot as soon as it is created', async () => {
    const fetch = fetchQueue([
      () => jsonResponse(createdBody()),
      () => jsonResponse(sessionBody({ status: 'processing', zips: [] })),
      () => jsonResponse(sessionBody()),
    ]);

    const job = startCloudZip({
      strategy: 'cloud',
      publicKey: 'pk_ez_test',
      apiBaseUrl: 'https://api.example.test',
      files: ['https://assets.example/a.pdf'],
      polling: FAST_POLLING,
      fetch,
    });

    expect(job.getSnapshot().status).toBe('starting');
    const history: { status: string; hasSession: boolean; hasResult: boolean }[] = [];
    job.subscribe(() => {
      const snapshot = job.getSnapshot();
      history.push({ status: snapshot.status, hasSession: snapshot.session !== null, hasResult: snapshot.result !== null });
    });

    const result = await job.done;

    // The session must have been exposed while still processing, before the result existed.
    expect(history).toContainEqual({ status: 'processing', hasSession: true, hasResult: false });
    expect(job.getSnapshot().session).toMatchObject({
      sessionId: 'zs_123',
      clientSecret: 'zcs_secret',
      apiBaseUrl: 'https://api.example.test',
      expiresAt: '2026-06-10T12:00:00.000Z',
    });
    expect(result).toMatchObject({
      strategy: 'cloud',
      status: 'completed',
      sessionId: 'zs_123',
      clientSecret: 'zcs_secret',
    });
    expect(result.zips[0]).toMatchObject({ filename: 'docs.zip', downloadUrl: 'https://api.example.test/download/token' });
    expect(job.getSnapshot().zipFilename).toBe('docs.zip');
  });

  it('defaults to stream mode and respects an explicit stored mode', async () => {
    const streamFetch = fetchQueue([
      () => jsonResponse(createdBody()),
      () => jsonResponse(sessionBody()),
    ]);
    await startCloudZip({
      strategy: 'cloud',
      publicKey: 'pk',
      apiBaseUrl: 'https://api.example.test',
      files: ['https://a/x'],
      polling: FAST_POLLING,
      fetch: streamFetch,
    }).done;
    const defaultRequest = JSON.parse((streamFetch.mock.calls[0]?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(defaultRequest['mode']).toBe('stream');

    const storedFetch = fetchQueue([
      () => jsonResponse(createdBody()),
      () => jsonResponse(sessionBody()),
    ]);
    await startCloudZip({
      strategy: 'cloud',
      publicKey: 'pk',
      apiBaseUrl: 'https://api.example.test',
      files: ['https://a/x'],
      mode: 'stored',
      polling: FAST_POLLING,
      fetch: storedFetch,
    }).done;
    const storedRequest = JSON.parse((storedFetch.mock.calls[0]?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(storedRequest['mode']).toBe('stored');
  });

  it('computes partial results from url_count vs file_count', async () => {
    const fetch = fetchQueue([
      () => jsonResponse(createdBody()),
      () => jsonResponse(sessionBody({ url_count: 5, file_count: 3 })),
    ]);
    const job = startCloudZip({
      strategy: 'cloud',
      publicKey: 'pk',
      apiBaseUrl: 'https://api.example.test',
      files: ['https://a/1', 'https://a/2', 'https://a/3', 'https://a/4', 'https://a/5'],
      polling: FAST_POLLING,
      fetch,
    });
    const result = await job.done;
    expect(result.status).toBe('partial');
    expect(result.skippedCount).toBe(2);
  });

  it('retries once with a token from onChallenge', async () => {
    const fetch = fetchQueue([
      () => jsonResponse({
        success: false,
        error: {
          code: 'PUBLIC_APP_CHALLENGE_REQUIRED',
          message: 'verify',
          challenge: { provider: 'turnstile', challenge_url: 'https://challenge.eazip.io/c/ch_1', site_key: '0xKEY' },
        },
      }, { status: 403 }),
      () => jsonResponse(createdBody()),
      () => jsonResponse(sessionBody()),
    ]);
    const onChallenge = vi.fn(async (challenge) => {
      expect(challenge).toEqual({ provider: 'turnstile', challengeUrl: 'https://challenge.eazip.io/c/ch_1', siteKey: '0xKEY' });
      return 'tok_123';
    });

    const job = startCloudZip({
      strategy: 'cloud',
      publicKey: 'pk',
      apiBaseUrl: 'https://api.example.test',
      files: ['https://a/x'],
      polling: FAST_POLLING,
      onChallenge,
      fetch,
    });
    await job.done;

    expect(onChallenge).toHaveBeenCalledTimes(1);
    const retryRequest = JSON.parse((fetch.mock.calls[1]?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(retryRequest['turnstile_token']).toBe('tok_123');
  });

  it('propagates the challenge when no onChallenge handler is given', async () => {
    const fetch = fetchQueue([
      () => jsonResponse({
        success: false,
        error: {
          code: 'PUBLIC_APP_CHALLENGE_REQUIRED',
          message: 'verify',
          challenge: { provider: 'turnstile', challenge_url: 'https://challenge.eazip.io/c/ch_1' },
        },
      }, { status: 403 }),
    ]);
    const job = startCloudZip({
      strategy: 'cloud',
      publicKey: 'pk',
      apiBaseUrl: 'https://api.example.test',
      files: ['https://a/x'],
      fetch,
    });
    await expect(job.done).rejects.toBeInstanceOf(EazipChallengeRequiredError);
    expect(job.getSnapshot().status).toBe('failed');
  });

  it('fails with EazipJobFailedError when the job fails server-side', async () => {
    const fetch = fetchQueue([
      () => jsonResponse(createdBody()),
      () => jsonResponse(sessionBody({ status: 'failed', zips: [] })),
    ]);
    const job = startCloudZip({
      strategy: 'cloud',
      publicKey: 'pk',
      apiBaseUrl: 'https://api.example.test',
      files: ['https://a/x'],
      polling: FAST_POLLING,
      fetch,
    });
    await expect(job.done).rejects.toBeInstanceOf(EazipJobFailedError);
  });

  it('rejects non-URL sources and missing public keys synchronously', () => {
    expect(() =>
      startCloudZip({ strategy: 'cloud', publicKey: 'pk', files: [new Blob(['x'])] }),
    ).toThrowError(EazipValidationError);
    expect(() =>
      startZip({ strategy: 'cloud', publicKey: '', files: ['https://a/x'] }),
    ).toThrowError(/publicKey/);
  });
});

describe('resumeZip', () => {
  it('exposes the session synchronously and completes on the first poll', async () => {
    const fetch = fetchQueue([() => jsonResponse(sessionBody())]);
    const job = resumeZip({
      sessionId: 'zs_123',
      clientSecret: 'zcs_secret',
      apiBaseUrl: 'https://api.example.test',
      polling: FAST_POLLING,
      fetch,
    });

    expect(job.getSnapshot().status).toBe('processing');
    expect(job.getSnapshot().session).toMatchObject({ sessionId: 'zs_123', clientSecret: 'zcs_secret' });

    const result = await job.done;
    expect(result.status).toBe('completed');
    expect(result.zips).toHaveLength(1);
    // filesTotal learned from the polled job.
    expect(job.getSnapshot().filesTotal).toBe(1);
  });

  it('maps an expired session to a failed job with EazipSessionExpiredError', async () => {
    const fetch = fetchQueue([
      () => jsonResponse({ success: false, error: { code: 'SESSION_EXPIRED', message: 'gone' } }, { status: 410 }),
    ]);
    const job = resumeZip({
      sessionId: 'zs_123',
      clientSecret: 'zcs_secret',
      apiBaseUrl: 'https://api.example.test',
      polling: FAST_POLLING,
      fetch,
    });
    await expect(job.done).rejects.toBeInstanceOf(EazipSessionExpiredError);
    expect(job.getSnapshot().status).toBe('failed');
    expect(job.getSnapshot().error).toBeInstanceOf(EazipSessionExpiredError);
  });

  it('maps multi-zip sessions', async () => {
    const fetch = fetchQueue([
      () => jsonResponse(sessionBody({
        multi_zip: true,
        zip_count: 2,
        zips: [
          { id: 'zip_1', sequence: 1, status: 'completed', filename: 'export_part01.zip', file_count: 3, size: 10, download_url: 'https://d/1' },
          { id: 'zip_2', sequence: 2, status: 'completed', filename: 'export_part02.zip', file_count: 2, size: 8, download_url: 'https://d/2' },
        ],
      })),
    ]);
    const job = resumeZip({
      sessionId: 'zs_123',
      clientSecret: 'zcs_secret',
      apiBaseUrl: 'https://api.example.test',
      polling: FAST_POLLING,
      fetch,
    });
    const result = await job.done;
    expect(result.zips.map((zip) => zip.filename)).toEqual(['export_part01.zip', 'export_part02.zip']);
  });
});
