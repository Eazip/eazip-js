import { BlobReader, BlobWriter, ZipWriter } from '@zip.js/zip.js';
import { isAbortLike, linkAbort, throwIfAborted } from '../shared/abort.js';
import { createObjectUrl, staggerDownloads, triggerDownload } from '../shared/download.js';
import { EazipAbortError, EazipValidationError, toEazipError } from '../shared/errors.js';
import { toSourceFiles } from '../shared/input.js';
import { JobController } from '../shared/job.js';
import type {
  EazipError,
  EazipProgress,
  EazipSourceFile,
  FetchLike,
  LocalZipOptions,
  LocalZipOutput,
  LocalZipResult,
  ZipJob,
} from '../shared/types.js';
import { normalizeEntryName, normalizeZipFilename, uniqueEntryName } from './filenames.js';
import { mapOrdered } from './pool.js';

const DEFAULT_COMPRESSION_LEVEL = 6;
const DEFAULT_CONCURRENCY = 4;

// Conservative size accounting for best-effort zip splitting. Uncompressed
// size bounds deflate output except for its per-block overhead; entry
// overhead covers local + central headers, the name (stored twice), and
// zip64/data-descriptor extra fields.
const ZIP_BASE_OVERHEAD = 120;

function deflateExpansion(size: number): number {
  return Math.ceil(size / 16_384) * 5 + 16;
}

function entryOverhead(entryName: string): number {
  const nameBytes = new TextEncoder().encode(entryName).length;
  return 30 + 46 + 2 * nameBytes + 64;
}

type ResolvedSource =
  | { ok: true; blob: Blob; entryName: string; lastModified?: Date }
  | { ok: false; error: EazipError };

type ClosedPart = {
  blob: Blob;
  fileCount: number;
};

/** Starts a browser-only ZIP job and returns its observable handle immediately. */
export function startLocalZip(options: LocalZipOptions): ZipJob<LocalZipResult> {
  const sources = toSourceFiles(options.files);
  const level = normalizeCompressionLevel(options.compressionLevel);
  const zipFilename = normalizeZipFilename(options.zipName);
  const job = new JobController<LocalZipResult>(
    'local',
    { filesTotal: sources.length, zipFilename },
    options.signal,
  );
  queueMicrotask(() => {
    void runLocal(job, sources, zipFilename, level, options);
  });
  return job;
}

/** Creates a ZIP in the browser and resolves when all ZIP parts are ready. */
export async function createLocalZip(options: LocalZipOptions): Promise<LocalZipResult> {
  return startLocalZip(options).done;
}

async function runLocal(
  job: JobController<LocalZipResult>,
  sources: EazipSourceFile[],
  zipFilename: string,
  level: number,
  options: LocalZipOptions,
): Promise<void> {
  // Engine-owned controller: aborted by job.abort() and by fatal errors so
  // in-flight fetches stop either way.
  const engine = new AbortController();
  linkAbort(job.signal, engine);

  if (options.onChange) job.subscribe(() => options.onChange?.(job.getSnapshot()));

  const failOnUrlError = options.failOnUrlError ?? false;
  const maxZipSizeBytes = options.maxZipSizeBytes;
  const errors: EazipError[] = [];
  const usedNames = new Set<string>();

  const tracker = new ProgressTracker(sources.length, job, options);

  try {
    throwIfAborted(engine.signal);
    tracker.emit({ phase: 'starting' });
    job.patch({ status: 'processing', progress: tracker.progress });

    const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
    const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
    const resolved = mapOrdered(sources, concurrency, (source, index) =>
      resolveSource(source, index, fetchImpl, engine.signal, failOnUrlError, tracker),
    );
    // A rejected worker (failOnUrlError) must not surface as an unhandled
    // rejection while the sequential writer is behind it.
    for (const promise of resolved) promise.catch(() => {});

    const parts: ClosedPart[] = [];
    let writer: ZipWriter<Blob> | null = null;
    let partEstimate = ZIP_BASE_OVERHEAD;
    let partFileCount = 0;
    let addedCount = 0;

    const closePart = async (): Promise<void> => {
      if (!writer || partFileCount === 0) return;
      const blob = await writer.close(undefined, { zip64: true });
      parts.push({ blob, fileCount: partFileCount });
      writer = null;
      partFileCount = 0;
      partEstimate = ZIP_BASE_OVERHEAD;
    };

    for (let index = 0; index < sources.length; index += 1) {
      throwIfAborted(engine.signal);
      const source = await resolved[index]!;
      if (!source.ok) {
        errors.push(source.error);
        tracker.completeFile(index, source.error.filename);
        continue;
      }

      const entryName = uniqueEntryName(source.entryName, usedNames);
      const estimate = source.blob.size + deflateExpansion(source.blob.size) + entryOverhead(entryName);
      if (maxZipSizeBytes != null && partFileCount > 0 && partEstimate + estimate > maxZipSizeBytes) {
        await closePart();
      }
      if (!writer) {
        writer = new ZipWriter(new BlobWriter('application/zip'), {
          level,
          zip64: true,
          signal: engine.signal,
        });
      }

      tracker.startFile(index, entryName, source.blob.size);
      const meta = await writer.add(entryName, new BlobReader(source.blob), {
        level,
        zip64: source.blob.size >= 0xffffffff,
        signal: engine.signal,
        ...(source.lastModified ? { lastModDate: source.lastModified } : {}),
        onprogress: (progress) => {
          tracker.fileProgress(index, entryName, progress);
        },
      });
      partEstimate += (meta?.compressedSize ?? source.blob.size) + entryOverhead(entryName);
      partFileCount += 1;
      addedCount += 1;
      tracker.completeFile(index, entryName, source.blob.size);
    }

    tracker.emit({ phase: 'finalizing' });
    await closePart();

    if (addedCount === 0) {
      throw new EazipValidationError('ALL_SOURCES_FAILED', 'None of the files could be fetched', {
        cause: errors,
      });
    }

    const result = buildResult(job, zipFilename, parts, errors);
    tracker.emit({ phase: 'completed' });
    job.succeed(result);
  } catch (error) {
    engine.abort();
    if (isAbortLike(error)) {
      // job.abort() already transitioned the snapshot; nothing else to do.
      return;
    }
    job.fail(toEazipError(error));
  }
}

async function resolveSource(
  source: EazipSourceFile,
  index: number,
  fetchImpl: FetchLike | undefined,
  signal: AbortSignal,
  failOnUrlError: boolean,
  tracker: ProgressTracker,
): Promise<ResolvedSource> {
  const fallback = `file-${index + 1}`;
  if ('file' in source) {
    const blob = source.file;
    const fileLike = blob as File & { webkitRelativePath?: string };
    const rawName = source.filename || fileLike.webkitRelativePath || fileLike.name || fallback;
    tracker.addKnownBytes(blob.size);
    const resolved: ResolvedSource = {
      ok: true,
      blob,
      entryName: normalizeEntryName(rawName, fallback),
    };
    if (typeof fileLike.lastModified === 'number') {
      resolved.lastModified = new Date(fileLike.lastModified);
    }
    return resolved;
  }

  const filename = normalizeEntryName(source.filename || filenameFromUrl(source.url) || fallback, fallback);
  const skip = (code: string, message: string, extra: { status?: number; cause?: unknown } = {}): ResolvedSource => {
    const error: EazipError = { code, message, fileIndex: index, filename, ...(extra.cause !== undefined ? { cause: extra.cause } : {}) };
    if (failOnUrlError) {
      throw new EazipValidationError(code, message, extra);
    }
    return { ok: false, error };
  };

  if (!fetchImpl) {
    throw new EazipValidationError('LOCAL_FETCH_UNAVAILABLE', 'No fetch implementation is available for URL sources');
  }

  tracker.fetching(index, filename);
  let response: Response;
  try {
    response = await fetchImpl(source.url, { credentials: 'omit', signal });
  } catch (error) {
    if (isAbortLike(error) || signal.aborted) throw new EazipAbortError();
    return skip('LOCAL_SOURCE_FETCH_FAILED', `Failed to fetch ${source.url}`, { cause: error });
  }
  if (!response.ok) {
    return skip('LOCAL_SOURCE_FETCH_FAILED', `Failed to fetch ${source.url} (${response.status})`, {
      status: response.status,
    });
  }

  try {
    const blob = await response.blob();
    tracker.addKnownBytes(blob.size);
    return { ok: true, blob, entryName: filename };
  } catch (error) {
    if (isAbortLike(error) || signal.aborted) throw new EazipAbortError();
    return skip('LOCAL_SOURCE_READ_FAILED', `Failed to read ${source.url}`, { cause: error });
  }
}

function buildResult(
  job: JobController<LocalZipResult>,
  zipFilename: string,
  parts: ClosedPart[],
  errors: EazipError[],
): LocalZipResult {
  const partNames = partFilenames(zipFilename, parts.length);
  const objectUrls: string[] = [];
  const zips: LocalZipOutput[] = parts.map((part, index) => {
    const downloadUrl = createObjectUrl(part.blob);
    if (downloadUrl) objectUrls.push(downloadUrl);
    return {
      sequence: index + 1,
      status: 'completed',
      filename: partNames[index]!,
      fileCount: part.fileCount,
      size: part.blob.size,
      blob: part.blob,
      ...(downloadUrl ? { downloadUrl } : {}),
    };
  });
  job.addDisposer(() => {
    for (const url of objectUrls) URL.revokeObjectURL(url);
  });

  const download = (zipIndex = 0): void => {
    const zip = zips[zipIndex];
    if (!zip) {
      throw new EazipValidationError('INVALID_ZIP_INDEX', `No zip at index ${zipIndex}`);
    }
    const url = zip.downloadUrl ?? createObjectUrl(zip.blob);
    if (!url) {
      throw new EazipValidationError('DOWNLOAD_UNAVAILABLE', 'Downloads are only available in a browser environment');
    }
    triggerDownload(url, zip.filename);
    if (!zip.downloadUrl) URL.revokeObjectURL(url);
  };

  return {
    strategy: 'local',
    status: errors.length > 0 ? 'partial' : 'completed',
    zipFilename,
    totalSize: zips.reduce((total, zip) => total + zip.size, 0),
    zips,
    errors,
    skippedCount: errors.length,
    download,
    downloadAll: () => staggerDownloads(zips.length, download),
    dispose: () => job.dispose(),
  };
}

function partFilenames(zipFilename: string, count: number): string[] {
  if (count <= 1) return [zipFilename];
  const stem = zipFilename.replace(/\.zip$/i, '');
  const width = Math.max(2, String(count).length);
  return Array.from({ length: count }, (_, index) => `${stem}_part${String(index + 1).padStart(width, '0')}.zip`);
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

/** Centralizes progress bookkeeping and snapshot/onProgress emission. */
class ProgressTracker {
  progress: EazipProgress;
  private bytesTotal = 0;
  private completedBytes = 0;

  constructor(
    private readonly filesTotal: number,
    private readonly job: JobController<LocalZipResult>,
    private readonly options: LocalZipOptions,
  ) {
    this.progress = { phase: 'starting', filesTotal, filesCompleted: 0 };
  }

  addKnownBytes(size: number): void {
    this.bytesTotal += size;
  }

  fetching(index: number, filename: string): void {
    this.emit({ phase: 'fetching', currentFileIndex: index, currentFileName: filename });
  }

  startFile(index: number, filename: string, _size: number): void {
    this.emit({ phase: 'adding', currentFileIndex: index, currentFileName: filename });
  }

  fileProgress(index: number, filename: string, bytesWithinFile: number): void {
    this.emit({
      phase: 'adding',
      currentFileIndex: index,
      currentFileName: filename,
      bytesProcessed: this.completedBytes + bytesWithinFile,
    });
  }

  completeFile(index: number, filename?: string, size = 0): void {
    this.completedBytes += size;
    this.emit({
      phase: 'adding',
      filesCompleted: this.progress.filesCompleted + 1,
      currentFileIndex: index,
      ...(filename ? { currentFileName: filename } : {}),
    });
  }

  emit(patch: Partial<EazipProgress> & { phase: EazipProgress['phase'] }): void {
    this.progress = {
      ...this.progress,
      bytesProcessed: this.completedBytes,
      ...patch,
      filesTotal: this.filesTotal,
      ...(this.bytesTotal > 0 ? { bytesTotal: this.bytesTotal } : {}),
    };
    this.job.patch({ progress: this.progress });
    this.options.onProgress?.(this.progress);
  }
}
