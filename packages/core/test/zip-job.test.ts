import { describe, expect, it, vi } from 'vitest';
import { startZip, EazipAbortError } from '../src/index.js';
import { staggerDownloads } from '../src/shared/download.js';

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('ZipJob', () => {
  it('returns a synchronous starting snapshot and commits immutably', async () => {
    const pending = deferredResponse();
    const fetch = vi.fn(async () => pending.promise);
    const job = startZip({ strategy: 'local', files: ['https://a.example.test/x.txt'], zipName: 'x', fetch });

    const first = job.getSnapshot();
    expect(first).toMatchObject({
      status: 'starting',
      strategy: 'local',
      zipFilename: 'x.zip',
      filesTotal: 1,
      zips: [],
      result: null,
    });
    expect(job.getSnapshot()).toBe(first);

    const seen: string[] = [];
    const unsubscribe = job.subscribe(() => {
      seen.push(job.getSnapshot().status);
    });

    pending.resolve(new Response('data'));
    const result = await job.done;
    expect(result.status).toBe('completed');
    expect(job.getSnapshot().status).toBe('completed');
    expect(job.getSnapshot()).not.toBe(first);
    expect(job.getSnapshot()).toBe(job.getSnapshot());
    expect(seen).toContain('processing');
    expect(seen.at(-1)).toBe('completed');
    unsubscribe();
  });

  it('abort() transitions to aborted and rejects done', async () => {
    const pending = deferredResponse();
    const fetch = vi.fn(async () => pending.promise);
    const job = startZip({ strategy: 'local', files: ['https://a.example.test/x.txt'], fetch });

    job.abort();
    expect(job.getSnapshot().status).toBe('aborted');
    await expect(job.done).rejects.toBeInstanceOf(EazipAbortError);

    // Terminal-once: further aborts are no-ops.
    job.abort();
    expect(job.getSnapshot().status).toBe('aborted');
  });

  it('does not emit unhandled rejections when done is ignored', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const job = startZip({
        strategy: 'local',
        files: ['https://a.example.test/x.txt'],
        fetch: vi.fn(async () => new Response('nope', { status: 500 })),
      });
      await vi.waitFor(() => expect(job.getSnapshot().status).toBe('failed'));
      expect(job.getSnapshot().error).toMatchObject({ code: 'ALL_SOURCES_FAILED' });
      // Give the runtime a macrotask to surface any unhandled rejection.
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('download() before completion throws NOT_READY', () => {
    const pending = deferredResponse();
    const job = startZip({
      strategy: 'local',
      files: ['https://a.example.test/x.txt'],
      fetch: vi.fn(async () => pending.promise),
    });
    expect(() => job.download()).toThrowError(/not ready/i);
    job.abort();
  });

  it('onChange mirrors subscribe', async () => {
    const statuses: string[] = [];
    const job = startZip({
      strategy: 'local',
      files: [new Blob(['x'])],
      onChange: (snapshot) => statuses.push(snapshot.status),
    });
    await job.done;
    expect(statuses.at(-1)).toBe('completed');
  });
});

describe('staggerDownloads', () => {
  it('fires the first download immediately and staggers the rest', () => {
    vi.useFakeTimers();
    try {
      const calls: number[] = [];
      staggerDownloads(3, (index) => calls.push(index));
      expect(calls).toEqual([0]);
      vi.advanceTimersByTime(300);
      expect(calls).toEqual([0, 1]);
      vi.advanceTimersByTime(300);
      expect(calls).toEqual([0, 1, 2]);
    } finally {
      vi.useRealTimers();
    }
  });
});
