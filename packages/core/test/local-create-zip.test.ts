import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';
import { describe, expect, it, vi } from 'vitest';
import { createZip, startZip, EazipAbortError } from '../src/index.js';
import { normalizeEntryName, normalizeZipFilename, uniqueEntryName } from '../src/local/index.js';
import type { LocalZipResult } from '../src/shared/types.js';

describe('createZip local mode', () => {
  it('creates a browser ZIP from Blob inputs and reports progress', async () => {
    const onProgress = vi.fn();

    const result = await createZip({
      strategy: 'local',
      zipName: 'documents',
      files: [
        { file: new Blob(['hello']), filename: 'hello.txt' },
        { file: new Blob(['world']), filename: 'nested/world.txt' },
      ],
      onProgress,
    });

    expect(result.strategy).toBe('local');
    expect(result.status).toBe('completed');
    expect(result.zipFilename).toBe('documents.zip');
    expect(result.zips).toHaveLength(1);
    const zip = result.zips[0]!;
    expect(zip).toMatchObject({
      sequence: 1,
      status: 'completed',
      filename: 'documents.zip',
      fileCount: 2,
    });
    expect(zip.blob.type).toBe('application/zip');
    expect(zip.size).toBe(zip.blob.size);
    expect(result.totalSize).toBe(zip.size);
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
      phase: 'completed',
      filesCompleted: 2,
      filesTotal: 2,
    }));

    await expect(readZipText(zip.blob)).resolves.toEqual({
      'hello.txt': 'hello',
      'nested/world.txt': 'world',
    });
  });

  it('uses local mode by default and accepts input sugar', async () => {
    const fetch = vi.fn(async () => new Response('from url'));
    const result = await createZip({
      files: [
        new File(['file input'], 'file.txt'),
        'https://assets.example.test/url.txt',
        { file: new Blob(['source input']), filename: 'source.txt' },
      ],
      fetch,
    });

    expect(result.strategy).toBe('local');
    await expect(readZipText(result.zips[0]!.blob)).resolves.toEqual({
      'file.txt': 'file input',
      'url.txt': 'from url',
      'source.txt': 'source input',
    });
  });

  it('rejects empty and invalid inputs', async () => {
    await expect(createZip({ files: [] })).rejects.toMatchObject({ code: 'EMPTY_INPUT' });
    await expect(createZip({ files: [42 as unknown as string] })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
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

    await expect(readZipText(result.zips[0]!.blob)).resolves.toEqual({
      'report.txt': 'a',
      'report (2).txt': 'b',
      'folder/report.txt': 'c',
    });
  });

  it('skips failed URL sources by default and reports a partial result', async () => {
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('missing')) return new Response('nope', { status: 404 });
      return new Response('ok');
    });

    const result = await createZip({
      strategy: 'local',
      files: [
        { url: 'https://assets.example.test/one.txt' },
        { url: 'https://assets.example.test/missing.pdf', filename: 'missing.pdf' },
        { url: 'https://assets.example.test/two.txt' },
      ],
      fetch,
    });

    expect(result.status).toBe('partial');
    expect(result.skippedCount).toBe(1);
    expect(result.errors).toEqual([
      expect.objectContaining({
        code: 'LOCAL_SOURCE_FETCH_FAILED',
        fileIndex: 1,
        filename: 'missing.pdf',
      }),
    ]);
    await expect(readZipText(result.zips[0]!.blob)).resolves.toEqual({
      'one.txt': 'ok',
      'two.txt': 'ok',
    });
  });

  it('fails fast when failOnUrlError is true', async () => {
    const fetch = vi.fn(async () => new Response('nope', { status: 404 }));

    await expect(createZip({
      strategy: 'local',
      files: [{ url: 'https://assets.example.test/missing.pdf' }],
      failOnUrlError: true,
      fetch,
    })).rejects.toMatchObject({
      code: 'LOCAL_SOURCE_FETCH_FAILED',
      status: 404,
    });
  });

  it('fails when every source fails', async () => {
    const fetch = vi.fn(async () => new Response('nope', { status: 500 }));

    await expect(createZip({
      strategy: 'local',
      files: ['https://a.example.test/x', 'https://a.example.test/y'],
      fetch,
    })).rejects.toMatchObject({ code: 'ALL_SOURCES_FAILED' });
  });

  it('limits concurrent URL fetches and preserves entry order', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetch = vi.fn(async (input: RequestInfo | URL) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return new Response(`body of ${String(input).split('/').pop()}`);
    });

    const files = Array.from({ length: 6 }, (_, index) => `https://assets.example.test/f${index}.txt`);
    const result = await createZip({ strategy: 'local', files, concurrency: 2, fetch });

    expect(maxInFlight).toBeLessThanOrEqual(2);
    const entries = await readZipText(result.zips[0]!.blob);
    expect(Object.keys(entries)).toEqual(['f0.txt', 'f1.txt', 'f2.txt', 'f3.txt', 'f4.txt', 'f5.txt']);
  });

  it('splits into multiple zips when maxZipSizeBytes is set', async () => {
    // Random bytes are incompressible, so each ~4KB file stays ~4KB in the zip.
    const files = Array.from({ length: 4 }, (_, index) => ({
      file: new Blob([randomBytes(4_096)]),
      filename: `part-source-${index}.bin`,
    }));

    const result = await createZip({
      strategy: 'local',
      zipName: 'export.zip',
      files,
      compressionLevel: 0,
      maxZipSizeBytes: 10_000,
    });

    expect(result.status).toBe('completed');
    expect(result.zips.length).toBeGreaterThan(1);
    expect(result.zips.map((zip) => zip.filename)).toEqual(
      result.zips.map((_, index) => `export_part${String(index + 1).padStart(2, '0')}.zip`),
    );
    for (const zip of result.zips) {
      expect(zip.size).toBeLessThanOrEqual(10_000);
    }
    expect(result.zips.reduce((total, zip) => total + (zip.fileCount ?? 0), 0)).toBe(4);
  });

  it('gives an oversized single file its own over-limit part instead of failing', async () => {
    const result = await createZip({
      strategy: 'local',
      zipName: 'export.zip',
      files: [
        { file: new Blob([randomBytes(1_000)]), filename: 'small.bin' },
        { file: new Blob([randomBytes(50_000)]), filename: 'huge.bin' },
      ],
      compressionLevel: 0,
      maxZipSizeBytes: 5_000,
    });

    expect(result.status).toBe('completed');
    expect(result.errors).toEqual([]);
    expect(result.zips).toHaveLength(2);
    expect(result.zips[1]!.size).toBeGreaterThan(5_000);
    await expect(readZipText(result.zips[0]!.blob)).resolves.toHaveProperty('small.bin');
  });

  it('keeps the plain zip name when no split happens', async () => {
    const result = await createZip({
      zipName: 'export.zip',
      files: [{ file: new Blob(['tiny']), filename: 'a.txt' }],
      maxZipSizeBytes: 1_000_000,
    });
    expect(result.zips.map((zip) => zip.filename)).toEqual(['export.zip']);
  });

  it('rejects invalid compression levels', async () => {
    await expect(createZip({
      strategy: 'local',
      files: [{ file: new Blob(['x']), filename: 'x.txt' }],
      compressionLevel: 10,
    })).rejects.toMatchObject({ code: 'INVALID_COMPRESSION_LEVEL' });
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

  it('aborts in-flight fetches when the job is aborted', async () => {
    let sawAbort = false;
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          sawAbort = true;
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        });
      });
    });

    const job = startZip({ strategy: 'local', files: ['https://assets.example.test/slow.bin'], fetch });
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    job.abort();

    await expect(job.done).rejects.toBeInstanceOf(EazipAbortError);
    expect(job.getSnapshot().status).toBe('aborted');
    await vi.waitFor(() => expect(sawAbort).toBe(true));
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

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

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

// Type-level check: createZip with local options narrows to LocalZipResult.
async function _typecheck(): Promise<LocalZipResult> {
  return createZip({ files: [new Blob(['x'])] });
}
void _typecheck;
