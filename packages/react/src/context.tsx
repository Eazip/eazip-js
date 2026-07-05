'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { EazipStore } from './store/store.js';
import type { EazipConfig } from './types.js';

const EazipContext = createContext<EazipStore | null>(null);

export type EazipProviderProps = {
  config?: EazipConfig;
  /** Advanced: supply a preconfigured store (e.g. with injected deps in tests). */
  store?: EazipStore;
  children: ReactNode;
};

/**
 * Optional provider. `useEazip()` and `<EazipTray />` work without it via a
 * shared default store; wrap your app in `EazipProvider` to set shared config
 * (publicKey, strategy, defaults) or to isolate state (tests, multiple roots).
 */
export function EazipProvider({ config, store, children }: EazipProviderProps): ReactNode {
  const storeRef = useRef<EazipStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = store ?? new EazipStore(undefined, config);
  }
  useEffect(() => {
    if (config) storeRef.current?.setConfig(config);
  }, [config]);
  return <EazipContext.Provider value={storeRef.current}>{children}</EazipContext.Provider>;
}

export function useEazipContextStore(): EazipStore | null {
  return useContext(EazipContext);
}
