import { EazipAbortError, isEazipError } from './errors.js';

/** Throws `EazipAbortError` when the signal has already been aborted. */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new EazipAbortError();
}

/** Returns true for SDK and platform abort errors. */
export function isAbortLike(error: unknown): boolean {
  if (isEazipError(error)) return error.code === 'ABORT_ERR';
  return error instanceof Error && error.name === 'AbortError';
}

/** Abort `target` when `source` aborts (immediately if already aborted). */
export function linkAbort(source: AbortSignal, target: AbortController): void {
  if (source.aborted) {
    target.abort();
    return;
  }
  source.addEventListener('abort', () => target.abort(), { once: true });
}
