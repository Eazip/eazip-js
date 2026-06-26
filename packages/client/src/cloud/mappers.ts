import type {
  CreatedCloudSession,
  EazipCloudSession,
  EazipSourceFile,
} from '../shared/types';
import type { ApiCreateSessionResponse, ApiSessionDetailResponse } from './api-types';

export function toCreateSessionRequest(options: {
  files: EazipSourceFile[];
  zipName?: string;
  mode?: 'stored' | 'stream';
  failOnUrlError?: boolean;
  maxZipSizeBytes?: number;
  turnstileToken?: string;
}): Record<string, unknown> {
  return {
    files: options.files.map(toCloudSourceFile),
    ...(options.zipName ? { zip_filename: options.zipName } : {}),
    ...(options.mode ? { mode: options.mode } : {}),
    ...(options.failOnUrlError != null ? { fail_on_url_error: options.failOnUrlError } : {}),
    ...(options.maxZipSizeBytes != null ? { max_zip_size_bytes: options.maxZipSizeBytes } : {}),
    ...(options.turnstileToken ? { turnstile_token: options.turnstileToken } : {}),
  };
}

export function mapCreatedSession(response: ApiCreateSessionResponse): CreatedCloudSession {
  return {
    id: response.session.id,
    clientSecret: response.client_secret,
    status: response.session.status,
    createdAt: response.session.created_at,
    expiresAt: response.session.expires_at,
  };
}

export function mapSessionDetail(response: ApiSessionDetailResponse): EazipCloudSession {
  const job = response.session.job;
  return {
    id: response.session.id,
    createdAt: response.session.created_at,
    expiresAt: response.session.expires_at,
    job: {
      status: job.status,
      mode: job.mode,
      urlCount: job.url_count,
      ...(job.file_count != null ? { fileCount: job.file_count } : {}),
      zipFilename: job.zip_filename,
      failOnUrlError: job.fail_on_url_error,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      expiresAt: job.expires_at,
      multiZip: job.multi_zip,
      maxZipSizeBytes: job.max_zip_size_bytes,
      zipCount: job.zip_count,
      totalSize: job.total_size,
      zips: job.zips.map((zip) => ({
        id: zip.id,
        sequence: zip.sequence,
        status: zip.status,
        filename: zip.filename,
        fileCount: zip.file_count,
        ...(zip.size != null ? { size: zip.size } : {}),
        ...(zip.download_url ? { downloadUrl: zip.download_url } : {}),
      })),
    },
  };
}

function toCloudSourceFile(file: EazipSourceFile): { url: string; filename?: string } {
  if (!('url' in file)) {
    throw new TypeError('Cloud sessions only support URL source files');
  }
  return {
    url: file.url,
    ...(file.filename ? { filename: file.filename } : {}),
  };
}
