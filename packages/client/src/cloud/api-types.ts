import type { EazipCloudJobStatus, EazipMode, EazipZipStatus } from '../shared/types.js';

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message?: string;
    challenge?: {
      provider: 'turnstile';
      challenge_url: string;
      site_key?: string;
    };
  };
};

export type ApiCreateSessionResponse = {
  success: true;
  session: {
    id: string;
    status: EazipCloudJobStatus;
    created_at: string;
    expires_at: string;
  };
  client_secret: string;
};

export type ApiSessionDetailResponse = {
  success: true;
  session: {
    id: string;
    created_at: string;
    expires_at: string;
    job: {
      status: EazipCloudJobStatus;
      mode: EazipMode;
      url_count: number;
      file_count?: number;
      zip_filename: string;
      fail_on_url_error: boolean;
      created_at: string;
      completed_at: string | null;
      expires_at: string | null;
      multi_zip: boolean;
      max_zip_size_bytes: number | null;
      zip_count: number;
      total_size: number | null;
      zips: Array<{
        id: string;
        sequence: number;
        status: EazipZipStatus;
        filename: string;
        file_count: number;
        size: number | null;
        download_url: string | null;
      }>;
    };
  };
};

export type ApiResponse<T> = T | ApiErrorResponse;
