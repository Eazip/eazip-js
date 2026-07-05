import { describe, expect, it } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { EazipProvider } from '../src/context.js';
import { EazipStore } from '../src/store/store.js';
import { useEazip } from '../src/use-eazip.js';
import { makeDeps } from './helpers.js';

function providerWrapper(store: EazipStore) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <EazipProvider store={store}>{children}</EazipProvider>;
  };
}

describe('useEazip', () => {
  it('drives a download through the provider store', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });
    const hook = renderHook(() => useEazip(), { wrapper: providerWrapper(store) });

    expect(hook.result.current.task).toBeNull();
    expect(hook.result.current.isBusy).toBe(false);

    let id = '';
    act(() => {
      id = hook.result.current.download([new File(['a'], 'a.txt')]);
    });
    expect(hook.result.current.task).toMatchObject({ id, state: 'processing' });
    expect(hook.result.current.isBusy).toBe(true);

    act(() => {
      jobs[0]!.complete();
    });
    expect(hook.result.current.task?.state).toBe('completed');
    expect(hook.result.current.isBusy).toBe(false);
    expect(hook.result.current.tasks).toHaveLength(1);

    act(() => {
      hook.result.current.dismiss();
    });
    expect(hook.result.current.task).toBeNull();
  });

  it('isolates state between separate providers', () => {
    const a = makeDeps();
    const b = makeDeps();
    const storeA = new EazipStore(a.deps, { autoDownload: false });
    const storeB = new EazipStore(b.deps, { autoDownload: false });
    const hookA = renderHook(() => useEazip(), { wrapper: providerWrapper(storeA) });
    const hookB = renderHook(() => useEazip(), { wrapper: providerWrapper(storeB) });

    act(() => {
      hookA.result.current.download([new File(['a'], 'a.txt')]);
      a.jobs[0]!.complete();
    });
    expect(hookA.result.current.task?.state).toBe('completed');
    expect(hookB.result.current.task).toBeNull();
  });

  it('works without a provider via the shared default store', () => {
    const hook = renderHook(() => useEazip());
    expect(hook.result.current.task).toBeNull();
    expect(typeof hook.result.current.download).toBe('function');
  });

  it('hydrates persisted state on mount', async () => {
    const { deps, storage } = makeDeps();
    storage.setItem(
      'eazip-tray-v1',
      JSON.stringify({
        v: 1,
        expanded: false,
        task: {
          id: 't1',
          state: 'completed',
          zipName: null,
          filesTotal: 2,
          createdAt: 0,
          expiresAt: null,
          sessionId: 's1',
          clientSecret: 'cs1',
          publicKey: 'pk',
          downloadStarted: true,
          zips: [{ filename: 'export.zip', downloadStarted: true }],
          skippedCount: 0,
        },
      }),
    );
    const store = new EazipStore(deps);
    const hook = renderHook(() => useEazip(), { wrapper: providerWrapper(store) });
    await act(async () => {});
    expect(hook.result.current.task?.state).toBe('completed');
    expect(hook.result.current.task?.zips[0]?.filename).toBe('export.zip');
  });

  it('provider without an explicit store applies config', () => {
    const seen: string[] = [];
    function Probe() {
      const eazip = useEazip();
      seen.push(typeof eazip.download);
      return null;
    }
    render(
      <EazipProvider config={{ strategy: 'cloud', publicKey: 'pk_test', persist: false }}>
        <Probe />
      </EazipProvider>,
    );
    expect(seen).toContain('function');
  });
});
