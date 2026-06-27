import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';
import { EazipAbortError, EazipDownloadExpiredError, EazipValidationError } from '../shared/errors.js';
import type {
  CreateZipOptions,
  EazipProgress,
  EazipSourceFile,
  EazipZipOutput,
  LocalCreateZipResult,
} from '../shared/types.js';
import { normalizeEntryName, normalizeZipFilename, uniqueEntryName } from './filenames.js';

const DEFAULT_COMPRESSION_LEVEL = 6;

type LocalSource = {
  blob: Blob;
  filename: string;
  lastModified?: Date;
};

export async function createLocalZip(options: CreateZipOptions): Promise<LocalCreateZipResult> {
  const sources = await resolveLocalSources(options);
  if (sources.length === 0) {
    throw new EazipValidationError('NO_FILES', 'At least one file is required');
  }

  throwIfAborted(options.signal);
  const filename = normalizeZipFilename(options.zipName);
  const level = normalizeCompressionLevel(options.compressionLevel);
  const bytesTotal = sources.reduce((total, source) => total + source.blob.size, 0);
  let completedBytes = 0;
  const usedNames = new Set<string>();
  const writerOptions = {
    level,
    zip64: true,
    ...(options.signal ? { signal: options.signal } : {}),
  };
  const zipWriter = new ZipWriter(new BlobWriter('application/zip'), writerOptions);

  options.onStatusChange?.('creating');
  emitProgress(options, {
    phase: 'starting',
    filesTotal: sources.length,
    filesCompleted: 0,
    bytesTotal,
    bytesProcessed: 0,
  });
  options.onStatusChange?.('processing');

  try {
    for (const [index, source] of sources.entries()) {
      throwIfAborted(options.signal);
      const entryName = uniqueEntryName(source.filename, usedNames);
      await zipWriter.add(entryName, new BlobReader(source.blob), {
        level,
        zip64: source.blob.size >= 0xffffffff,
        ...(options.signal ? { signal: options.signal } : {}),
        ...(source.lastModified ? { lastModDate: source.lastModified } : {}),
        onprogress: (progress) => {
          emitProgress(options, {
            phase: 'adding',
            filesTotal: sources.length,
            filesCompleted: index,
            bytesTotal,
            bytesProcessed: completedBytes + progress,
            currentFileIndex: index,
            currentFileName: entryName,
          });
        },
      });
      completedBytes += source.blob.size;
      emitProgress(options, {
        phase: 'adding',
        filesTotal: sources.length,
        filesCompleted: index + 1,
        bytesTotal,
        bytesProcessed: completedBytes,
        currentFileIndex: index,
        currentFileName: entryName,
      });
    }

    emitProgress(options, {
      phase: 'finalizing',
      filesTotal: sources.length,
      filesCompleted: sources.length,
      bytesTotal,
      bytesProcessed: completedBytes,
    });
    const blob = await zipWriter.close(undefined, { zip64: true });

    if (options.maxZipSizeBytes != null && blob.size > options.maxZipSizeBytes) {
      throw new EazipValidationError(
        'MAX_ZIP_SIZE_EXCEEDED',
        `ZIP size ${blob.size} bytes exceeds the configured limit of ${options.maxZipSizeBytes} bytes`,
      );
    }

    const downloadUrl = createObjectUrl(blob);
    const zip: EazipZipOutput = {
      sequence: 1,
      status: 'completed',
      filename,
      fileCount: sources.length,
      size: blob.size,
      ...(downloadUrl ? { downloadUrl } : {}),
    };

    options.onStatusChange?.('completed');
    emitProgress(options, {
      phase: 'completed',
      filesTotal: sources.length,
      filesCompleted: sources.length,
      bytesTotal,
      bytesProcessed: completedBytes,
    });

    return {
      strategy: 'local',
      status: 'completed',
      filename,
      blob,
      size: blob.size,
      ...(downloadUrl ? { downloadUrl } : {}),
      zips: [zip],
      errors: [],
      download: async () => {
        downloadBlob(filename, blob, downloadUrl);
      },
      revokeObjectUrl: () => {
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      },
    };
  } catch (error) {
    if (isAbortLike(error, options.signal)) throw new EazipAbortError();
    throw error;
  }
}

async function resolveLocalSources(options: CreateZipOptions): Promise<LocalSource[]> {
  const sources: LocalSource[] = [];
  for (const [index, source] of options.files.entries()) {
    throwIfAborted(options.signal);
    if ('file' in source) {
      sources.push(toLocalBlobSource(source, index));
      continue;
    }
    sources.push(await fetchLocalUrlSource(source, index, options));
  }
  return sources;
}

function toLocalBlobSource(source: Extract<EazipSourceFile, { file: File | Blob }>, index: number): LocalSource {
  const blob = source.file;
  const fileLike = blob as File & { webkitRelativePath?: string };
  const rawName = source.filename || fileLike.webkitRelativePath || fileLike.name || `file-${index + 1}`;
  const localSource: LocalSource = {
    blob,
    filename: normalizeEntryName(rawName, `file-${index + 1}`),
  };
  if (typeof fileLike.lastModified === 'number') {
    localSource.lastModified = new Date(fileLike.lastModified);
  }
  return localSource;
}

async function fetchLocalUrlSource(
  source: Extract<EazipSourceFile, { url: string }>,
  index: number,
  options: CreateZipOptions,
): Promise<LocalSource> {
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!fetchImpl) {
    throw new EazipValidationError('LOCAL_FETCH_UNAVAILABLE', 'No fetch implementation is available for local URL sources');
  }

  const filename = normalizeEntryName(source.filename || filenameFromUrl(source.url) || `file-${index + 1}`, `file-${index + 1}`);
  emitProgress(options, {
    phase: 'fetching',
    filesTotal: options.files.length,
    filesCompleted: index,
    currentFileIndex: index,
    currentFileName: filename,
  });

  let response: Response;
  try {
    response = await fetchImpl(source.url, {
      credentials: 'omit',
      ...(options.signal ? { signal: options.signal } : {}),
    });
  } catch (error) {
    if (isAbortLike(error, options.signal)) throw new EazipAbortError();
    throw new EazipValidationError('LOCAL_SOURCE_FETCH_FAILED', `Failed to fetch local URL source: ${source.url}`, { cause: error });
  }

  if (!response.ok) {
    throw new EazipValidationError(
      'LOCAL_SOURCE_FETCH_FAILED',
      `Failed to fetch local URL source: ${source.url} (${response.status})`,
      { status: response.status },
    );
  }

  try {
    const blob = await response.blob();
    return { blob, filename };
  } catch (error) {
    if (isAbortLike(error, options.signal)) throw new EazipAbortError();
    throw new EazipValidationError('LOCAL_SOURCE_READ_FAILED', `Failed to read local URL source: ${source.url}`, { cause: error });
  }
}

function filenameFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url, typeof location === 'undefined' ? 'https://example.invalid' : location.href);
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    return segment ? decodeURIComponent(segment) : undefined;
  } catch {
    return undefined;
  }
}

function normalizeCompressionLevel(value: number | undefined): number {
  if (value == null) return DEFAULT_COMPRESSION_LEVEL;
  if (!Number.isInteger(value) || value < 0 || value > 9) {
    throw new EazipValidationError('INVALID_COMPRESSION_LEVEL', 'compressionLevel must be an integer from 0 to 9');
  }
  return value;
}

function emitProgress(
  options: CreateZipOptions,
  progress: Omit<EazipProgress, 'strategy' | 'status'> & { phase: EazipProgress['phase'] },
): void {
  options.onProgress?.({
    strategy: 'local',
    status: progress.phase === 'completed' ? 'completed' : progress.phase === 'starting' ? 'creating' : 'processing',
    ...progress,
  });
}

function createObjectUrl(blob: Blob): string | undefined {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return undefined;
  return URL.createObjectURL(blob);
}

function downloadBlob(filename: string, blob: Blob, existingUrl: string | undefined): void {
  const url = existingUrl || createObjectUrl(blob);
  if (!url || typeof document === 'undefined') {
    throw new EazipDownloadExpiredError('Download is only available in a browser environment');
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  if (!existingUrl) URL.revokeObjectURL(url);
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new EazipAbortError();
}

function isAbortLike(error: unknown, signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true || (error instanceof Error && error.name === 'AbortError');
}
