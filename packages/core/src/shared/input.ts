import { EazipValidationError } from './errors.js';
import type { EazipSourceFile, ZipInput } from './types.js';

/**
 * Normalizes any accepted `files` input into EazipSourceFile[].
 * Throws EazipValidationError('EMPTY_INPUT' | 'INVALID_INPUT') synchronously.
 */
export function toSourceFiles(input: ZipInput): EazipSourceFile[] {
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    return [{ file: input }];
  }
  const items: unknown[] = Array.from(input as ArrayLike<unknown>);
  if (items.length === 0) {
    throw new EazipValidationError('EMPTY_INPUT', 'At least one file is required');
  }
  return items.map((item, index) => {
    if (typeof item === 'string') return { url: item };
    if (typeof Blob !== 'undefined' && item instanceof Blob) return { file: item };
    if (item && typeof item === 'object') {
      const source = item as Record<string, unknown>;
      if (typeof source['url'] === 'string' || source['file'] != null) {
        return item as EazipSourceFile;
      }
    }
    throw new EazipValidationError('INVALID_INPUT', `Unsupported file source at index ${index}`);
  });
}
