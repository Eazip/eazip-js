'use client';

import { en } from './en.js';
import { ja } from './ja.js';

/** Complete message catalog rendered by `EazipTray`. */
export type EazipTrayMessages = {
  preparingTitle: (filesTotal: number) => string;
  downloadReadyTitle: string;
  downloadStartedTitle: string;
  readySubtitle: (zipCount: number, totalSize: string | null) => string;
  skippedSubtitle: (skippedCount: number) => string;
  failedTitle: string;
  failedSubtitle: string;
  expiredTitle: string;
  expiredSubtitle: string;
  processingStage: string;
  processingDescription: (filesTotal: number) => string;
  cancelExport: string;
  autoStartedBanner: string;
  partialBanner: (skippedCount: number) => string;
  download: string;
  downloadAgain: string;
  downloadAll: string;
  done: string;
  includedFiles: (count: number) => string;
  viewSkipped: string;
  hideSkipped: string;
  failedBodyTitle: string;
  failedBody: string;
  errorDetail: (code: string, message: string) => string;
  retry: string;
  dismiss: string;
  runAgain: string;
  expiredBodyTitle: string;
  expiredBody: string;
  close: string;
  expand: string;
  collapse: string;
  progressLabel: string;
};

/** Built-in locale identifiers. */
export type EazipTrayLocale = 'en' | 'ja';

const CATALOGS: Record<EazipTrayLocale, EazipTrayMessages> = { en, ja };

export function resolveMessages(
  locale: EazipTrayLocale = 'en',
  overrides?: Partial<EazipTrayMessages>,
): EazipTrayMessages {
  const base = CATALOGS[locale] ?? en;
  if (!overrides) return base;
  return { ...base, ...overrides };
}

export { en, ja };
