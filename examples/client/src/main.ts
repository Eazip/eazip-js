import {
  startZip,
  EazipApiError,
  EazipChallengeRequiredError,
  type EazipError,
  type EazipSourceFile,
  type EazipZipOutput,
  type ZipJob,
  type ZipJobSnapshot,
} from '@eazip/core';
import './styles.css';

type Strategy = 'local' | 'cloud';

type DemoAsset = {
  id: string;
  name: string;
  ext: string;
  size: number;
  hue: number;
  source: EazipSourceFile;
};

type RunState = {
  status: 'idle' | 'running' | 'completed' | 'failed';
  sdkStatus: string;
  message: string;
  sessionId: string | null;
  zips: EazipZipOutput[];
  errors: EazipError[];
  progressPercent: number;
  currentFileName: string | null;
};

const publicKey = import.meta.env.VITE_EAZIP_PUBLIC_KEY;
const apiBaseUrl = import.meta.env.VITE_EAZIP_API_BASE_URL || 'https://api.eazip.io';

const EXT_COLORS: Record<string, string> = {
  SVG: '#3ba88a',
  TXT: '#3b6ec4',
  CSV: '#3ba85e',
  URL: '#7c5cd6',
};

let assets = buildAssets();
let selected = new Set(assets.slice(0, 6).map((asset) => asset.id));
let strategy: Strategy = 'local';
let zipName = 'assets.zip';
let customUrl = '';
let currentJob: ZipJob | null = null;
let runState: RunState = idleState('Select tiles, then download them as a ZIP — zipped right here in the browser.');

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app element');
const app: HTMLDivElement = root;

render();

function idleState(message: string): RunState {
  return {
    status: 'idle',
    sdkStatus: 'idle',
    message,
    sessionId: null,
    zips: [],
    errors: [],
    progressPercent: 0,
    currentFileName: null,
  };
}

function textFile(name: string, ext: string, body: string, hue: number): DemoAsset {
  const blob = new Blob([body], { type: 'text/plain' });
  return {
    id: name,
    name,
    ext,
    size: blob.size,
    hue,
    source: { file: blob, filename: `${name.toLowerCase().replaceAll(' ', '-')}.${ext.toLowerCase()}` },
  };
}

function repeat(line: string, times: number): string {
  return Array.from({ length: times }, (_, index) => `${index + 1}. ${line}`).join('\n');
}

function buildAssets(): DemoAsset[] {
  return [
    {
      id: 'color-grid',
      name: 'Color grid',
      ext: 'SVG',
      size: 1600,
      hue: 220,
      source: { url: '/samples/color-grid.svg', filename: 'color-grid.svg' },
    },
    {
      id: 'receipt-card',
      name: 'Receipt card',
      ext: 'SVG',
      size: 1900,
      hue: 160,
      source: { url: '/samples/receipt-card.svg', filename: 'receipt-card.svg' },
    },
    {
      id: 'notes',
      name: 'Release notes',
      ext: 'TXT',
      size: 800,
      hue: 30,
      source: { url: '/samples/notes.txt', filename: 'notes.txt' },
    },
    textFile('Brand guidelines', 'TXT', repeat('Use the accent sparingly.', 120), 260),
    textFile('Q3 report', 'CSV', 'quarter,revenue\nQ1,120\nQ2,180\nQ3,240\n', 200),
    textFile('Invoice 0412', 'TXT', repeat('Line item — 42.00', 40), 10),
    textFile('Iconography', 'TXT', repeat('icon: 24px grid', 60), 280),
    textFile('Spec sheet', 'TXT', repeat('Tolerance ±0.2mm', 90), 120),
    textFile('Budget model', 'CSV', repeat('cell,value', 150), 90),
    textFile('Contract', 'TXT', repeat('The parties agree…', 200), 330),
    textFile('Wordmark', 'TXT', 'EAZIP — wordmark usage notes\n', 240),
    textFile('Walkthrough', 'TXT', repeat('Step-by-step notes', 80), 180),
  ];
}

function isSelectable(asset: DemoAsset): boolean {
  return strategy === 'local' || 'url' in asset.source;
}

function selectedAssets(): DemoAsset[] {
  return assets.filter((asset) => selected.has(asset.id) && isSelectable(asset));
}

function render() {
  const isRunning = runState.status === 'running';
  const chosen = selectedAssets();
  const allSelected = assets.filter(isSelectable).every((asset) => selected.has(asset.id));
  const canCreate = chosen.length > 0 && !isRunning && (strategy === 'local' || Boolean(publicKey));

  app.innerHTML = `
    <header class="topbar">
      <div class="topbar-row">
        <div class="logo"><div class="logo-inner"></div></div>
        <div class="app-name">Northwind</div>
        <div class="app-sub">Assets · vanilla</div>
        <div class="spacer"></div>
        <a class="cloud-note" href="https://github.com/eazip/eazip-js" target="_blank" rel="noreferrer">@eazip/core example</a>
      </div>
      <div class="topbar-row">
        <button type="button" class="select-all-btn" data-action="toggle-all">${allSelected ? 'Clear' : 'Select all'}</button>
        <div class="sel-count">${chosen.length > 0 ? `${chosen.length} selected` : `${assets.length} items`}</div>
        <div class="spacer"></div>
        ${isRunning ? '<button type="button" class="cancel-btn" data-action="cancel">Cancel</button>' : ''}
        <button type="button" class="download-btn" data-action="create" ${canCreate ? '' : 'disabled'}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ${isRunning ? 'Creating…' : 'Download as ZIP'}
        </button>
      </div>
      <div class="controls">
        <div class="control">
          <label for="strategy">Strategy</label>
          <select id="strategy" data-field="strategy" ${isRunning ? 'disabled' : ''}>
            <option value="local" ${strategy === 'local' ? 'selected' : ''}>Local</option>
            <option value="cloud" ${strategy === 'cloud' ? 'selected' : ''} ${publicKey ? '' : 'disabled'}>
              Cloud${publicKey ? '' : ' (set VITE_EAZIP_PUBLIC_KEY)'}
            </option>
          </select>
        </div>
        <div class="control">
          <label for="zip-name">Zip name</label>
          <input id="zip-name" type="text" data-field="zip-name" value="${escapeAttribute(zipName)}" ${isRunning ? 'disabled' : ''} />
        </div>
        <div class="control">
          <label for="custom-url">Add URL</label>
          <input id="custom-url" type="text" data-field="custom-url" placeholder="https://…" value="${escapeAttribute(customUrl)}" ${isRunning ? 'disabled' : ''} />
          <button type="button" class="mini-btn" data-action="add-url" ${isRunning ? 'disabled' : ''}>Add</button>
        </div>
      </div>
    </header>

    <div class="grid">
      ${assets.map(renderTile).join('')}
    </div>

    <p class="hint">
      ${strategy === 'cloud'
        ? 'Cloud strategy: only URL-based assets can be zipped, and they must be reachable from the Eazip API.'
        : 'Local strategy: files are zipped right here in the browser — nothing is uploaded. URL tiles are fetched by the browser (CORS applies); failures are skipped and reported.'}
    </p>

    <div class="panels">
      ${renderRunPanel()}
      ${renderCodePanel()}
    </div>
  `;

  bindEvents();
}

function renderTile(asset: DemoAsset): string {
  const selectable = isSelectable(asset);
  const isSelected = selected.has(asset.id) && selectable;
  return `
    <button type="button" class="tile${isSelected ? ' selected' : ''}" data-asset="${escapeAttribute(asset.id)}" ${selectable ? '' : 'disabled'}>
      <div class="thumb" style="background: linear-gradient(150deg, hsl(${asset.hue}, 24%, 88%), hsl(${asset.hue}, 28%, 78%));">
        ${isSelected ? `
          <div class="check">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12l4 4L19 7" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
        ` : ''}
        <span class="ext-badge" style="background: ${EXT_COLORS[asset.ext] ?? '#6b7177'};">${escapeHtml(asset.ext)}</span>
      </div>
      <div class="tile-meta">
        <div class="tile-name">${escapeHtml(asset.name)}</div>
        <div class="tile-size">${asset.size > 0 ? formatBytes(asset.size) : 'remote'}</div>
      </div>
    </button>
  `;
}

function renderRunPanel(): string {
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Run</h2>
        <div class="line"></div>
        <span class="status-pill status-${runState.status}">${escapeHtml(runState.sdkStatus)}</span>
      </div>
      <p class="message">${escapeHtml(runState.message)}</p>
      <div class="progress-track" aria-label="Progress"><div style="width: ${runState.progressPercent}%"></div></div>
      ${runState.currentFileName ? `<p class="meta">Current: <code>${escapeHtml(runState.currentFileName)}</code></p>` : ''}
      ${runState.sessionId ? `<p class="meta">Session: <code>${escapeHtml(runState.sessionId)}</code></p>` : ''}
      ${runState.zips.length ? `<div class="zip-list">${runState.zips.map(renderZipRow).join('')}</div>` : ''}
      ${runState.errors.length ? `
        <div class="zip-list">
          ${runState.errors.map((error) => `
            <div class="skipped-row">
              <span class="dot"></span>
              <strong>${escapeHtml(error.filename ?? `file #${(error.fileIndex ?? 0) + 1}`)}</strong>
              <span>${escapeHtml(error.message)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </section>
  `;
}

function renderZipRow(zip: EazipZipOutput): string {
  const size = zip.size == null ? zip.status : `${zip.status} · ${formatBytes(zip.size)}`;
  const download = zip.downloadUrl
    ? `<a class="dl-btn" href="${escapeAttribute(zip.downloadUrl)}" download="${escapeAttribute(zip.filename)}">Download</a>`
    : '';
  return `
    <div class="zip-row">
      <div>
        <strong>${escapeHtml(zip.filename)}</strong>
        <p>${escapeHtml(size)}</p>
      </div>
      ${download}
    </div>
  `;
}

function renderCodePanel(): string {
  return `
    <section class="panel code-panel">
      <div class="panel-heading">
        <h2>Code</h2>
        <div class="line"></div>
      </div>
      <pre><code>${escapeHtml(strategy === 'local' ? localExampleCode() : cloudExampleCode())}</code></pre>
    </section>
  `;
}

function bindEvents() {
  app.querySelectorAll<HTMLButtonElement>('[data-asset]').forEach((tile) => {
    tile.addEventListener('click', () => {
      const id = tile.dataset.asset!;
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      render();
    });
  });

  app.querySelector('[data-action="toggle-all"]')?.addEventListener('click', () => {
    const selectable = assets.filter(isSelectable);
    const allSelected = selectable.every((asset) => selected.has(asset.id));
    selected = allSelected ? new Set() : new Set(selectable.map((asset) => asset.id));
    render();
  });

  app.querySelector<HTMLSelectElement>('[data-field="strategy"]')?.addEventListener('change', (event) => {
    strategy = (event.currentTarget as HTMLSelectElement).value as Strategy;
    resetRun(strategy === 'local'
      ? 'Select tiles, then download them as a ZIP — zipped right here in the browser.'
      : 'Cloud strategy selected: the zip is built by the Eazip API and polled until ready.');
    render();
  });

  app.querySelector<HTMLInputElement>('[data-field="zip-name"]')?.addEventListener('input', (event) => {
    zipName = (event.currentTarget as HTMLInputElement).value;
  });

  app.querySelector<HTMLInputElement>('[data-field="custom-url"]')?.addEventListener('input', (event) => {
    customUrl = (event.currentTarget as HTMLInputElement).value;
  });

  app.querySelector('[data-action="add-url"]')?.addEventListener('click', () => {
    const url = customUrl.trim();
    if (!url) return;
    const name = filenameFromUrl(url) ?? `remote-${assets.length + 1}`;
    assets = [...assets, {
      id: `url-${assets.length}-${name}`,
      name,
      ext: 'URL',
      size: 0,
      hue: 265,
      source: { url, filename: name },
    }];
    selected.add(`url-${assets.length - 1}-${name}`);
    customUrl = '';
    render();
  });

  app.querySelector('[data-action="create"]')?.addEventListener('click', () => {
    void runCreateZip();
  });

  app.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
    currentJob?.abort();
    resetRun('Export cancelled.');
    render();
  });
}

async function runCreateZip() {
  resetRun('');
  runState = {
    ...idleState(strategy === 'local' ? 'Zipping in this browser…' : 'Creating a Public Session…'),
    status: 'running',
    sdkStatus: 'starting',
  };
  render();

  const files = selectedAssets().map((asset) => asset.source);
  const job = strategy === 'local'
    ? startZip({ files, zipName })
    : startZip({ strategy: 'cloud', publicKey, apiBaseUrl, files, zipName });
  currentJob = job;

  const unsubscribe = job.subscribe(() => {
    if (currentJob !== job) return;
    applySnapshot(job.getSnapshot());
    render();
  });

  try {
    const result = await job.done;
    if (currentJob !== job) return;
    runState = {
      ...runState,
      status: 'completed',
      sdkStatus: result.status,
      progressPercent: 100,
      currentFileName: null,
      message: result.status === 'partial'
        ? `ZIP is ready — ${result.skippedCount} file${result.skippedCount === 1 ? '' : 's'} skipped.`
        : result.strategy === 'local' ? 'ZIP is ready.' : 'Cloud ZIP is ready.',
      zips: result.zips,
      errors: result.errors,
    };
    render();
  } catch (error) {
    if (currentJob !== job) return;
    runState = {
      ...idleState(errorMessage(error)),
      status: 'failed',
      sdkStatus: job.getSnapshot().status,
    };
    render();
  } finally {
    unsubscribe();
  }
}

function applySnapshot(snapshot: ZipJobSnapshot) {
  const cloudStatus = snapshot.session?.jobStatus;
  const progress = snapshot.progress;
  runState = {
    ...runState,
    sdkStatus: cloudStatus ? `${snapshot.status} · ${cloudStatus}` : snapshot.status,
    sessionId: snapshot.session?.sessionId ?? runState.sessionId,
    zips: snapshot.zips,
    errors: snapshot.errors,
    currentFileName: progress?.currentFileName ?? null,
    progressPercent: progress?.bytesTotal
      ? Math.min(100, Math.round(((progress.bytesProcessed ?? 0) / progress.bytesTotal) * 100))
      : runState.progressPercent,
    message: snapshot.status === 'processing'
      ? progress
        ? `${progress.phase}: ${progress.filesCompleted}/${progress.filesTotal} files`
        : cloudStatus
          ? `Cloud job ${cloudStatus}…`
          : 'Working…'
      : runState.message,
  };
}

function resetRun(message: string) {
  currentJob?.dispose();
  currentJob = null;
  runState = idleState(message);
}

function errorMessage(error: unknown) {
  if (error instanceof EazipChallengeRequiredError) {
    return `Challenge required: ${error.challenge.challengeUrl}`;
  }
  if (error instanceof EazipApiError) {
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

function localExampleCode() {
  return `import { createZip } from '@eazip/core';

// One function: zips in the browser and reports per-file skips.
const result = await createZip({
  files: selectedFiles,   // File[], FileList, URLs, Blobs…
  zipName: '${zipName}',
});

result.download();
console.log(result.status, result.errors); // 'completed' | 'partial'`;
}

function cloudExampleCode() {
  return `import { startZip } from '@eazip/core';

const job = startZip({
  strategy: 'cloud',
  publicKey: import.meta.env.VITE_EAZIP_PUBLIC_KEY,
  files: selectedUrls,
  zipName: '${zipName}',
});

job.subscribe(() => {
  const { status, session } = job.getSnapshot();
  console.log(status, session?.sessionId); // resumable across reloads
});

const result = await job.done;
result.download();`;
}

function filenameFromUrl(url: string): string | undefined {
  try {
    const segment = new URL(url).pathname.split('/').filter(Boolean).pop();
    return segment ? decodeURIComponent(segment) : undefined;
  } catch {
    return undefined;
  }
}

function formatBytes(value: number) {
  if (value < 1000) return `${value} B`;
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)} KB`;
  return `${(value / 1_000_000).toFixed(1)} MB`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const escapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return escapes[char] ?? char;
  });
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}
