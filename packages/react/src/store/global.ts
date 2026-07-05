'use client';

import { EazipStore } from './store.js';

let defaultStore: EazipStore | undefined;

/** Lazily created module-level store backing provider-less usage. */
export function getDefaultStore(): EazipStore {
  if (!defaultStore) defaultStore = new EazipStore();
  return defaultStore;
}

/** Test helper: drop the shared default store so each test starts clean. */
export function resetDefaultStore(): void {
  defaultStore = undefined;
}
