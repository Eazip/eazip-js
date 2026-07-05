import { describe, expect, it, vi } from 'vitest';
import { EazipSessionRevokedError, EazipValidationError } from '@eazip/core';
import { EazipStore } from '../src/store/store.js';
import { FakeZipJob, makeDeps } from './helpers.js';

describe('local downloads', () => {
  it('runs a job to completion and auto-downloads the first zip', () => {
    const { deps, jobs, startZip } = makeDeps();
    const store = new EazipStore(deps);

    const id = store.download([new File(['a'], 'a.txt')], { zipName: 'docs.zip' });
    expect(store.getSnapshot().tasks[0]).toMatchObject({ id, state: 'processing', strategy: 'local', filesTotal: 1 });
    expect(startZip).toHaveBeenCalledWith(expect.objectContaining({
      strategy: 'local',
      zipName: 'docs.zip',
      files: [{ file: expect.any(File) }],
    }));

    jobs[0]!.complete();
    const task = store.getSnapshot().tasks[0]!;
    expect(task.state).toBe('completed');
    expect(task.zips).toEqual([{ filename: 'download.zip', size: 1234, downloadStarted: true }]);
    expect(task.downloadStarted).toBe(true);
    expect(jobs[0]!.download).toHaveBeenCalledTimes(1);
    expect(jobs[0]!.download).toHaveBeenCalledWith(0);
    expect(store.getSnapshot().expanded).toBe(true);
  });

  it('does not auto-download when disabled', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });

    store.download(['https://example.com/a.png']);
    jobs[0]!.complete();
    expect(jobs[0]!.download).not.toHaveBeenCalled();
    expect(store.getSnapshot().tasks[0]?.downloadStarted).toBe(false);
  });

  it('maps per-file errors to a partial outcome with skipped details', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });

    store.download(['https://example.com/a.png', 'https://example.com/big.psd']);
    jobs[0]!.complete({
      errors: [
        { code: 'LOCAL_SOURCE_FETCH_FAILED', message: 'Request failed', filename: 'big.psd' },
      ],
    });
    const task = store.getSnapshot().tasks[0]!;
    expect(task.state).toBe('partial');
    expect(task.skippedCount).toBe(1);
    expect(task.skipped).toEqual([{ filename: 'big.psd', reason: 'Request failed' }]);
  });

  it('reflects job progress while processing', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps);

    const id = store.download([new File(['a'], 'a.txt')]);
    jobs[0]!.emit({
      status: 'processing',
      progress: { phase: 'adding', filesTotal: 4, filesCompleted: 2 },
    });
    expect(store.getSnapshot().tasks[0]).toMatchObject({
      id,
      state: 'processing',
      progress: { phase: 'adding', filesCompleted: 2, filesTotal: 4 },
    });
  });

  it('surfaces job failures with error details', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps);

    store.download([new File(['a'], 'a.txt')]);
    jobs[0]!.failJob(new EazipValidationError('ZIP_TOO_LARGE', 'Zip exceeds the size limit'));
    expect(store.getSnapshot().tasks[0]?.state).toBe('failed');
    expect(store.getSnapshot().tasks[0]?.error).toEqual({
      code: 'ZIP_TOO_LARGE',
      message: 'Zip exceeds the size limit',
    });
    expect(store.getSnapshot().expanded).toBe(true);
  });

  it('turns synchronous startZip validation failures into a failed task', () => {
    const { deps } = makeDeps({
      onStartZip: () => {
        throw new EazipValidationError('PUBLIC_KEY_REQUIRED', 'The cloud strategy requires a publicKey');
      },
    });
    const store = new EazipStore(deps);

    store.download(['https://example.com/a.png'], { strategy: 'cloud' });
    expect(store.getSnapshot().tasks[0]?.state).toBe('failed');
    expect(store.getSnapshot().tasks[0]?.error?.code).toBe('PUBLIC_KEY_REQUIRED');
  });

  it('rejects empty input synchronously', () => {
    const { deps } = makeDeps();
    const store = new EazipStore(deps);
    expect(() => store.download([])).toThrowError(/At least one file/);
    expect(store.getSnapshot().tasks).toEqual([]);
  });

  it('cancel aborts the job and clears the tray silently', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps);

    const id = store.download([new File(['a'], 'a.txt')]);
    store.cancel(id);
    expect(jobs[0]!.abort).toHaveBeenCalled();
    expect(jobs[0]!.dispose).toHaveBeenCalled();
    expect(store.getSnapshot().tasks).toEqual([]);
  });

  it('a new download replaces and aborts the current one', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });

    const firstId = store.download([new File(['a'], 'a.txt')]);
    const secondId = store.download([new File(['b'], 'b.txt')]);
    expect(jobs[0]!.abort).toHaveBeenCalled();
    expect(store.getSnapshot().tasks).toHaveLength(1);
    expect(store.getSnapshot().tasks[0]?.id).toBe(secondId);
    expect(firstId).not.toBe(secondId);

    // A late event from the replaced job must not resurrect it.
    jobs[0]!.complete();
    expect(store.getSnapshot().tasks[0]?.id).toBe(secondId);
    expect(store.getSnapshot().tasks[0]?.state).toBe('processing');
  });

  it('retry starts a new task with the same request', () => {
    const { deps, jobs, startZip } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });

    store.download(['https://example.com/a.png'], { zipName: 'photos.zip' });
    jobs[0]!.failJob(new EazipValidationError('NETWORK', 'boom'));
    store.retry();
    expect(startZip).toHaveBeenCalledTimes(2);
    expect(startZip).toHaveBeenLastCalledWith(expect.objectContaining({
      zipName: 'photos.zip',
      files: [{ url: 'https://example.com/a.png' }],
    }));
    jobs[1]!.complete();
    expect(store.getSnapshot().tasks[0]?.state).toBe('completed');
  });
});

describe('cloud downloads', () => {
  it('passes cloud config to startZip and persists once the session appears', () => {
    const { deps, jobs, storage, startZip } = makeDeps();
    const store = new EazipStore(deps, { publicKey: 'pk_test', strategy: 'cloud', autoDownload: false });

    store.download(['https://example.com/a.png', 'https://example.com/b.png']);
    expect(startZip).toHaveBeenCalledWith(expect.objectContaining({
      strategy: 'cloud',
      publicKey: 'pk_test',
    }));

    // Session exposed while still processing → persisted immediately.
    jobs[0]!.emitSession();
    const persistedWhileProcessing = JSON.parse(storage.getItem('eazip-tray-v1')!);
    expect(persistedWhileProcessing.task).toMatchObject({
      state: 'processing',
      sessionId: 'sess_1',
      clientSecret: 'secret_1',
      publicKey: 'pk_test',
    });

    jobs[0]!.complete({
      zips: [{
        sequence: 1,
        status: 'completed',
        filename: 'export.zip',
        size: 2048,
        downloadUrl: 'https://dl.example.com/export.zip',
      }],
    });
    const task = store.getSnapshot().tasks[0]!;
    expect(task.state).toBe('completed');
    expect(task.zips[0]).toMatchObject({ filename: 'export.zip', downloadUrl: 'https://dl.example.com/export.zip' });
    expect(task.expiresAt).toBe(Date.parse('2026-07-03T00:00:00.000Z'));
    const persisted = JSON.parse(storage.getItem('eazip-tray-v1')!);
    expect(persisted.task.state).toBe('completed');
  });

  it('maps skipped counts from the job snapshot', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { publicKey: 'pk_test', autoDownload: false });

    store.download(['https://example.com/a.png'], { strategy: 'cloud' });
    jobs[0]!.emitSession();
    jobs[0]!.complete({ skippedCount: 2 });
    expect(store.getSnapshot().tasks[0]?.state).toBe('partial');
    expect(store.getSnapshot().tasks[0]?.skippedCount).toBe(2);
  });

  it('maps session revocation to the expired state', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { publicKey: 'pk_test', strategy: 'cloud' });

    store.download(['https://example.com/a.png']);
    jobs[0]!.emitSession();
    jobs[0]!.failJob(new EazipSessionRevokedError());
    expect(store.getSnapshot().tasks[0]?.state).toBe('expired');
    expect(store.getSnapshot().tasks[0]?.error).toBeNull();
  });

  it('downloadAll delegates to the job stagger and flags every zip in one commit', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { publicKey: 'pk_test', strategy: 'cloud', autoDownload: false });

    const id = store.download(['https://example.com/a.png']);
    jobs[0]!.emitSession();
    jobs[0]!.complete({
      zips: [
        { sequence: 1, status: 'completed', filename: 'export_part01.zip', downloadUrl: 'https://d/1' },
        { sequence: 2, status: 'completed', filename: 'export_part02.zip', downloadUrl: 'https://d/2' },
      ],
    });

    const commits = vi.fn();
    store.subscribe(commits);
    store.downloadAll(id);

    expect(jobs[0]!.downloadAll).toHaveBeenCalledTimes(1);
    expect(jobs[0]!.download).not.toHaveBeenCalled();
    expect(commits).toHaveBeenCalledTimes(1);
    const task = store.getSnapshot().tasks[0]!;
    expect(task.downloadStarted).toBe(true);
    expect(task.zips.every((zip) => zip.downloadStarted)).toBe(true);
  });

  it('downloadAll staggers anchor clicks for restored tasks without a job', () => {
    vi.useFakeTimers();
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.href);
    });
    try {
      const { deps, storage } = makeDeps();
      storage.setItem('eazip-tray-v1', JSON.stringify({
        v: 1,
        expanded: false,
        task: {
          id: 't1',
          state: 'completed',
          zipName: 'export.zip',
          filesTotal: 2,
          createdAt: 0,
          expiresAt: null,
          sessionId: 's1',
          clientSecret: 'cs1',
          publicKey: 'pk',
          downloadStarted: false,
          zips: [
            { filename: 'export_part01.zip', downloadUrl: 'https://d/1', downloadStarted: false },
            { filename: 'export_part02.zip', downloadUrl: 'https://d/2', downloadStarted: false },
          ],
          skippedCount: 0,
        },
      }));
      const store = new EazipStore(deps);
      store.hydrate();

      store.downloadAll();
      // First click is immediate, the second is staggered.
      expect(clicks).toEqual(['https://d/1']);
      // Flags are already flipped in a single commit.
      expect(store.getSnapshot().tasks[0]?.zips.every((zip) => zip.downloadStarted)).toBe(true);

      vi.advanceTimersByTime(300);
      expect(clicks).toEqual(['https://d/1', 'https://d/2']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('flips completed tasks to expired when the deadline passes', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.parse('2026-07-02T23:59:00.000Z'));
      const { deps, jobs } = makeDeps({ now: () => Date.now() });
      const store = new EazipStore(deps, { publicKey: 'pk_test', strategy: 'cloud', autoDownload: false });

      store.download(['https://example.com/a.png']);
      jobs[0]!.emitSession({ expiresAt: '2026-07-03T00:00:00.000Z' });
      jobs[0]!.complete();
      expect(store.getSnapshot().tasks[0]?.state).toBe('completed');

      vi.advanceTimersByTime(61_000);
      expect(store.getSnapshot().tasks[0]?.state).toBe('expired');
    } finally {
      vi.useRealTimers();
    }
  });
});
