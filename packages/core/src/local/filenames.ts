const WINDOWS_DRIVE_PREFIX = /^[a-zA-Z]:/;

/** Sanitizes a requested archive filename and ensures it ends in `.zip`. */
export function normalizeZipFilename(filename: string | undefined): string {
  const normalized = sanitizePath(filename || 'download.zip', 'download.zip');
  return normalized.toLowerCase().endsWith('.zip') ? normalized : `${normalized}.zip`;
}

/** Sanitizes a ZIP entry path and falls back when the result would be empty. */
export function normalizeEntryName(filename: string | undefined, fallback: string): string {
  return sanitizePath(filename || fallback, fallback);
}

/** Reserves a ZIP entry path, adding a numeric suffix when it is already used. */
export function uniqueEntryName(filename: string, used: Set<string>): string {
  if (!used.has(filename)) {
    used.add(filename);
    return filename;
  }

  const parts = filename.split('/');
  const basename = parts.pop() || 'file';
  const extensionIndex = basename.lastIndexOf('.');
  const stem = extensionIndex > 0 ? basename.slice(0, extensionIndex) : basename;
  const extension = extensionIndex > 0 ? basename.slice(extensionIndex) : '';

  let suffix = 2;
  while (true) {
    const candidate = [...parts, `${stem} (${suffix})${extension}`].join('/');
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    suffix += 1;
  }
}

function sanitizePath(value: string, fallback: string): string {
  const cleaned = value
    .replace(/\0/g, '')
    .replace(/\\/g, '/')
    .replace(WINDOWS_DRIVE_PREFIX, '')
    .replace(/^\/+/, '')
    .trim();

  const segments = cleaned
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '.' && segment !== '..');

  return segments.join('/') || fallback;
}
