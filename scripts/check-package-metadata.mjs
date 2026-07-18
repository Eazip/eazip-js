import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REMOTE_URL_RECIPE = 'https://eazip.io/docs/recipes/create-zip-from-remote-urls';
const S3_R2_RECIPE = 'https://eazip.io/docs/recipes/zip-s3-or-r2-objects';
const requiredKeywords = ['zip', 'browser', 'javascript', 'client-side', 'remote-url', 'multiple-files'];
const packages = [
  { directory: 'core', homepage: 'https://eazip.io/docs/core' },
  { directory: 'react', homepage: 'https://eazip.io/docs/react' },
];

for (const packageSpec of packages) {
  const directory = join('packages', packageSpec.directory);
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
  const readme = readFileSync(join(directory, 'README.md'), 'utf8');

  assertEqual(manifest.homepage, packageSpec.homepage, `${manifest.name} homepage`);
  assertIncludes(manifest.description.toLowerCase(), 'remote url', `${manifest.name} description`);
  for (const keyword of requiredKeywords) {
    if (!manifest.keywords.includes(keyword)) {
      throw new Error(`${manifest.name} keywords must include ${keyword}`);
    }
  }
  assertIncludes(readme, REMOTE_URL_RECIPE, `${manifest.name} README`);
  assertIncludes(readme, S3_R2_RECIPE, `${manifest.name} README`);
  assertIncludes(readme, 'https://eazip.io/docs/cloud?', `${manifest.name} README Cloud docs`);
  assertIncludes(readme, 'https://eazip.io/cloud/?', `${manifest.name} README Public App CTA`);
}

const rootReadme = readFileSync('README.md', 'utf8');
assertIncludes(rootReadme, REMOTE_URL_RECIPE, 'root README');
assertIncludes(rootReadme, S3_R2_RECIPE, 'root README');
assertIncludes(rootReadme, 'https://eazip.io/docs/getting-started?', 'root README getting started');

console.log(`Validated Docs acquisition metadata and README links for ${packages.length} packages.`);

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} must be ${expected}; received ${actual}`);
  }
}

function assertIncludes(actual, expected, label) {
  if (!actual.includes(expected)) {
    throw new Error(`${label} must include ${expected}`);
  }
}
