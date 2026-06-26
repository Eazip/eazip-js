import { describe, expect, it, vi } from 'vitest';
import { EazipClient } from '../src/cloud';
import {
  EazipApiError,
  EazipChallengeRequiredError,
  EazipSessionExpiredError,
} from '../src/shared/errors';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
}

describe('EazipClient cloud sessions', () => {
  it('creates a session with the public key header and snake_case body', async () => {
    const fetch = vi.fn(async () => jsonResponse({
      success: true,
      session: {
        id: 'zs_123',
        status: 'pending',
        created_at: '2026-06-10T00:00:00.000Z',
        expires_at: '2026-06-10T12:00:00.000Z',
      },
      client_secret: 'zcs_secret',
    }));
    const client = new EazipClient({ publicKey: 'pk_ez_test', apiBaseUrl: 'https://api.example.test/', fetch });

    const session = await client.sessions.create({
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
    expect(request.files).toEqual([{ url: 'https://assets.example/a.pdf', filename: 'a.pdf' }]);
  });

  it('gets a session with the client secret bearer token and maps zips to camelCase', async () => {
    const fetch = vi.fn(async () => jsonResponse({
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
        },
      },
    }));
    const client = new EazipClient({ publicKey: 'pk_ez_test', apiBaseUrl: 'https://api.example.test', fetch });

    const session = await client.sessions.get('zs_123', { clientSecret: 'zcs_secret' });

    expect(fetch).toHaveBeenCalledWith('https://api.example.test/v1/sessions/zs_123', expect.objectContaining({
      method: 'GET',
      headers: { Authorization: 'Bearer zcs_secret' },
    }));
    expect(session.job).toMatchObject({
      status: 'completed',
      urlCount: 1,
      fileCount: 1,
      zipFilename: 'docs.zip',
      failOnUrlError: false,
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

  it('maps SESSION_EXPIRED to a typed expired error', async () => {
    const fetch = vi.fn(async () => jsonResponse({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Session has expired' },
    }, { status: 410 }));
    const client = new EazipClient({ publicKey: 'pk_ez_test', apiBaseUrl: 'https://api.example.test', fetch });

    await expect(client.sessions.get('zs_123', { clientSecret: 'zcs_secret' })).rejects.toBeInstanceOf(EazipSessionExpiredError);
  });

  it('maps challenge-required fixture responses to challenge errors', async () => {
    const fetch = vi.fn(async () => jsonResponse({
      success: false,
      error: {
        code: 'PUBLIC_APP_CHALLENGE_REQUIRED',
        message: 'Additional verification is required',
        challenge: {
          provider: 'turnstile',
          challenge_url: 'https://challenge.eazip.io/c/ch_123',
        },
      },
    }, { status: 403 }));
    const client = new EazipClient({ publicKey: 'pk_ez_test', apiBaseUrl: 'https://api.example.test', fetch });

    await expect(client.sessions.create({
      files: [{ url: 'https://assets.example/a.pdf' }],
    })).rejects.toMatchObject({
      challenge: { provider: 'turnstile', challengeUrl: 'https://challenge.eazip.io/c/ch_123' },
    } satisfies Partial<EazipChallengeRequiredError>);
  });

  it('does not retry edge rate limited polling responses', async () => {
    const fetch = vi.fn(async () => jsonResponse({
      success: false,
      error: { code: 'EDGE_RATE_LIMITED', message: 'Too many requests' },
    }, { status: 429, headers: { 'Retry-After': '1' } }));
    const client = new EazipClient({ publicKey: 'pk_ez_test', apiBaseUrl: 'https://api.example.test', fetch });

    await expect(client.sessions.poll('zs_123', {
      clientSecret: 'zcs_secret',
      initialIntervalMs: 1,
      jitter: false,
    })).rejects.toBeInstanceOf(EazipApiError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
