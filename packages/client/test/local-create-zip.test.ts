import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import { describe, expect, it, vi } from 'vitest';
import { createZip, EazipAbortError, EazipValidationError } from '../src';
import { normalizeEntryName, normalizeZipFilename, uniqueEntryName } from '../src/local';

describe('createZip local mode', () => {
  it('creates a browser ZIP from Blob inputs and reports progress', async () => {
    const onStatusChange = vi.fn();
    const onProgress = vi.fn();

    const result = await createZip({
      strategy: 'local',
      zipName: 'documents',
      files: [
        { file: new Blob(['hello']), filename: 'hello.txt' },
        { file: new Blob(['world']), filename: 'nested/world.txt' },
      ],
      onStatusChange,
      onProgress,
    });

    expect(result.strategy).toBe('local');
    expect(result.filename).toBe('documents.zip');
    expect(result.blob.type).toBe('application/zip');
    expect(result.size).toBeGreaterThan(0);
    expect(result.zips).toEqual([
      expect.objectContaining({
        sequence: 1,
        status: 'completed',
        filename: 'documents.zip',
        fileCount: 2,
        size: result.blob.size,
      }),
    ]);
    expect(onStatusChange.mock.calls.map(([status]) => status)).toEqual(['creating', 'processing', 'completed']);
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      strategy: 'local',
      phase: 'completed',
      filesCompleted: 2,
      filesTotal: 2,
    }));

    await expect(readZipText(result.blob)).resolves.toEqual({
      'hello.txt': 'hello',
      'nested/world.txt': 'world',
    });
    result.revokeObjectUrl();
  });

  it('uses local mode by default', async () => {
    const result = await createZip({
      files: [{ file: new Blob(['default mode']), filename: 'default.txt' }],
    });

    expect(result.strategy).toBe('local');
    await expect(readZipText(result.blob)).resolves.toEqual({
      'default.txt': 'default mode',
    });
    result.revokeObjectUrl();
  });

  it('sanitizes path traversal and keeps duplicate names unique', async () => {
    const result = await createZip({
      strategy: 'local',
      files: [
        { file: new Blob(['a']), filename: '../report.txt' },
        { file: new Blob(['b']), filename: '/report.txt' },
        { file: new Blob(['c']), filename: 'folder/../../report.txt' },
      ],
    });

    await expect(readZipText(result.blob)).resolves.toEqual({
      'report.txt': 'a',
      'report (2).txt': 'b',
      'folder/report.txt': 'c',
    });
    result.revokeObjectUrl();
  });

  it('mixes Blob and URL sources in local mode', async () => {
    const fetch = vi.fn(async () => new Response('from url'));

    const result = await createZip({
      strategy: 'local',
      files: [
        { file: new Blob(['from blob']), filename: 'blob.txt' },
        { url: 'https://assets.example.test/url.txt' },
      ],
      fetch,
    });

    expect(fetch).toHaveBeenCalledWith('https://assets.example.test/url.txt', expect.objectContaining({
      credentials: 'omit',
    }));
    await expect(readZipText(result.blob)).resolves.toEqual({
      'blob.txt': 'from blob',
      'url.txt': 'from url',
    });
    result.revokeObjectUrl();
  });

  it('maps local URL fetch failures to validation errors', async () => {
    const fetch = vi.fn(async () => new Response('nope', { status: 404 }));

    await expect(createZip({
      strategy: 'local',
      files: [{ url: 'https://assets.example.test/missing.pdf', filename: 'missing.pdf' }],
      fetch,
    })).rejects.toMatchObject({
      code: 'LOCAL_SOURCE_FETCH_FAILED',
      status: 404,
    } satisfies Partial<EazipValidationError>);
  });

  it('rejects invalid compression levels', async () => {
    await expect(createZip({
      strategy: 'local',
      files: [{ file: new Blob(['x']), filename: 'x.txt' }],
      compressionLevel: 10,
    })).rejects.toMatchObject({
      code: 'INVALID_COMPRESSION_LEVEL',
    } satisfies Partial<EazipValidationError>);
  });

  it('rejects generated ZIPs over maxZipSizeBytes', async () => {
    await expect(createZip({
      strategy: 'local',
      files: [{ file: new Blob(['this will be larger than one byte']), filename: 'x.txt' }],
      maxZipSizeBytes: 1,
    })).rejects.toMatchObject({
      code: 'MAX_ZIP_SIZE_EXCEEDED',
    } satisfies Partial<EazipValidationError>);
  });

  it('honors a pre-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(createZip({
      strategy: 'local',
      files: [{ file: new Blob(['x']), filename: 'x.txt' }],
      signal: controller.signal,
    })).rejects.toBeInstanceOf(EazipAbortError);
  });
});

describe('local ZIP filename helpers', () => {
  it('normalizes ZIP and entry filenames', () => {
    expect(normalizeZipFilename('photos')).toBe('photos.zip');
    expect(normalizeZipFilename('/../photos.zip')).toBe('photos.zip');
    expect(normalizeEntryName('C:\\Users\\me\\file.txt', 'fallback.txt')).toBe('Users/me/file.txt');
  });

  it('deduplicates names without losing extensions', () => {
    const used = new Set<string>();
    expect(uniqueEntryName('photo.jpg', used)).toBe('photo.jpg');
    expect(uniqueEntryName('photo.jpg', used)).toBe('photo (2).jpg');
    expect(uniqueEntryName('photo.jpg', used)).toBe('photo (3).jpg');
  });
});

async function readZipText(blob: Blob): Promise<Record<string, string>> {
  const reader = new ZipReader(new BlobReader(blob));
  const entries = await reader.getEntries();
  const result: Record<string, string> = {};
  for (const entry of entries) {
    if (!entry.directory) {
      result[entry.filename] = await entry.getData?.(new TextWriter()) ?? '';
    }
  }
  await reader.close();
  return result;
}
