import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EazipSessionExpiredError, EazipValidationError } from '@eazip/core';
import { EazipProvider } from '../src/context.js';
import { EazipStore } from '../src/store/store.js';
import { EazipTray } from '../src/tray/EazipTray.js';
import { makeDeps } from './helpers.js';
import type { EazipTrayProps } from '../src/tray/EazipTray.js';

function renderTray(store: EazipStore, props: EazipTrayProps = {}) {
  return render(
    <EazipProvider store={store}>
      <EazipTray {...props} />
    </EazipProvider>,
  );
}

describe('EazipTray', () => {
  it('renders nothing without a task', () => {
    const { deps } = makeDeps();
    renderTray(new EazipStore(deps));
    expect(document.querySelector('.ez-root')).toBeNull();
  });

  it('shows the processing state with slim bar, then expands to details', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });
    renderTray(store);

    act(() => {
      store.download([new File(['a'], 'a.txt'), new File(['b'], 'b.txt')]);
    });

    expect(screen.getByText('Preparing 2 files')).toBeTruthy();
    expect(document.querySelector('.ez-slim-bar')).not.toBeNull();
    expect(document.querySelector('.ez-body')).toBeNull();

    fireEvent.click(screen.getByText('Preparing 2 files'));
    expect(document.querySelector('.ez-body')).not.toBeNull();
    expect(screen.getByText('Preparing your download')).toBeTruthy();
    expect(screen.getByText('Cancel export')).toBeTruthy();

    act(() => {
      jobs[0]!.complete();
    });
    expect(screen.getByText('Download ready')).toBeTruthy();
  });

  it('cancel button clears the tray', () => {
    const { deps } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });
    renderTray(store);

    act(() => {
      store.download([new File(['a'], 'a.txt')]);
      store.setExpanded(true);
    });
    fireEvent.click(screen.getByText('Cancel export'));
    expect(document.querySelector('.ez-root')).toBeNull();
  });

  it('renders the completed state with zip rows and footer actions', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });
    renderTray(store);

    act(() => {
      store.download([new File(['a'], 'a.txt')]);
      jobs[0]!.complete();
    });
    expect(screen.getByText('Download ready')).toBeTruthy();
    expect(screen.getByText('download.zip')).toBeTruthy();
    expect(screen.getByText('1 file included')).toBeTruthy();

    fireEvent.click(screen.getByText('Done'));
    expect(document.querySelector('.ez-root')).toBeNull();
  });

  it('shows partial state with banner and skipped list toggle', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });
    renderTray(store);

    act(() => {
      store.download(['https://example.com/a.png', 'https://example.com/big.psd']);
      jobs[0]!.complete({
        errors: [{ code: 'LOCAL_SOURCE_FETCH_FAILED', message: 'Too large', filename: 'big.psd' }],
      });
    });
    expect(screen.getByText('1 file skipped')).toBeTruthy();
    expect(screen.getByText(/couldn't be added/)).toBeTruthy();

    fireEvent.click(screen.getByText('View skipped'));
    expect(screen.getByText('big.psd')).toBeTruthy();
    expect(screen.getByText('Too large')).toBeTruthy();
    fireEvent.click(screen.getByText('Hide skipped'));
    expect(screen.queryByText('big.psd')).toBeNull();
  });

  it('renders the failed state with error detail and retry', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });
    renderTray(store);

    act(() => {
      store.download([new File(['a'], 'a.txt')]);
      jobs[0]!.failJob(new EazipValidationError('UNKNOWN', 'boom'));
    });
    expect(screen.getByText('Download failed')).toBeTruthy();
    expect(screen.getByText(/error: UNKNOWN · boom/)).toBeTruthy();

    fireEvent.click(screen.getByText('Retry export'));
    act(() => {
      jobs[1]!.complete();
    });
    expect(screen.getByText('Download ready')).toBeTruthy();
  });

  it('renders the expired state and respects locale ja', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { publicKey: 'pk', strategy: 'cloud', autoDownload: false });
    renderTray(store, { locale: 'ja' });

    act(() => {
      store.download(['https://example.com/a.png']);
      jobs[0]!.emitSession();
      jobs[0]!.failJob(new EazipSessionExpiredError());
    });
    expect(screen.getByText('ダウンロード期限切れ')).toBeTruthy();
    expect(screen.getByText('もう一度実行')).toBeTruthy();
  });

  it('applies message overrides and custom class', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });
    renderTray(store, { messages: { downloadReadyTitle: 'Ready to grab' }, className: 'my-tray' });

    act(() => {
      store.download([new File(['a'], 'a.txt')]);
      jobs[0]!.complete();
    });
    expect(screen.getByText('Ready to grab')).toBeTruthy();
    expect(document.querySelector('.ez-root.my-tray')).not.toBeNull();
  });

  it('has the expected a11y roles and Escape collapses', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });
    renderTray(store);

    act(() => {
      store.download([new File(['a'], 'a.txt')]);
      jobs[0]!.complete();
    });
    expect(screen.getByText('Download ready')).toBeTruthy();

    const root = document.querySelector('.ez-root')!;
    expect(root.getAttribute('role')).toBe('status');
    expect(root.getAttribute('aria-live')).toBe('polite');

    const chevron = screen.getByRole('button', { name: 'Collapse details' });
    expect(chevron.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(root, { key: 'Escape' });
    expect(store.getSnapshot().expanded).toBe(false);
  });

  it('auto-hides after completion when the download started', () => {
    vi.useFakeTimers();
    try {
      const { deps, jobs } = makeDeps({ now: () => Date.now() });
      const store = new EazipStore(deps);
      renderTray(store, { autoHideMs: 5000 });

      act(() => {
        store.download([new File(['a'], 'a.txt')]);
        jobs[0]!.complete();
      });
      expect(store.getSnapshot().tasks[0]?.downloadStarted).toBe(true);

      act(() => {
        vi.advanceTimersByTime(5100);
      });
      expect(store.getSnapshot().tasks).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('placement and theme props shape the root element', () => {
    const { deps, jobs } = makeDeps();
    const store = new EazipStore(deps, { autoDownload: false });
    renderTray(store, { placement: 'bar', theme: 'dark', accent: '#ff0000', zIndex: 42 });

    act(() => {
      store.download([new File(['a'], 'a.txt')]);
      jobs[0]!.complete();
    });
    expect(screen.getByText('Download ready')).toBeTruthy();

    const root = document.querySelector('.ez-root') as HTMLElement;
    expect(root.className).toContain('ez-place-bar');
    expect(root.className).toContain('ez-expanded');
    expect(root.style.getPropertyValue('--ez-accent')).toBe('#ff0000');
    expect(root.style.getPropertyValue('--ez-surface')).toBe('#161719');
    expect(root.style.getPropertyValue('--ez-z')).toBe('42');
  });
});
