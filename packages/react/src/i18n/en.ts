'use client';

import type { EazipTrayMessages } from './index.js';

/** Built-in English messages for `EazipTray`. */
export const en: EazipTrayMessages = {
  preparingTitle: (filesTotal) =>
    filesTotal === 1 ? 'Preparing 1 file' : `Preparing ${filesTotal.toLocaleString()} files`,
  downloadReadyTitle: 'Download ready',
  downloadStartedTitle: 'Download started',
  readySubtitle: (zipCount, totalSize) => {
    const prefix = zipCount > 1 ? `${zipCount} ZIPs` : '';
    if (prefix && totalSize) return `${prefix} · ${totalSize}`;
    return prefix || totalSize || '';
  },
  skippedSubtitle: (skippedCount) =>
    skippedCount === 1 ? '1 file skipped' : `${skippedCount} files skipped`,
  failedTitle: 'Download failed',
  failedSubtitle: 'Tap to see what happened',
  expiredTitle: 'Download expired',
  expiredSubtitle: 'Links no longer available',
  processingStage: 'Preparing your download',
  processingDescription: (filesTotal) =>
    `We're bundling ${filesTotal.toLocaleString()} ${filesTotal === 1 ? 'file' : 'files'} so you can grab ${
      filesTotal === 1 ? 'it' : 'them'
    } in one go. You can keep working — we'll let you know here the moment it's ready.`,
  cancelExport: 'Cancel export',
  autoStartedBanner: "Your download started automatically. If it didn't begin, use the buttons below.",
  partialBanner: (skippedCount) =>
    `ZIP is ready, but ${skippedCount.toLocaleString()} ${
      skippedCount === 1 ? 'file' : 'files'
    } couldn't be added. Everything else is included.`,
  download: 'Download',
  downloadAgain: 'Download again',
  downloadAll: 'Download all',
  done: 'Done',
  includedFiles: (count) =>
    count === 1 ? '1 file included' : `${count.toLocaleString()} files included`,
  viewSkipped: 'View skipped',
  hideSkipped: 'Hide skipped',
  failedBodyTitle: "We couldn't finish this export",
  failedBody: 'Your selection is safe — try again.',
  errorDetail: (code, message) => `error: ${code} · ${message}`,
  retry: 'Retry export',
  dismiss: 'Dismiss',
  runAgain: 'Run again',
  expiredBodyTitle: 'This export has expired',
  expiredBody: 'Download links have expired. Re-run to generate fresh ZIPs.',
  close: 'Close',
  expand: 'Expand details',
  collapse: 'Collapse details',
  progressLabel: 'Export progress',
};
