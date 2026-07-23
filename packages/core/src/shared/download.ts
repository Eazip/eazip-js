import { EazipValidationError } from './errors.js';

/** Delay between anchor clicks in downloadAll (browser popup heuristics). */
export const DOWNLOAD_STAGGER_MS = 300;

/** Returns true when DOM download APIs are available. */
export function isBrowser(): boolean {
  return typeof document !== 'undefined' && typeof window !== 'undefined';
}

/** Starts a download via a temporary anchor click. Browser-only. */
export function triggerDownload(url: string, filename?: string): void {
  if (!isBrowser()) {
    throw new EazipValidationError('DOWNLOAD_UNAVAILABLE', 'Downloads are only available in a browser environment');
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener';
  if (filename) anchor.download = filename;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

/** Creates an object URL when the runtime exposes `URL.createObjectURL`. */
export function createObjectUrl(blob: Blob): string | undefined {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return undefined;
  return URL.createObjectURL(blob);
}

/** Runs `download(i)` for each index with a stagger between clicks. */
export function staggerDownloads(count: number, download: (index: number) => void): void {
  for (let index = 0; index < count; index += 1) {
    if (index === 0) {
      download(index);
    } else {
      setTimeout(() => download(index), index * DOWNLOAD_STAGGER_MS);
    }
  }
}
