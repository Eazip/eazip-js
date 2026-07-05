import { vi } from 'vitest';
import type {
  EazipError,
  EazipErrorBase,
  EazipZipOutput,
  ZipJob,
  ZipJobSession,
  ZipJobSnapshot,
} from '@eazip/core';
import type { EazipStoreDeps } from '../src/store/store.js';

export function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
  } as Storage;
}

let jobCounter = 0;

export class FakeZipJob implements ZipJob {
  readonly id = `fake-job-${++jobCounter}`;
  readonly strategy: 'local' | 'cloud';
  readonly done: Promise<never>;
  abort = vi.fn(() => {
    this.emit({ status: 'aborted' });
  });
  download = vi.fn();
  downloadAll = vi.fn();
  dispose = vi.fn();

  private snapshot: ZipJobSnapshot;
  private listeners = new Set<() => void>();

  constructor(init: Partial<ZipJobSnapshot> = {}) {
    this.strategy = init.strategy ?? 'local';
    this.snapshot = {
      jobId: this.id,
      strategy: this.strategy,
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
    };
    this.done = new Promise<never>(() => {});
  }

  getSnapshot = (): ZipJobSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  emit(patch: Partial<ZipJobSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of [...this.listeners]) listener();
  }

  emitSession(overrides: Partial<ZipJobSession> = {}): void {
    this.emit({
      status: 'processing',
      session: {
        sessionId: 'sess_1',
        clientSecret: 'secret_1',
        apiBaseUrl: 'https://api.eazip.io',
        createdAt: '2026-07-02T00:00:00.000Z',
        expiresAt: '2026-07-03T00:00:00.000Z',
        jobStatus: 'processing',
        job: null,
        ...overrides,
      },
    });
  }

  complete(options: {
    zips?: EazipZipOutput[];
    errors?: EazipError[];
    skippedCount?: number;
    zipFilename?: string;
  } = {}): void {
    const zips = options.zips ?? [
      { sequence: 1, status: 'completed', filename: 'download.zip', size: 1234 },
    ];
    const errors = options.errors ?? [];
    const skippedCount = options.skippedCount ?? errors.length;
    this.emit({
      status: skippedCount > 0 || errors.length > 0 ? 'partial' : 'completed',
      zips,
      errors,
      skippedCount,
      zipFilename: options.zipFilename ?? this.snapshot.zipFilename ?? 'download.zip',
      progress: null,
    });
  }

  failJob(error: EazipErrorBase): void {
    this.emit({ status: 'failed', error, progress: null });
  }
}

export type TestDeps = {
  deps: EazipStoreDeps;
  storage: Storage;
  jobs: FakeZipJob[];
  resumedJobs: FakeZipJob[];
  startZip: ReturnType<typeof vi.fn>;
  resumeZip: ReturnType<typeof vi.fn>;
};

export function makeDeps(options: {
  onStartZip?: (zipOptions: unknown) => FakeZipJob;
  onResumeZip?: (resumeOptions: unknown) => FakeZipJob;
  now?: () => number;
  storage?: Storage;
} = {}): TestDeps {
  const storage = options.storage ?? memoryStorage();
  const jobs: FakeZipJob[] = [];
  const resumedJobs: FakeZipJob[] = [];
  let counter = 0;
  const startZip = vi.fn((zipOptions: unknown) => {
    const job = options.onStartZip ? options.onStartZip(zipOptions) : new FakeZipJob();
    jobs.push(job);
    return job;
  });
  const resumeZip = vi.fn((resumeOptions: unknown) => {
    const job = options.onResumeZip
      ? options.onResumeZip(resumeOptions)
      : new FakeZipJob({ strategy: 'cloud', status: 'processing' });
    resumedJobs.push(job);
    return job;
  });
  return {
    storage,
    jobs,
    resumedJobs,
    startZip,
    resumeZip,
    deps: {
      startZip: startZip as unknown as EazipStoreDeps['startZip'],
      resumeZip: resumeZip as unknown as EazipStoreDeps['resumeZip'],
      getStorage: () => storage,
      now: options.now ?? (() => Date.parse('2026-07-02T01:00:00.000Z')),
      generateId: () => `task-${++counter}`,
    },
  };
}
