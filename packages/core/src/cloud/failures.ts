import type { EazipError, EazipCloudFailure, EazipCloudJob } from '../shared/types.js';

export function cloudFailureMessage(failure: EazipCloudFailure): string {
  const source = failure.fileIndex != null ? `Source file ${failure.fileIndex + 1}` : 'A source file';

  switch (failure.code) {
    case 'SOURCE_HTTP_ERROR':
      return failure.status != null
        ? `${source} returned HTTP ${failure.status}`
        : `${source} returned an HTTP error`;
    case 'SOURCE_TIMEOUT':
      return `${source} timed out`;
    case 'SOURCE_FETCH_FAILED':
      return `${source} could not be fetched`;
    case 'LIMIT_EXCEEDED':
      return 'A configured job limit was exceeded';
    case 'PROCESSING_FAILED':
      return 'Cloud processing failed';
  }
}

export function cloudJobFailureMessage(job: EazipCloudJob): string {
  const [first] = job.failures;
  if (!first) return 'The zip job failed';
  const remaining = Math.max(0, job.failedCount - 1);
  return `The zip job failed: ${cloudFailureMessage(first)}${remaining > 0 ? ` (+${remaining} more)` : ''}`;
}

export function cloudFailuresToErrors(failures: readonly EazipCloudFailure[]): EazipError[] {
  return failures.map((failure) => ({
    code: failure.code,
    message: cloudFailureMessage(failure),
    ...(failure.fileIndex != null ? { fileIndex: failure.fileIndex } : {}),
  }));
}

export function cloudSkippedCount(job: EazipCloudJob): number {
  if (job.fileCount != null) return Math.max(0, job.urlCount - job.fileCount);
  return new Set(job.failures.flatMap((failure) => (
    failure.fileIndex != null ? [failure.fileIndex] : []
  ))).size;
}
