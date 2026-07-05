import { readFileSync } from 'node:fs';

const packageName = process.env.RELEASE_PACKAGE ?? '@eazip/core';
const npmTag = process.env.NPM_TAG ?? 'beta';

const packages = {
  '@eazip/core': { path: 'packages/core/package.json', tagPrefix: 'core' },
  '@eazip/react': { path: 'packages/react/package.json', tagPrefix: 'react' },
};

const packageInfo = packages[packageName];
if (!packageInfo) {
  throw new Error(`Unsupported release package: ${packageName}`);
}

const packagePath = packageInfo.path;
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const version = String(pkg.version);
const tagName = `${packageInfo.tagPrefix}-v${version}`;
const isPrerelease = version.includes('-');

if (pkg.name !== packageName) {
  throw new Error(`Expected ${packageName} at ${packagePath}, found ${pkg.name}`);
}

if (npmTag === 'latest' && isPrerelease) {
  throw new Error(`Refusing to publish prerelease ${version} with npm tag "latest"`);
}

if (npmTag !== 'latest' && !isPrerelease) {
  throw new Error(`Refusing to publish stable version ${version} with npm tag "${npmTag}"`);
}

if (npmTag === 'beta' && !/-beta\.\d+$/.test(version)) {
  throw new Error(`npm tag "beta" requires a version like 0.1.0-beta.1, got ${version}`);
}

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  const { appendFileSync } = await import('node:fs');
  appendFileSync(githubOutput, `package_name=${packageName}\n`);
  appendFileSync(githubOutput, `package_path=${packagePath}\n`);
  appendFileSync(githubOutput, `version=${version}\n`);
  appendFileSync(githubOutput, `tag_name=${tagName}\n`);
  appendFileSync(githubOutput, `prerelease=${String(isPrerelease)}\n`);
}

console.log(`${packageName} ${version} -> npm tag ${npmTag}, git tag ${tagName}`);
