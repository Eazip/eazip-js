import { EazipAbortError, EazipApiError } from '../shared/errors';
import type { EazipCloudSession, PollCloudSessionOptions } from '../shared/types';

export type PollFetchSession = (signal?: AbortSignal) => Promise<EazipCloudSession>;

const DEFAULT_INITIAL_INTERVAL_MS = 2_000;
const DEFAULT_MAX_INTERVAL_MS = 10_000;
const DEFAULT_BACKOFF_MULTIPLIER = 1.5;

export async function pollSession(fetchSession: PollFetchSession, options: PollCloudSessionOptions): Promise<EazipCloudSession> {
  let intervalMs = options.initialIntervalMs ?? DEFAULT_INITIAL_INTERVAL_MS;
  const maxIntervalMs = options.maxIntervalMs ?? DEFAULT_MAX_INTERVAL_MS;
  const backoffMultiplier = options.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER;
  const jitter = options.jitter ?? true;

  while (true) {
    throwIfAborted(options.signal);
    await waitUntilVisible(options.signal);

    const session = await fetchSession(options.signal);
    options.onStatusChange?.(session);
    if (session.job.status === 'completed') return session;
    if (session.job.status === 'failed') {
      throw new EazipApiError('JOB_FAILED', 'Eazip session job failed');
    }

    const delayMs = withJitter(intervalMs, jitter);
    try {
      await sleep(delayMs, options.signal);
    } catch (error) {
      throwIfAbortError(error);
      throw error;
    }
    intervalMs = Math.min(maxIntervalMs, Math.ceil(intervalMs * backoffMultiplier));
  }
}

export async function retryAfterDelay(error: unknown, signal?: AbortSignal): Promise<boolean> {
  if (!(error instanceof EazipApiError) || !error.retryAfterMs) return false;
  if (error.code === 'EDGE_RATE_LIMITED') throw error;
  await sleep(error.retryAfterMs, signal);
  return true;
}

function withJitter(intervalMs: number, enabled: boolean): number {
  if (!enabled) return intervalMs;
  const factor = 0.8 + Math.random() * 0.4;
  return Math.round(intervalMs * factor);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new EazipAbortError());
    }, { once: true });
  });
}

async function waitUntilVisible(signal?: AbortSignal): Promise<void> {
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return;
  await new Promise<void>((resolve, reject) => {
    const onVisible = () => {
      if (document.visibilityState !== 'hidden') {
        cleanup();
        resolve();
      }
    };
    const onAbort = () => {
      cleanup();
      reject(new EazipAbortError());
    };
    const cleanup = () => {
      document.removeEventListener('visibilitychange', onVisible);
      signal?.removeEventListener('abort', onAbort);
    };
    document.addEventListener('visibilitychange', onVisible);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new EazipAbortError();
}

function throwIfAbortError(error: unknown): void {
  if (error instanceof EazipAbortError) throw error;
}
