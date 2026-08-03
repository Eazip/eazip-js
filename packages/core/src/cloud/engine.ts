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
  CloudCreateSessionContext,
  CloudSessionZipOptions,
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
import { cloudFailuresToErrors, cloudSkippedCount } from './failures.js';

/** Default origin used for Eazip Cloud Sessions API requests. */
export const DEFAULT_API_BASE_URL = 'https://api.eazip.io';

/** Starts an Eazip Cloud ZIP job and begins polling its session. */
export function startCloudZip(options: CloudZipOptions): ZipJob<CloudZipResult> {
  const hasCustomCreateSession = isCloudSessionZipOptions(options);
  const files = hasCustomCreateSession ? null : toSourceFiles(options.files).map((file) => {
    if (!('url' in file)) {
      throw new EazipValidationError('CLOUD_URL_SOURCES_ONLY', 'Cloud sessions only support URL source files');
    }
    return file;
  });
  if (!hasCustomCreateSession && !options.publicKey) {
    throw new EazipValidationError(
      'PUBLIC_KEY_REQUIRED',
      'The cloud strategy requires a publicKey (create one at https://eazip.io)',
    );
  }
  const job = new JobController<CloudZipResult>('cloud', {
    filesTotal: hasCustomCreateSession ? options.filesTotal ?? 0 : files!.length,
  }, options.signal);
  queueMicrotask(() => {
    void runCloud(job, files, options);
  });
  return job;
}

function isCloudSessionZipOptions(options: CloudZipOptions): options is CloudSessionZipOptions {
  return typeof options.createSession === 'function';
}

/** Reconnects to an existing Cloud session and resumes polling it. */
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
  files: { url: string; filename?: string }[] | null,
  options: CloudZipOptions,
): Promise<void> {
  const engine = new AbortController();
  linkAbort(job.signal, engine);
  if (options.onChange) job.subscribe(() => options.onChange?.(job.getSnapshot()));

  try {
    const created = await createSession(files, options, engine.signal);
    const client = new SessionsClient({
      publicKey: isCloudSessionZipOptions(options) ? '' : options.publicKey,
      apiBaseUrl: created.apiBaseUrl,
      ...(options.fetch ? { fetch: options.fetch } : {}),
    });

    job.patch({
      status: 'processing',
      session: {
        sessionId: created.id,
        clientSecret: created.clientSecret,
        apiBaseUrl: created.apiBaseUrl,
        createdAt: created.createdAt,
        expiresAt: created.expiresAt,
        jobStatus: created.status,
        job: null,
      },
    });

    const session = await pollToCompletion(job, client, created.id, created.clientSecret, options.polling, engine.signal);
    finishCloud(job, session, created.clientSecret, created.apiBaseUrl);
  } catch (error) {
    engine.abort();
    if (isAbortLike(error)) return;
    job.fail(toEazipError(error));
  }
}

type CreatedSessionWithApiBaseUrl = CreatedCloudSession & {
  apiBaseUrl: string;
};

async function createSession(
  files: { url: string; filename?: string }[] | null,
  options: CloudZipOptions,
  signal: AbortSignal,
): Promise<CreatedSessionWithApiBaseUrl> {
  const apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl ?? DEFAULT_API_BASE_URL);
  const mode = options.mode ?? 'stream';
  const sharedCreateContext: Omit<CloudCreateSessionContext, 'signal'> = {
    mode,
    ...(options.zipName ? { zipName: options.zipName } : {}),
    ...(options.failOnUrlError != null ? { failOnUrlError: options.failOnUrlError } : {}),
    ...(options.maxZipSizeBytes != null ? { maxZipSizeBytes: options.maxZipSizeBytes } : {}),
  };

  if (isCloudSessionZipOptions(options)) {
    const created = await options.createSession({ ...sharedCreateContext, signal });
    return {
      id: created.sessionId,
      clientSecret: created.clientSecret,
      status: created.status ?? 'pending',
      createdAt: created.createdAt ?? '',
      expiresAt: created.expiresAt ?? '',
      apiBaseUrl: normalizeApiBaseUrl(created.apiBaseUrl ?? apiBaseUrl),
    };
  }

  const client = new SessionsClient({
    publicKey: options.publicKey,
    apiBaseUrl,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  const createOptions: CreateCloudSessionOptions = {
    files: files ?? [],
    signal,
    // The SDK defaults to stream mode: no storage upload to wait for, so the
    // download is ready sooner. Pass mode: 'stored' for persisted archives.
    mode,
    ...(sharedCreateContext.zipName ? { zipName: sharedCreateContext.zipName } : {}),
    ...(sharedCreateContext.failOnUrlError != null ? { failOnUrlError: sharedCreateContext.failOnUrlError } : {}),
    ...(sharedCreateContext.maxZipSizeBytes != null ? { maxZipSizeBytes: sharedCreateContext.maxZipSizeBytes } : {}),
    ...(options.turnstileToken ? { turnstileToken: options.turnstileToken } : {}),
  };

  try {
    return { ...(await client.create(createOptions)), apiBaseUrl };
  } catch (error) {
    if (error instanceof EazipChallengeRequiredError && options.onChallenge) {
      const token = await options.onChallenge(error.challenge);
      return { ...(await client.create({ ...createOptions, turnstileToken: token })), apiBaseUrl };
    }
    throw error;
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
        errors: cloudFailuresToErrors(session.job.failures),
        skippedCount: cloudSkippedCount(session.job),
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
  const skippedCount = cloudSkippedCount(session.job);
  const zips: EazipZipOutput[] = session.job.zips;
  const errors = cloudFailuresToErrors(session.job.failures);

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
    errors,
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
