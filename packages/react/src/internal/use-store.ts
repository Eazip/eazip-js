'use client';

import { useEffect } from 'react';
import { useEazipContextStore } from '../context.js';
import { getDefaultStore } from '../store/global.js';
import type { EazipStore } from '../store/store.js';

export function useEazipStore(): EazipStore {
  const contextStore = useEazipContextStore();
  return contextStore ?? getDefaultStore();
}

export function useHydrateStore(store: EazipStore): void {
  useEffect(() => {
    store.hydrate();
  }, [store]);
}
