const WINDOWS_DRIVE_PREFIX = /^[a-zA-Z]:/;

export function normalizeZipFilename(filename: string | undefined): string {
  const normalized = sanitizePath(filename || 'download.zip', 'download.zip');
  return normalized.toLowerCase().endsWith('.zip') ? normalized : `${normalized}.zip`;
}

export function normalizeEntryName(filename: string | undefined, fallback: string): string {
  return sanitizePath(filename || fallback, fallback);
}

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
