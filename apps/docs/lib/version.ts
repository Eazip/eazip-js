import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Reads @eazip/react's real published version straight from its
 * package.json at build/request time. This intentionally does NOT import
 * `@eazip/react/package.json` through the package's `exports` map — only
 * `.` is exported, so that subpath is blocked by Node's package resolution.
 * Instead we read the file directly, relative to the monorepo root (this
 * app only ever builds from inside the eazip-js monorepo).
 */
export function getEazipReactVersion(): string {
  const pkgPath = path.join(process.cwd(), '..', '..', 'packages', 'react', 'package.json');
  try {
    const raw = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}
