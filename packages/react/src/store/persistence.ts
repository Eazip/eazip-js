'use client';

import type { EazipMode } from '@eazip/core';
import type { EazipTaskState } from '../types.js';

export const DEFAULT_STORAGE_KEY = 'eazip-tray-v1';

export type PersistedZip = {
  filename: string;
  size?: number;
  downloadUrl?: string;
  downloadStarted: boolean;
};

export type PersistedRequestOptions = {
  zipName?: string;
  mode?: EazipMode;
  failOnUrlError?: boolean;
  maxZipSizeBytes?: number;
};

export type PersistedRequest = {
  files: { url: string; filename?: string }[];
  options: PersistedRequestOptions;
};

export type PersistedTask = {
  id: string;
  state: EazipTaskState;
  zipName: string | null;
  filesTotal: number;
  createdAt: number;
  expiresAt: number | null;
  sessionId: string;
  clientSecret: string;
  publicKey: string;
  apiBaseUrl?: string;
  downloadStarted: boolean;
  zips: PersistedZip[];
  skippedCount: number;
  request?: PersistedRequest;
};

export type PersistedEnvelope = {
  v: 1;
  expanded: boolean;
  task: PersistedTask;
};

const TASK_STATES: readonly EazipTaskState[] = ['processing', 'completed', 'partial', 'failed', 'expired'];

export function saveEnvelope(storage: Storage, key: string, envelope: PersistedEnvelope): void {
  try {
    storage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Storage may be full or unavailable (e.g. Safari private mode); persistence is best-effort.
  }
}

export function loadEnvelope(storage: Storage, key: string): PersistedEnvelope | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isEnvelope(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearEnvelope(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Best-effort.
  }
}

function isEnvelope(value: unknown): value is PersistedEnvelope {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Record<string, unknown>;
  if (envelope['v'] !== 1) return false;
  const task = envelope['task'];
  if (!task || typeof task !== 'object') return false;
  const record = task as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['sessionId'] === 'string' &&
    typeof record['clientSecret'] === 'string' &&
    typeof record['publicKey'] === 'string' &&
    typeof record['filesTotal'] === 'number' &&
    Array.isArray(record['zips']) &&
    TASK_STATES.includes(record['state'] as EazipTaskState)
  );
}
