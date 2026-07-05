import { EazipAbortError, EazipValidationError, type EazipErrorBase } from './errors.js';
import { linkAbort } from './abort.js';
import type { EazipStrategy, ZipJob, ZipJobSnapshot, ZipResult } from './types.js';

const TERMINAL_STATUSES = new Set(['completed', 'partial', 'failed', 'aborted']);

function generateJobId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return `ez-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Shared job core driven by the local and cloud engines: immutable snapshot
 * store with subscribe, a `done` deferred, terminal-once transitions, and
 * abort propagation. Engines observe `signal` and call patch/succeed/fail.
 */
export class JobController<R extends ZipResult> implements ZipJob<R> {
  readonly id: string;
  readonly strategy: EazipStrategy;
  readonly done: Promise<R>;
  /** Aborted when the job is aborted (externally or via job.abort()). */
  readonly signal: AbortSignal;

  private readonly controller = new AbortController();
  private readonly listeners = new Set<() => void>();
  private readonly disposers: (() => void)[] = [];
  private snapshot: ZipJobSnapshot;
  private resolveDone!: (result: R) => void;
  private rejectDone!: (error: unknown) => void;

  constructor(strategy: EazipStrategy, init: Partial<ZipJobSnapshot>, externalSignal?: AbortSignal) {
    this.id = generateJobId();
    this.strategy = strategy;
    this.snapshot = Object.freeze({
      jobId: this.id,
      strategy,
      status: 'starting',
      zipFilename: null,
      filesTotal: 0,
      progress: null,
      zips: [],
      errors: [],
      skippedCount: 0,
      error: null,
      session: null,
      result: null,
      ...init,
    }) as ZipJobSnapshot;
    this.done = new Promise<R>((resolve, reject) => {
      this.resolveDone = resolve;
      this.rejectDone = reject;
    });
    // Subscribe-only consumers may never touch `done`; mark rejections handled.
    this.done.catch(() => {});
    this.signal = this.controller.signal;
    // Register before linking: an already-aborted external signal aborts the
    // controller synchronously inside linkAbort.
    this.controller.signal.addEventListener('abort', () => this.onAborted(), { once: true });
    if (externalSignal) linkAbort(externalSignal, this.controller);
  }

  getSnapshot = (): ZipJobSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  abort = (): void => {
    this.controller.abort();
  };

  download = (zipIndex = 0): void => {
    const result = this.requireResult();
    result.download(zipIndex);
  };

  downloadAll = (): void => {
    const result = this.requireResult();
    result.downloadAll();
  };

  dispose = (): void => {
    for (const disposer of this.disposers.splice(0)) {
      try {
        disposer();
      } catch {
        // Best-effort cleanup.
      }
    }
  };

  // -- Engine API ----------------------------------------------------------

  isTerminal(): boolean {
    return TERMINAL_STATUSES.has(this.snapshot.status);
  }

  /** Apply a non-terminal state update. Ignored once the job is terminal. */
  patch(patch: Partial<ZipJobSnapshot>): void {
    if (this.isTerminal()) return;
    this.commit(patch);
  }

  succeed(result: R): void {
    if (this.isTerminal()) return;
    this.commit({
      status: result.status,
      result,
      zips: result.zips,
      errors: result.errors,
      skippedCount: result.skippedCount,
      zipFilename: 'zipFilename' in result ? result.zipFilename : this.snapshot.zipFilename,
    });
    this.resolveDone(result);
  }

  fail(error: EazipErrorBase): void {
    if (this.isTerminal()) return;
    this.commit({ status: 'failed', error, progress: null });
    this.rejectDone(error);
  }

  /** Register cleanup executed by dispose() (e.g. object URL revocation). */
  addDisposer(disposer: () => void): void {
    this.disposers.push(disposer);
  }

  // -- Internals -----------------------------------------------------------

  private onAborted(): void {
    if (this.isTerminal()) return;
    this.commit({ status: 'aborted', progress: null });
    this.rejectDone(new EazipAbortError());
  }

  private requireResult(): R {
    const result = this.snapshot.result;
    if (!result) {
      throw new EazipValidationError('NOT_READY', 'The zip is not ready to download yet');
    }
    return result as R;
  }

  private commit(patch: Partial<ZipJobSnapshot>): void {
    this.snapshot = Object.freeze({ ...this.snapshot, ...patch }) as ZipJobSnapshot;
    for (const listener of [...this.listeners]) listener();
  }
}
