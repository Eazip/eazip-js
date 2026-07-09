'use client';

import {
  EazipDownloadExpiredError,
  EazipSessionExpiredError,
  EazipSessionRevokedError,
  EazipValidationError,
  isEazipError,
  resumeZip,
  staggerDownloads,
  startZip,
  toSourceFiles,
  triggerDownload,
} from '@eazip/core';
import type {
  CloudSessionZipOptions,
  CloudZipOptions,
  LocalZipOptions,
  StartZipOptions,
  ZipJob,
} from '@eazip/core';
import type {
  EazipConfig,
  EazipDownloadOptions,
  EazipSnapshot,
  EazipTask,
} from '../types.js';
import { generateId, getLocalStorage } from '../utils/env.js';
import { snapshotToTask } from './task.js';
import {
  clearEnvelope,
  DEFAULT_STORAGE_KEY,
  loadEnvelope,
  saveEnvelope,
  type PersistedEnvelope,
  type PersistedRequest,
  type PersistedTask,
} from './persistence.js';

const MAX_TIMEOUT_MS = 2_147_483_647;

export type EazipStoreDeps = {
  startZip: typeof startZip;
  resumeZip: typeof resumeZip;
  getStorage: () => Storage | null;
  now: () => number;
  generateId: () => string;
};

type RetryRequest = {
  options: EazipDownloadOptions;
};

type ResolvedDownload = {
  startOptions: StartZipOptions;
  request: RetryRequest;
  strategy: 'local' | 'cloud';
  zipName: string | null;
  filesTotal: number;
  publicKey: string | null;
  apiBaseUrl: string | null;
  autoDownload: boolean;
};

type InternalTask = {
  task: EazipTask;
  job: ZipJob | null;
  unsubscribeJob: (() => void) | null;
  request: RetryRequest | null;
  sessionId: string | null;
  clientSecret: string | null;
  publicKey: string | null;
  apiBaseUrl: string | null;
  autoDownload: boolean;
  restored: boolean;
};

const EMPTY_SNAPSHOT: EazipSnapshot = { tasks: [], expanded: false };

function defaultDeps(): EazipStoreDeps {
  return {
    startZip,
    resumeZip,
    getStorage: getLocalStorage,
    now: () => Date.now(),
    generateId,
  };
}

export class EazipStore {
  private readonly deps: EazipStoreDeps;
  private config: EazipConfig;
  private current: InternalTask | null = null;
  private expanded = false;
  private hydrated = false;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private snapshot: EazipSnapshot = EMPTY_SNAPSHOT;

  constructor(deps?: Partial<EazipStoreDeps>, config?: EazipConfig) {
    this.deps = { ...defaultDeps(), ...deps };
    this.config = config ?? {};
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): EazipSnapshot => this.snapshot;

  getServerSnapshot = (): EazipSnapshot => EMPTY_SNAPSHOT;

  setConfig(config: EazipConfig): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): EazipConfig {
    return this.config;
  }

  /**
   * Restore a persisted cloud task from storage. Safe to call multiple times;
   * only the first call after construction does work. Must be called from an
   * effect (never during render or module evaluation).
   */
  hydrate = (): void => {
    if (this.hydrated) return;
    this.hydrated = true;
    if (this.config.persist === false) return;
    if (this.current) return;
    const storage = this.deps.getStorage();
    if (!storage) return;
    const envelope = loadEnvelope(storage, this.storageKey());
    if (!envelope) return;
    this.restoreFromEnvelope(envelope);
  };

  download = (options: EazipDownloadOptions): string => {
    const resolved = this.resolveDownloadOptions(options);
    return this.startTask(resolved);
  };

  cancel = (taskId?: string): void => {
    const internal = this.currentMatching(taskId);
    if (!internal) return;
    internal.job?.abort();
    this.clearCurrent();
  };

  dismiss = (taskId?: string): void => {
    this.cancel(taskId);
  };

  retry = (taskId?: string): void => {
    const internal = this.currentMatching(taskId);
    if (!internal?.request) return;
    this.download(internal.request.options);
  };

  downloadZip = (taskId: string, zipIndex: number): void => {
    const internal = this.currentMatching(taskId);
    if (!internal) return;
    const { task } = internal;
    if (task.state !== 'completed' && task.state !== 'partial') return;
    const zip = task.zips[zipIndex];
    if (!zip) return;
    if (internal.job) {
      try {
        internal.job.download(zipIndex);
      } catch {
        return;
      }
    } else if (zip.downloadUrl) {
      triggerDownload(zip.downloadUrl, zip.filename);
    } else {
      return;
    }
    internal.task = {
      ...task,
      downloadStarted: true,
      zips: task.zips.map((entry, index) =>
        index === zipIndex ? { ...entry, downloadStarted: true } : entry,
      ),
    };
    this.commit();
  };

  downloadAll = (taskId?: string): void => {
    const internal = this.currentMatching(taskId);
    if (!internal) return;
    const { task } = internal;
    if (task.state !== 'completed' && task.state !== 'partial') return;
    if (task.zips.length === 0) return;
    // Delegate to the core stagger (browser multiple-download heuristics);
    // never fire the anchor clicks in a synchronous loop here.
    if (internal.job) {
      try {
        internal.job.downloadAll();
      } catch {
        return;
      }
    } else {
      staggerDownloads(task.zips.length, (index) => {
        const zip = internal.task.zips[index];
        if (zip?.downloadUrl) triggerDownload(zip.downloadUrl, zip.filename);
      });
    }
    internal.task = {
      ...task,
      downloadStarted: true,
      zips: task.zips.map((zip) => ({ ...zip, downloadStarted: true })),
    };
    this.commit();
  };

  setExpanded = (expanded: boolean): void => {
    if (this.expanded === expanded) return;
    this.expanded = expanded;
    this.commit();
  };

  toggleExpanded = (): void => {
    this.setExpanded(!this.expanded);
  };

  private storageKey(): string {
    return this.config.storageKey ?? DEFAULT_STORAGE_KEY;
  }

  private currentMatching(taskId?: string): InternalTask | null {
    if (!this.current) return null;
    if (taskId != null && this.current.task.id !== taskId) return null;
    return this.current;
  }

  private startTask(resolved: ResolvedDownload): string {
    this.disposeCurrent();
    const id = this.deps.generateId();
    const task: EazipTask = {
      id,
      state: 'processing',
      strategy: resolved.strategy,
      zipName: resolved.zipName,
      filesTotal: resolved.filesTotal,
      progress: null,
      zips: [],
      skippedCount: 0,
      skipped: [],
      error: null,
      downloadStarted: false,
      createdAt: this.deps.now(),
      expiresAt: null,
      canRetry: true,
    };
    this.current = {
      task,
      job: null,
      unsubscribeJob: null,
      request: resolved.request,
      sessionId: null,
      clientSecret: null,
      publicKey: resolved.publicKey,
      apiBaseUrl: resolved.apiBaseUrl,
      autoDownload: resolved.autoDownload,
      restored: false,
    };
    this.expanded = false;
    this.commit();

    let job: ZipJob;
    try {
      job = this.deps.startZip(resolved.startOptions);
    } catch (error) {
      if (error instanceof EazipValidationError && (error.code === 'EMPTY_INPUT' || error.code === 'INVALID_INPUT')) {
        this.current = null;
        this.commit();
        throw error;
      }
      const code = isEazipError(error) ? error.code : 'UNKNOWN';
      const message = error instanceof Error ? error.message : String(error);
      this.current.task = { ...task, state: 'failed', error: { code, message } };
      this.expanded = true;
      this.commit();
      return id;
    }
    this.attachJob(id, job);
    return id;
  }

  private resolveDownloadOptions(options: EazipDownloadOptions): ResolvedDownload {
    const defaults = this.config.defaults ?? {};
    const zipName = options.zipName ?? defaults.zipName;
    const failOnUrlError = options.failOnUrlError ?? defaults.failOnUrlError;
    const maxZipSizeBytes = options.maxZipSizeBytes ?? defaults.maxZipSizeBytes;
    const strategy = options.strategy ?? this.config.strategy ?? ('createSession' in options ? 'cloud' : 'local');
    const autoDownload = options.autoDownload ?? this.config.autoDownload ?? true;
    const request: RetryRequest = { options };
    const shared = {
      ...(zipName ? { zipName } : {}),
      ...(failOnUrlError != null ? { failOnUrlError } : {}),
      ...(maxZipSizeBytes != null ? { maxZipSizeBytes } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
      ...(options.fetch ? { fetch: options.fetch } : {}),
      ...(options.onChange ? { onChange: options.onChange } : {}),
    };

    if (isCloudSessionDownloadOptions(options)) {
      const apiBaseUrl = options.apiBaseUrl ?? this.config.apiBaseUrl ?? null;
      const mode = options.mode ?? defaults.mode;
      const startOptions: CloudZipOptions = {
        ...shared,
        strategy: 'cloud',
        createSession: options.createSession,
        ...(apiBaseUrl ? { apiBaseUrl } : {}),
        ...(mode ? { mode } : {}),
        ...(options.filesTotal != null ? { filesTotal: options.filesTotal } : {}),
        ...(options.polling ? { polling: options.polling } : {}),
      };
      return {
        startOptions,
        request,
        strategy: 'cloud',
        zipName: zipName ?? null,
        filesTotal: options.filesTotal ?? 0,
        publicKey: null,
        apiBaseUrl,
        autoDownload,
      };
    }

    const files = toSourceFiles(options.files);
    if (strategy === 'cloud') {
      const publicKey = ('publicKey' in options ? options.publicKey : undefined) ?? this.config.publicKey ?? null;
      const apiBaseUrl = ('apiBaseUrl' in options ? options.apiBaseUrl : undefined) ?? this.config.apiBaseUrl ?? null;
      const mode = ('mode' in options ? options.mode : undefined) ?? defaults.mode;
      const startOptions: CloudZipOptions = {
        ...shared,
        strategy: 'cloud',
        files,
        publicKey: publicKey ?? '',
        ...(apiBaseUrl ? { apiBaseUrl } : {}),
        ...(mode ? { mode } : {}),
        ...('turnstileToken' in options && options.turnstileToken ? { turnstileToken: options.turnstileToken } : {}),
        ...('onChallenge' in options && options.onChallenge ? { onChallenge: options.onChallenge } : {}),
        ...('polling' in options && options.polling ? { polling: options.polling } : {}),
      };
      return {
        startOptions,
        request,
        strategy: 'cloud',
        zipName: zipName ?? null,
        filesTotal: files.length,
        publicKey,
        apiBaseUrl,
        autoDownload,
      };
    }

    const compressionLevel = ('compressionLevel' in options ? options.compressionLevel : undefined) ??
      defaults.compressionLevel;
    const startOptions: LocalZipOptions = {
      ...shared,
      strategy: 'local',
      files,
      ...(compressionLevel != null ? { compressionLevel } : {}),
      ...('concurrency' in options && options.concurrency != null ? { concurrency: options.concurrency } : {}),
      ...('onProgress' in options && options.onProgress ? { onProgress: options.onProgress } : {}),
    };
    return {
      startOptions,
      request,
      strategy: 'local',
      zipName: zipName ?? null,
      filesTotal: files.length,
      publicKey: null,
      apiBaseUrl: null,
      autoDownload,
    };
  }

  private attachJob(id: string, job: ZipJob): void {
    const internal = this.currentMatching(id);
    if (!internal) return;
    internal.job = job;
    const onUpdate = () => this.applyJobSnapshot(id, job);
    internal.unsubscribeJob = job.subscribe(onUpdate);
    onUpdate();
  }

  private applyJobSnapshot(id: string, job: ZipJob): void {
    const internal = this.currentMatching(id);
    if (!internal || internal.job !== job) return;
    const snapshot = job.getSnapshot();
    if (snapshot.status === 'aborted') return; // cancel() already clears the tray

    if (snapshot.session && !internal.sessionId) {
      internal.sessionId = snapshot.session.sessionId;
      internal.clientSecret = snapshot.session.clientSecret;
      internal.apiBaseUrl = snapshot.session.apiBaseUrl;
    }

    const wasProcessing = internal.task.state === 'processing';
    internal.task = snapshotToTask(snapshot, internal.task);

    if (snapshot.status === 'failed') {
      const error = snapshot.error;
      if (
        error instanceof EazipSessionExpiredError ||
        error instanceof EazipSessionRevokedError ||
        error instanceof EazipDownloadExpiredError
      ) {
        internal.task = { ...internal.task, state: 'expired', error: null };
      }
      this.expanded = true;
      this.commit();
      return;
    }

    if (snapshot.status === 'completed' || snapshot.status === 'partial') {
      this.expanded = true;
      this.scheduleExpiry();
      this.commit();
      if (wasProcessing && internal.autoDownload && !internal.restored && internal.task.zips.length > 0) {
        this.downloadZip(id, 0);
      }
      return;
    }

    this.commit();
  }

  private restoreFromEnvelope(envelope: PersistedEnvelope): void {
    const persisted = envelope.task;
    let state = persisted.state;
    if (
      (state === 'completed' || state === 'partial') &&
      persisted.expiresAt != null &&
      persisted.expiresAt <= this.deps.now()
    ) {
      state = 'expired';
    }
    const request = persisted.request ? requestFromPersisted(persisted) : null;
    this.current = {
      task: {
        id: persisted.id,
        state,
        strategy: 'cloud',
        zipName: persisted.zipName,
        filesTotal: persisted.filesTotal,
        progress: null,
        zips: persisted.zips.map((zip) => ({
          filename: zip.filename,
          ...(zip.size != null ? { size: zip.size } : {}),
          ...(zip.downloadUrl ? { downloadUrl: zip.downloadUrl } : {}),
          downloadStarted: zip.downloadStarted,
        })),
        skippedCount: persisted.skippedCount,
        skipped: [],
        error: null,
        downloadStarted: persisted.downloadStarted,
        createdAt: persisted.createdAt,
        expiresAt: persisted.expiresAt,
        canRetry: request != null,
      },
      job: null,
      unsubscribeJob: null,
      request,
      sessionId: persisted.sessionId,
      clientSecret: persisted.clientSecret,
      publicKey: persisted.publicKey ?? null,
      apiBaseUrl: persisted.apiBaseUrl ?? null,
      autoDownload: false,
      restored: true,
    };
    this.expanded = envelope.expanded;
    this.scheduleExpiry();
    this.commit();
    if (state === 'processing') {
      const job = this.deps.resumeZip({
        sessionId: persisted.sessionId,
        clientSecret: persisted.clientSecret,
        ...(persisted.apiBaseUrl ? { apiBaseUrl: persisted.apiBaseUrl } : {}),
      });
      this.attachJob(persisted.id, job);
    }
  }

  private scheduleExpiry(): void {
    if (this.expiryTimer != null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
    const internal = this.current;
    if (!internal) return;
    const { task } = internal;
    if ((task.state !== 'completed' && task.state !== 'partial') || task.expiresAt == null) return;
    const delay = task.expiresAt - this.deps.now();
    if (delay <= 0) {
      internal.task = { ...task, state: 'expired' };
      return;
    }
    if (delay > MAX_TIMEOUT_MS) return;
    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null;
      const active = this.current;
      if (!active || active.task.id !== task.id) return;
      if (active.task.state !== 'completed' && active.task.state !== 'partial') return;
      active.task = { ...active.task, state: 'expired' };
      this.commit();
    }, delay);
  }

  private disposeCurrent(): void {
    if (this.expiryTimer != null) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
    const internal = this.current;
    if (!internal) return;
    internal.unsubscribeJob?.();
    internal.job?.abort();
    internal.job?.dispose();
    this.current = null;
  }

  private clearCurrent(): void {
    this.disposeCurrent();
    this.expanded = false;
    this.commit();
  }

  private commit(): void {
    this.snapshot = {
      tasks: this.current ? [this.current.task] : [],
      expanded: this.expanded,
    };
    this.persist();
    for (const listener of [...this.listeners]) listener();
  }

  private persist(): void {
    if (this.config.persist === false) return;
    const storage = this.deps.getStorage();
    if (!storage) return;
    const key = this.storageKey();
    const internal = this.current;
    if (
      !internal ||
      internal.task.strategy !== 'cloud' ||
      !internal.sessionId ||
      !internal.clientSecret
    ) {
      clearEnvelope(storage, key);
      return;
    }
    saveEnvelope(storage, key, {
      v: 1,
      expanded: this.expanded,
      task: serializeTask(internal),
    });
  }
}

function serializeTask(internal: InternalTask): PersistedTask {
  const { task } = internal;
  const request = persistableRequest(internal.request);
  return {
    id: task.id,
    state: task.state,
    zipName: task.zipName,
    filesTotal: task.filesTotal,
    createdAt: task.createdAt,
    expiresAt: task.expiresAt,
    sessionId: internal.sessionId as string,
    clientSecret: internal.clientSecret as string,
    ...(internal.publicKey ? { publicKey: internal.publicKey } : {}),
    ...(internal.apiBaseUrl ? { apiBaseUrl: internal.apiBaseUrl } : {}),
    downloadStarted: task.downloadStarted,
    zips: task.zips.map((zip) => ({
      filename: zip.filename,
      ...(zip.size != null ? { size: zip.size } : {}),
      ...(zip.downloadUrl ? { downloadUrl: zip.downloadUrl } : {}),
      downloadStarted: zip.downloadStarted,
    })),
    skippedCount: task.skippedCount,
    ...(request ? { request } : {}),
  };
}

function persistableRequest(request: RetryRequest | null): PersistedRequest | undefined {
  if (!request) return undefined;
  if (!('files' in request.options)) return undefined;
  const input = request.options.files;
  if (input == null) return undefined;
  const files: PersistedRequest['files'] = [];
  let sourceFiles: ReturnType<typeof toSourceFiles>;
  try {
    sourceFiles = toSourceFiles(input);
  } catch {
    return undefined;
  }
  for (const file of sourceFiles) {
    if (!('url' in file)) return undefined;
    files.push({ url: file.url, ...(file.filename ? { filename: file.filename } : {}) });
  }
  const { zipName, failOnUrlError, maxZipSizeBytes } = request.options;
  const mode = 'mode' in request.options ? request.options.mode : undefined;
  return {
    files,
    options: {
      ...(zipName ? { zipName } : {}),
      ...(mode ? { mode } : {}),
      ...(failOnUrlError != null ? { failOnUrlError } : {}),
      ...(maxZipSizeBytes != null ? { maxZipSizeBytes } : {}),
    },
  };
}

function requestFromPersisted(persisted: PersistedTask): RetryRequest | null {
  if (!persisted.request) return null;
  if (!persisted.publicKey) return null;
  return {
    options: {
      ...persisted.request.options,
      strategy: 'cloud',
      publicKey: persisted.publicKey,
      files: persisted.request.files.map((file) => ({
        url: file.url,
        ...(file.filename ? { filename: file.filename } : {}),
      })),
      ...(persisted.apiBaseUrl ? { apiBaseUrl: persisted.apiBaseUrl } : {}),
    },
  };
}

function isCloudSessionDownloadOptions(
  options: EazipDownloadOptions,
): options is CloudSessionZipOptions & { autoDownload?: boolean } {
  return 'createSession' in options && typeof options.createSession === 'function';
}
