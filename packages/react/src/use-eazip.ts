'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useEazipStore, useHydrateStore } from './internal/use-store.js';
import type { UseEazipResult } from './types.js';

export function useEazip(): UseEazipResult {
  const store = useEazipStore();
  useHydrateStore(store);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return useMemo(() => {
    const task = snapshot.tasks[0] ?? null;
    return {
      download: store.download,
      task,
      tasks: snapshot.tasks,
      isBusy: task?.state === 'processing',
      cancel: store.cancel,
      retry: store.retry,
      dismiss: store.dismiss,
      downloadZip: store.downloadZip,
      downloadAll: store.downloadAll,
    };
  }, [store, snapshot]);
}
