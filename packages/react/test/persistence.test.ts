import { describe, expect, it } from 'vitest';
import { EazipSessionExpiredError } from '@eazip/core';
import { EazipStore } from '../src/store/store.js';
import { clearEnvelope, loadEnvelope, saveEnvelope } from '../src/store/persistence.js';
import { FakeZipJob, makeDeps, memoryStorage } from './helpers.js';

const NOW = Date.parse('2026-07-02T01:00:00.000Z');

/** Runs a cloud task to completion against fake jobs, filling storage. */
function completeCloudTask(storage?: Storage) {
  const { deps, jobs, storage: ownStorage } = makeDeps(storage ? { storage } : {});
  const store = new EazipStore(deps, { publicKey: 'pk_test', strategy: 'cloud', autoDownload: false });
  store.download(['https://example.com/a.png']);
  jobs[0]!.emitSession();
  jobs[0]!.complete({
    zips: [{
      sequence: 1,
      status: 'completed',
      filename: 'export.zip',
      size: 2048,
      downloadUrl: 'https://dl.example.com/export.zip',
    }],
  });
  return { store, storage: storage ?? ownStorage };
}

describe('envelope helpers', () => {
  it('round-trips a valid envelope and rejects garbage', () => {
    const storage = memoryStorage();
    expect(loadEnvelope(storage, 'k')).toBeNull();

    storage.setItem('k', 'not json');
    expect(loadEnvelope(storage, 'k')).toBeNull();

    storage.setItem('k', JSON.stringify({ v: 2, task: {} }));
    expect(loadEnvelope(storage, 'k')).toBeNull();

    const envelope = {
      v: 1 as const,
      expanded: true,
      task: {
        id: 't1',
        state: 'completed' as const,
        zipName: null,
        filesTotal: 3,
        createdAt: NOW,
        expiresAt: null,
        sessionId: 's1',
        clientSecret: 'cs1',
        publicKey: 'pk',
        downloadStarted: false,
        zips: [],
        skippedCount: 0,
      },
    };
    saveEnvelope(storage, 'k', envelope);
    expect(loadEnvelope(storage, 'k')).toEqual(envelope);

    clearEnvelope(storage, 'k');
    expect(loadEnvelope(storage, 'k')).toBeNull();
  });
});

describe('persistence & resume', () => {
  it('restores a completed cloud task in a fresh store', () => {
    const { storage } = completeCloudTask();

    const { deps } = makeDeps({ storage });
    const restoredStore = new EazipStore(deps);
    restoredStore.hydrate();

    const task = restoredStore.getSnapshot().tasks[0];
    expect(task).toMatchObject({ state: 'completed', strategy: 'cloud', canRetry: true });
    expect(task?.zips[0]).toMatchObject({
      filename: 'export.zip',
      downloadUrl: 'https://dl.example.com/export.zip',
    });
    expect(restoredStore.getSnapshot().expanded).toBe(true);
  });

  it('marks a restored task expired when past its deadline', () => {
    const { storage } = completeCloudTask();

    const { deps } = makeDeps({ storage, now: () => Date.parse('2026-07-04T00:00:00.000Z') });
    const restoredStore = new EazipStore(deps);
    restoredStore.hydrate();

    expect(restoredStore.getSnapshot().tasks[0]?.state).toBe('expired');
  });

  it('resumes a processing task via resumeZip without auto-download', () => {
    const { deps, jobs, storage } = makeDeps();
    const store = new EazipStore(deps, { publicKey: 'pk_test', strategy: 'cloud' });
    store.download(['https://example.com/a.png']);
    jobs[0]!.emitSession();
    // Reload happens while the job is still processing.
    expect(JSON.parse(storage.getItem('eazip-tray-v1')!).task.state).toBe('processing');

    const { deps: freshDeps, resumedJobs, resumeZip } = makeDeps({ storage });
    const restoredStore = new EazipStore(freshDeps);
    restoredStore.hydrate();

    expect(resumeZip).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'sess_1',
      clientSecret: 'secret_1',
      apiBaseUrl: 'https://api.eazip.io',
    }));
    expect(restoredStore.getSnapshot().tasks[0]?.state).toBe('processing');

    resumedJobs[0]!.emitSession();
    resumedJobs[0]!.complete();
    expect(restoredStore.getSnapshot().tasks[0]?.state).toBe('completed');
    // Restored tasks never auto-fire downloads.
    expect(resumedJobs[0]!.download).not.toHaveBeenCalled();
  });

  it('maps a session-expired failure during resume to the expired state', () => {
    const { deps, jobs, storage } = makeDeps();
    const store = new EazipStore(deps, { publicKey: 'pk_test', strategy: 'cloud' });
    store.download(['https://example.com/a.png']);
    jobs[0]!.emitSession();

    const { deps: freshDeps, resumedJobs } = makeDeps({ storage });
    const restoredStore = new EazipStore(freshDeps);
    restoredStore.hydrate();
    resumedJobs[0]!.failJob(new EazipSessionExpiredError());

    expect(restoredStore.getSnapshot().tasks[0]?.state).toBe('expired');
  });

  it('does not persist local tasks and clears stale cloud state', () => {
    const { storage } = completeCloudTask();
    expect(storage.getItem('eazip-tray-v1')).not.toBeNull();

    const { deps, jobs } = makeDeps({ storage });
    const store = new EazipStore(deps, { autoDownload: false });
    store.download([new File(['a'], 'a.txt')]);
    jobs[0]!.complete();
    expect(store.getSnapshot().tasks[0]?.state).toBe('completed');
    expect(storage.getItem('eazip-tray-v1')).toBeNull();
  });

  it('honors persist: false', () => {
    const { deps, jobs, storage } = makeDeps();
    const store = new EazipStore(deps, {
      publicKey: 'pk_test',
      strategy: 'cloud',
      autoDownload: false,
      persist: false,
    });
    store.download(['https://example.com/a.png']);
    jobs[0]!.emitSession();
    jobs[0]!.complete();
    expect(storage.getItem('eazip-tray-v1')).toBeNull();
  });

  it('retry works after restore using the persisted request', () => {
    const { storage } = completeCloudTask();

    const { deps, jobs, startZip } = makeDeps({ storage });
    const restoredStore = new EazipStore(deps, { autoDownload: false });
    restoredStore.hydrate();
    restoredStore.retry();

    expect(startZip).toHaveBeenCalledWith(expect.objectContaining({
      strategy: 'cloud',
      publicKey: 'pk_test',
      files: [{ url: 'https://example.com/a.png' }],
    }));
    jobs[0]!.emitSession({ sessionId: 'sess_2', clientSecret: 'secret_2' });
    jobs[0]!.complete();
    expect(restoredStore.getSnapshot().tasks[0]?.state).toBe('completed');
  });
});
