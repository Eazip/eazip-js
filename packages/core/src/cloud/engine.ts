import { isAbortLike, linkAbort } from '../shared/abort.js';
import { staggerDownloads, triggerDownload } from '../shared/download.js';
import {
  EazipChallengeRequiredError,
  EazipDownloadExpiredError,
  EazipValidationError,
  toEazipError,
} from '../shared/errors.js';
import { toSourceFiles } from '../shared/input.js';
import { JobController } from '../shared/job.js';
import type {
  CloudZipOptions,
  CloudZipResult,
  CreateCloudSessionOptions,
  CreatedCloudSession,
  EazipCloudSession,
  EazipZipOutput,
  ResumeZipOptions,
  ZipJob,
  ZipJobSession,
} from '../shared/types.js';
import { normalizeApiBaseUrl } from './http.js';
import { SessionsClient } from './sessions.js';

export const DEFAULT_API_BASE_URL = 'https://api.eazip.io';

export function startCloudZip(options: CloudZipOptions): ZipJob<CloudZipResult> {
  if (!options.publicKey) {
    throw new EazipValidationError(
      'PUBLIC_KEY_REQUIRED',
      'The cloud strategy requires a publicKey (create one at https://eazip.io)',
    );
  }
  const files = toSourceFiles(options.files).map((file) => {
    if (!('url' in file)) {
      throw new EazipValidationError('CLOUD_URL_SOURCES_ONLY', 'Cloud sessions only support URL source files');
    }
    return file;
  });
  const job = new JobController<CloudZipResult>('cloud', { filesTotal: files.length }, options.signal);
  queueMicrotask(() => {
    void runCloud(job, files, options);
  });
  return job;
}

export function resumeZip(options: ResumeZipOptions): ZipJob<CloudZipResult> {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl ?? DEFAULT_API_BASE_URL);
  const session: ZipJobSession = {
    sessionId: options.sessionId,
    clientSecret: options.clientSecret,
    apiBaseUrl,
    createdAt: '',
    expiresAt: '',
    jobStatus: null,
    job: null,
  };
  const job = new JobController<CloudZipResult>('cloud', { status: 'processing', session }, options.signal);
  queueMicrotask(() => {
    void runResume(job, options, apiBaseUrl);
  });
  return job;
}

async function runCloud(
  job: JobController<CloudZipResult>,
  files: { url: string; filename?: string }[],
  options: CloudZipOptions,
): Promise<void> {
  const engine = new AbortController();
  linkAbort(job.signal, engine);
  if (options.onChange) job.subscribe(() => options.onChange?.(job.getSnapshot()));

  try {
    const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl ?? DEFAULT_API_BASE_URL);
    const client = new SessionsClient({
      publicKey: options.publicKey,
      apiBaseUrl,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    });

    const createOptions: CreateCloudSessionOptions = {
      files,
      signal: engine.signal,
      // The SDK defaults to stream mode: no storage upload to wait for, so the
      // download is ready sooner. Pass mode: 'stored' for persisted archives.
      mode: options.mode ?? 'stream',
      ...(options.zipName ? { zipName: options.zipName } : {}),
      ...(options.failOnUrlError != null ? { failOnUrlError: options.failOnUrlError } : {}),
      ...(options.maxZipSizeBytes != null ? { maxZipSizeBytes: options.maxZipSizeBytes } : {}),
      ...(options.turnstileToken ? { turnstileToken: options.turnstileToken } : {}),
    };

    let created: CreatedCloudSession;
    try {
      created = await client.create(createOptions);
    } catch (error) {
      if (error instanceof EazipChallengeRequiredError && options.onChallenge) {
        const token = await options.onChallenge(error.challenge);
        created = await client.create({ ...createOptions, turnstileToken: token });
      } else {
        throw error;
      }
    }

    job.patch({
      status: 'processing',
      session: {
        sessionId: created.id,
        clientSecret: created.clientSecret,
        apiBaseUrl,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
        jobStatus: created.status,
        job: null,
      },
    });

    const session = await pollToCompletion(job, client, created.id, created.clientSecret, options.polling, engine.signal);
    finishCloud(job, session, created.clientSecret, apiBaseUrl);
  } catch (error) {
    engine.abort();
    if (isAbortLike(error)) return;
    job.fail(toEazipError(error));
  }
}

async function runResume(
  job: JobController<CloudZipResult>,
  options: ResumeZipOptions,
  apiBaseUrl: string,
): Promise<void> {
  const engine = new AbortController();
  linkAbort(job.signal, engine);
  if (options.onChange) job.subscribe(() => options.onChange?.(job.getSnapshot()));

  try {
    const client = new SessionsClient({
      publicKey: '',
      apiBaseUrl,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    });
    const session = await pollToCompletion(
      job,
      client,
      options.sessionId,
      options.clientSecret,
      options.polling,
      engine.signal,
    );
    finishCloud(job, session, options.clientSecret, apiBaseUrl);
  } catch (error) {
    engine.abort();
    if (isAbortLike(error)) return;
    job.fail(toEazipError(error));
  }
}

async function pollToCompletion(
  job: JobController<CloudZipResult>,
  client: SessionsClient,
  sessionId: string,
  clientSecret: string,
  polling: CloudZipOptions['polling'],
  signal: AbortSignal,
): Promise<EazipCloudSession> {
  return client.poll(sessionId, {
    clientSecret,
    signal,
    ...(polling ?? {}),
    onSession: (session) => {
      const previous = job.getSnapshot().session;
      job.patch({
        filesTotal: session.job.urlCount,
        zipFilename: session.job.zipFilename,
        zips: session.job.zips,
        session: {
          sessionId: session.id,
          clientSecret,
          apiBaseUrl: previous?.apiBaseUrl ?? DEFAULT_API_BASE_URL,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          jobStatus: session.job.status,
          job: session.job,
        },
      });
    },
  });
}

function finishCloud(
  job: JobController<CloudZipResult>,
  session: EazipCloudSession,
  clientSecret: string,
  apiBaseUrl: string,
): void {
  const includedCount = session.job.fileCount ?? session.job.urlCount;
  const skippedCount = Math.max(0, session.job.urlCount - includedCount);
  const zips: EazipZipOutput[] = session.job.zips;

  const download = (zipIndex = 0): void => {
    const zip = zips[zipIndex];
    if (!zip) {
      throw new EazipValidationError('INVALID_ZIP_INDEX', `No zip at index ${zipIndex}`);
    }
    if (!zip.downloadUrl) {
      throw new EazipDownloadExpiredError();
    }
    triggerDownload(zip.downloadUrl, zip.filename);
  };

  const result: CloudZipResult = {
    strategy: 'cloud',
    status: skippedCount > 0 ? 'partial' : 'completed',
    sessionId: session.id,
    clientSecret,
    expiresAt: session.job.expiresAt ?? session.expiresAt,
    session,
    zips,
    errors: [],
    skippedCount,
    download,
    downloadAll: () => staggerDownloads(zips.length, download),
  };

  job.patch({
    filesTotal: session.job.urlCount,
    zipFilename: session.job.zipFilename,
    session: {
      sessionId: session.id,
      clientSecret,
      apiBaseUrl,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      jobStatus: session.job.status,
      job: session.job,
    },
  });
  job.succeed(result);
}
