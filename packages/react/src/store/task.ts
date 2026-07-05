'use client';

import type { EazipError, ZipJobSnapshot } from '@eazip/core';
import type { EazipTask, EazipTaskSkippedFile, EazipTaskZip } from '../types.js';

export function skippedFromErrors(errors: EazipError[]): EazipTaskSkippedFile[] {
  return errors.map((error) => ({
    ...(error.filename ? { filename: error.filename } : {}),
    reason: error.message || error.code,
  }));
}

export function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Map a core ZipJobSnapshot onto the previous EazipTask, preserving UI-only flags. */
export function snapshotToTask(snapshot: ZipJobSnapshot, previous: EazipTask): EazipTask {
  const zips: EazipTaskZip[] = snapshot.zips.map((zip, index) => ({
    filename: zip.filename,
    ...(zip.size != null ? { size: zip.size } : {}),
    ...(zip.downloadUrl ? { downloadUrl: zip.downloadUrl } : {}),
    downloadStarted: previous.zips[index]?.downloadStarted ?? false,
  }));

  const base: EazipTask = {
    ...previous,
    zipName: snapshot.zipFilename ?? previous.zipName,
    filesTotal: snapshot.filesTotal > 0 ? snapshot.filesTotal : previous.filesTotal,
    progress: snapshot.progress,
    zips,
    skipped: skippedFromErrors(snapshot.errors),
    skippedCount: snapshot.skippedCount,
    expiresAt: snapshot.session ? parseTimestamp(snapshot.session.expiresAt) : previous.expiresAt,
  };

  switch (snapshot.status) {
    case 'completed':
      return { ...base, state: 'completed', progress: null, error: null };
    case 'partial':
      return { ...base, state: 'partial', progress: null, error: null };
    case 'failed':
      return {
        ...base,
        state: 'failed',
        progress: null,
        error: snapshot.error
          ? { code: snapshot.error.code, message: snapshot.error.message }
          : { code: 'UNKNOWN', message: 'The export failed' },
      };
    default:
      return { ...base, state: 'processing' };
  }
}
