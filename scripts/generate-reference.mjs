import { spawnSync } from 'node:child_process';
import {
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const referenceRoot = path.join(root, 'apps/docs/content/reference');
const check = process.argv.includes('--check');

const targets = [
  {
    name: '@eazip/core',
    folder: 'core',
    entryPoint: 'packages/core/src/index.ts',
    tsconfig: 'packages/core/tsconfig.json',
    externalPattern: undefined,
    introduction:
      'Generated from the public exports of `@eazip/core`. For behavior and examples, see [Core concepts](/docs/concepts).',
    priorities: {
      functions: [
        'startZip',
        'createZip',
        'startLocalZip',
        'createLocalZip',
        'startCloudZip',
        'resumeZip',
      ],
      classes: ['SessionsClient'],
      interfaces: ['ZipJob'],
      'type-aliases': [
        'StartZipOptions',
        'LocalZipOptions',
        'CloudZipOptions',
        'ResumeZipOptions',
        'ZipResult',
        'LocalZipResult',
        'CloudZipResult',
        'ZipJobSnapshot',
      ],
    },
  },
  {
    name: '@eazip/react',
    folder: 'react',
    entryPoint: 'packages/react/src/index.ts',
    tsconfig: 'packages/react/tsconfig.json',
    externalPattern: '**/packages/core/**',
    introduction:
      'Generated from the React-specific exports of `@eazip/react`. The package also re-exports common Core errors and job types; see the [`@eazip/core` reference](/docs/reference/core) for those symbols.',
    priorities: {
      functions: ['useEazip', 'EazipProvider', 'EazipTray'],
      classes: ['EazipStore'],
      'type-aliases': [
        'EazipConfig',
        'EazipDownloadOptions',
        'EazipLocalDownloadOptions',
        'EazipCloudSourceDownloadOptions',
        'EazipCloudSessionDownloadOptions',
        'UseEazipResult',
        'EazipProviderProps',
        'EazipTrayProps',
      ],
    },
  },
];

const groupOrder = ['functions', 'classes', 'interfaces', 'type-aliases', 'variables'];
const groupTitles = {
  functions: 'Functions',
  classes: 'Classes',
  interfaces: 'Interfaces',
  'type-aliases': 'Type aliases',
  variables: 'Variables',
};

function runTypeDoc(target, outputDirectory) {
  const args = [
    path.join(root, 'node_modules/typedoc/bin/typedoc'),
    '--options',
    path.join(root, 'typedoc.json'),
    '--entryPoints',
    path.join(root, target.entryPoint),
    '--tsconfig',
    path.join(root, target.tsconfig),
    '--out',
    outputDirectory,
    '--name',
    target.name,
  ];

  if (target.externalPattern) {
    args.push('--externalPattern', target.externalPattern, '--excludeExternals');
  }

  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`TypeDoc failed for ${target.name} with exit code ${result.status}`);
  }
}

function orderPages(pageNames, priorities = []) {
  const priority = new Map(priorities.map((name, index) => [name, index]));

  return pageNames.sort((left, right) => {
    const leftPriority = priority.get(left);
    const rightPriority = priority.get(right);

    if (leftPriority !== undefined || rightPriority !== undefined) {
      if (leftPriority === undefined) return 1;
      if (rightPriority === undefined) return -1;
      return leftPriority - rightPriority;
    }

    return left.localeCompare(right);
  });
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function prepareMarkdown(target, outputDirectory) {
  const files = await listFiles(outputDirectory);

  for (const file of files.filter((entry) => entry.endsWith('.mdx'))) {
    const filename = path.join(outputDirectory, file);
    let contents = await readFile(filename, 'utf8');

    // Static-site routes do not include source file extensions.
    contents = contents.replace(/\.mdx(?=(?:#[^)\s]+)?\))/g, '');

    if (file === 'index.mdx') {
      contents = contents.replace(
        /^(---\n[\s\S]*?\n---\n)/,
        `$1\n${target.introduction}\n`,
      );
    }

    await writeFile(filename, contents, 'utf8');
  }
}

async function writeNavigation(target, outputDirectory) {
  const availableGroups = [];

  for (const group of groupOrder) {
    const groupDirectory = path.join(outputDirectory, group);

    try {
      const entries = await readdir(groupDirectory, { withFileTypes: true });
      const pages = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
        .map((entry) => entry.name.slice(0, -4));

      if (pages.length === 0) continue;

      availableGroups.push(group);
      await writeJson(path.join(groupDirectory, 'meta.json'), {
        title: groupTitles[group],
        pages: orderPages(pages, target.priorities[group]),
      });
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  await writeJson(path.join(outputDirectory, 'meta.json'), {
    title: target.name,
    pages: availableGroups,
  });
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(path.join(directory, entry.name), relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

async function compareDirectories(expected, actual) {
  try {
    if (!(await stat(actual)).isDirectory()) return ['missing generated directory'];
  } catch (error) {
    if (error?.code === 'ENOENT') return ['missing generated directory'];
    throw error;
  }

  const [expectedFiles, actualFiles] = await Promise.all([
    listFiles(expected),
    listFiles(actual),
  ]);
  const differences = [];
  const allFiles = new Set([...expectedFiles, ...actualFiles]);

  for (const file of [...allFiles].sort()) {
    if (!expectedFiles.includes(file)) {
      differences.push(`unexpected: ${file}`);
      continue;
    }
    if (!actualFiles.includes(file)) {
      differences.push(`missing: ${file}`);
      continue;
    }

    const [expectedContents, actualContents] = await Promise.all([
      readFile(path.join(expected, file)),
      readFile(path.join(actual, file)),
    ]);
    if (!expectedContents.equals(actualContents)) {
      differences.push(`changed: ${file}`);
    }
  }

  return differences;
}

const temporaryRoot = check
  ? await mkdtemp(path.join(tmpdir(), 'eazip-reference-'))
  : undefined;
const outputRoot = temporaryRoot ?? referenceRoot;

try {
  for (const target of targets) {
    const outputDirectory = path.join(outputRoot, target.folder);
    runTypeDoc(target, outputDirectory);
    await prepareMarkdown(target, outputDirectory);
    await writeNavigation(target, outputDirectory);
  }

  if (check) {
    let hasDifferences = false;

    for (const target of targets) {
      const differences = await compareDirectories(
        path.join(outputRoot, target.folder),
        path.join(referenceRoot, target.folder),
      );

      if (differences.length > 0) {
        hasDifferences = true;
        console.error(`Generated reference is out of date for ${target.name}:`);
        for (const difference of differences) console.error(`  - ${difference}`);
      }
    }

    if (hasDifferences) {
      console.error('\nRun `npm run docs:reference` and commit the generated files.');
      process.exitCode = 1;
    } else {
      console.log('Generated SDK reference is up to date.');
    }
  }
} finally {
  if (temporaryRoot) {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
