import { describe, expect, it } from 'vitest';
import * as core from '../src/index.js';

describe('@eazip/core public API', () => {
  it('keeps the top-level runtime surface intentionally small', () => {
    expect(Object.keys(core).sort()).toEqual([
      'EazipAbortError',
      'EazipApiError',
      'EazipChallengeRequiredError',
      'EazipDownloadExpiredError',
      'EazipErrorBase',
      'EazipJobFailedError',
      'EazipNetworkError',
      'EazipQuotaError',
      'EazipRateLimitError',
      'EazipSessionExpiredError',
      'EazipSessionRevokedError',
      'EazipValidationError',
      'createLocalZip',
      'createZip',
      'isEazipError',
      'resumeZip',
      'startCloudZip',
      'startLocalZip',
      'startZip',
    ].sort());
  });
});
