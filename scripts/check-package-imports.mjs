import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const specifiers = [
  '@eazip/core',
  '@eazip/core/local',
  '@eazip/core/cloud',
  '@eazip/core/shared',
  '@eazip/react',
];

for (const specifier of specifiers) {
  try {
    await import(specifier);
  } catch (error) {
    console.error(`Failed to import ${specifier}`);
    throw error;
  }
}

// Tree-shake guard: the ./local entry must not pull cloud code, and the
// ./cloud entry must not pull zip.js.
assertNoImports('packages/core/dist/local', ['../cloud/']);
assertNoImports('packages/core/dist/cloud', ['@zip.js', '../local/']);

function assertNoImports(dir, forbidden) {
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.js')) continue;
    const source = readFileSync(join(dir, file), 'utf8');
    for (const needle of forbidden) {
      if (source.includes(needle)) {
        throw new Error(`${dir}/${file} must not import ${needle}`);
      }
    }
  }
}

console.log(`Validated ${specifiers.length} package imports and entry isolation.`);
