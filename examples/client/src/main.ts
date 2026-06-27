import {
  createZip,
  EazipApiError,
  EazipChallengeRequiredError,
  type EazipProgress,
  type EazipStatus,
  type EazipZipOutput,
  type LocalCreateZipResult,
} from '@eazip/client';
import './styles.css';

type Mode = 'local' | 'cloud';

type CloudFile = {
  url: string;
  filename: string;
  selected: boolean;
};

type SampleAsset = {
  url: string;
  filename: string;
  label: string;
  kind: 'image' | 'text';
};

type RunState = {
  status: 'idle' | 'running' | 'completed' | 'failed';
  sdkStatus: EazipStatus;
  message: string;
  sessionId: string | null;
  zips: EazipZipOutput[];
  localResult: LocalCreateZipResult | null;
  progress: EazipProgress | null;
};

const publicKey = import.meta.env.VITE_EAZIP_PUBLIC_KEY;
const apiBaseUrl = import.meta.env.VITE_EAZIP_API_BASE_URL || 'https://api.eazip.io';
const sampleAssets: SampleAsset[] = [
  { url: '/samples/color-grid.svg', filename: 'color-grid.svg', label: 'Color grid', kind: 'image' },
  { url: '/samples/receipt-card.svg', filename: 'receipt-card.svg', label: 'Receipt card', kind: 'image' },
  { url: '/samples/notes.txt', filename: 'notes.txt', label: 'Notes text', kind: 'text' },
];

let mode: Mode = 'local';
let zipName = 'eazip-sample.zip';
let localFiles: File[] = [];
let localUrlFiles: CloudFile[] = sampleAssets.map((asset) => ({
  url: asset.url,
  filename: asset.filename,
  selected: true,
}));
let cloudFiles = createInitialCloudFiles();
let runState: RunState = {
  status: 'idle',
  sdkStatus: 'idle',
  message: 'Select local files to create a ZIP in your browser.',
  sessionId: null,
  zips: [],
  localResult: null,
  progress: null,
};

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing #app element');
const app: HTMLDivElement = root;

render();

function createInitialCloudFiles(): CloudFile[] {
  const configured = import.meta.env.VITE_EAZIP_SAMPLE_FILES_JSON;
  if (configured) {
    try {
      const parsed = JSON.parse(configured) as Array<{ url?: string; filename?: string }>;
      const files = parsed
        .filter((file) => file.url)
        .map((file, index) => ({
          url: String(file.url),
          filename: file.filename || `sample-${index + 1}`,
          selected: true,
        }));
      if (files.length > 0) return files;
    } catch {
      // The editable defaults below keep the example usable even with bad env JSON.
    }
  }

  return [
    { url: 'https://example.com/', filename: 'example-home.html', selected: true },
    { url: 'https://example.com/robots.txt', filename: 'robots.txt', selected: true },
  ];
}

function render() {
  const isRunning = runState.status === 'running';
  const canCreate = mode === 'local'
    ? (localFiles.length > 0 || localUrlFiles.some((file) => file.selected && file.url)) && !isRunning
    : Boolean(publicKey) && cloudFiles.some((file) => file.selected && file.url) && !isRunning;

  app.innerHTML = `
    <main class="shell">
      <header class="header">
        <div>
          <p class="eyebrow">@eazip/client example</p>
          <h1>Create ZIPs in the browser or with Eazip Cloud</h1>
        </div>
        <a class="ghost-button" href="https://github.com/eazip/eazip-js" target="_blank" rel="noreferrer">GitHub</a>
      </header>

      <section class="workspace">
        <aside class="sidebar">
          <div class="mode-switch" role="tablist" aria-label="ZIP strategy">
            <button class="${mode === 'local' ? 'active' : ''}" data-mode="local" type="button">Local</button>
            <button class="${mode === 'cloud' ? 'active' : ''}" data-mode="cloud" type="button">Cloud</button>
          </div>

          <label class="field">
            <span>ZIP filename</span>
            <input data-field="zip-name" value="${escapeAttribute(zipName)}" ${isRunning ? 'disabled' : ''} />
          </label>

          ${mode === 'local' ? renderLocalControls(isRunning) : renderCloudControls(isRunning)}

          <button class="primary-button" data-action="create" type="button" ${canCreate ? '' : 'disabled'}>
            ${isRunning ? 'Creating ZIP...' : mode === 'local' ? 'Create Local ZIP' : 'Create Cloud ZIP'}
          </button>
        </aside>

        <section class="main-panel">
          ${renderStatus()}
          ${renderCode()}
        </section>
      </section>
    </main>
  `;

  bindEvents();
}

function renderLocalControls(isRunning: boolean) {
  return `
    <section class="control-block">
      <div class="dropzone">
        <input id="file-picker" data-field="local-files" type="file" multiple ${isRunning ? 'disabled' : ''} />
        <label for="file-picker">
          <strong>Select files</strong>
          <span>ZIP creation stays in this browser. No upload, no public key.</span>
        </label>
      </div>
      ${localFiles.length ? `
        <div class="file-stack">
          ${localFiles.map((file, index) => `
            <div class="file-item">
              <span class="file-index">${index + 1}</span>
              <div>
                <strong>${escapeHtml(file.name || `file-${index + 1}`)}</strong>
                <p>${formatBytes(file.size)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p class="hint">Pick one or more files from your machine to test local mode first.</p>'}

      <div class="section-heading">
        <h2>Sample remote files</h2>
      </div>
      <div class="sample-grid">
        ${sampleAssets.map((asset) => renderSampleAsset(asset, isRunning)).join('')}
      </div>

      <div class="section-heading">
        <h2>Custom URLs</h2>
        <button class="icon-button" data-action="add-local-url" type="button" aria-label="Add local URL" ${isRunning ? 'disabled' : ''}>+</button>
      </div>
      <p class="hint">URL sources are fetched by this browser, so the remote server must allow CORS.</p>
      <div class="url-list">
        ${localUrlFiles.map((file, index) => renderUrlRow(file, index, 'local', isRunning, sampleAssets.some((asset) => asset.url === file.url))).join('')}
      </div>
    </section>
  `;
}

function renderSampleAsset(asset: SampleAsset, disabled: boolean) {
  const index = localUrlFiles.findIndex((file) => file.url === asset.url);
  const selected = index >= 0 && localUrlFiles[index]?.selected;
  return `
    <label class="sample-card ${selected ? 'selected' : ''}">
      <input data-sample-url="${escapeAttribute(asset.url)}" type="checkbox" ${selected ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
      <span class="sample-preview ${asset.kind}">
        ${asset.kind === 'image'
          ? `<img src="${escapeAttribute(asset.url)}" alt="" />`
          : '<span>TXT</span>'}
      </span>
      <span>
        <strong>${escapeHtml(asset.label)}</strong>
        <small>${escapeHtml(asset.filename)}</small>
      </span>
    </label>
  `;
}

function renderCloudControls(isRunning: boolean) {
  return `
    <section class="control-block">
      <div class="cloud-note ${publicKey ? 'ready' : ''}">
        <strong>${publicKey ? 'Public key configured' : 'Public key missing'}</strong>
        <span>${publicKey ? 'Cloud mode will call Public Sessions.' : 'Set VITE_EAZIP_PUBLIC_KEY in .env.'}</span>
      </div>
      <div class="section-heading">
        <h2>Source URLs</h2>
        <button class="icon-button" data-action="add-cloud-file" type="button" aria-label="Add URL" ${isRunning ? 'disabled' : ''}>+</button>
      </div>
      <div class="url-list">
        ${cloudFiles.map((file, index) => renderUrlRow(file, index, 'cloud', isRunning)).join('')}
      </div>
    </section>
  `;
}

function renderUrlRow(file: CloudFile, index: number, scope: 'local' | 'cloud', disabled: boolean, readonly = false) {
  return `
    <div class="url-row ${readonly ? 'sample-url-row' : ''}">
      <label class="checkbox-cell">
        <input data-${scope}-selected="${index}" type="checkbox" ${file.selected ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
      </label>
      <label class="field compact">
        <span>URL</span>
        <input data-${scope}-url="${index}" value="${escapeAttribute(file.url)}" ${disabled || readonly ? 'disabled' : ''} />
      </label>
      <label class="field compact">
        <span>Name</span>
        <input data-${scope}-name="${index}" value="${escapeAttribute(file.filename)}" ${disabled || readonly ? 'disabled' : ''} />
      </label>
    </div>
  `;
}

function renderStatus() {
  const progressPercent = runState.progress?.bytesTotal
    ? Math.min(100, Math.round(((runState.progress.bytesProcessed ?? 0) / runState.progress.bytesTotal) * 100))
    : runState.status === 'completed'
      ? 100
      : 0;

  return `
    <section class="panel status-panel">
      <div class="section-heading">
        <h2>Run</h2>
        <span class="status-pill status-${runState.status}">${runState.sdkStatus}</span>
      </div>
      <p class="message">${escapeHtml(runState.message)}</p>
      <div class="progress-track" aria-label="Progress">
        <div style="width: ${progressPercent}%"></div>
      </div>
      ${runState.progress?.currentFileName ? `<p class="meta">Current: <code>${escapeHtml(runState.progress.currentFileName)}</code></p>` : ''}
      ${runState.sessionId ? `<p class="meta">Session: <code>${escapeHtml(runState.sessionId)}</code></p>` : ''}
      ${runState.zips.length ? `<div class="zip-list">${runState.zips.map(renderZip).join('')}</div>` : ''}
    </section>
  `;
}

function renderZip(zip: EazipZipOutput) {
  const size = zip.size == null ? '' : `<span>${formatBytes(zip.size)}</span>`;
  const download = zip.downloadUrl
    ? `<a class="secondary-button" href="${escapeAttribute(zip.downloadUrl)}" download="${escapeAttribute(zip.filename)}">Download</a>`
    : '';
  return `
    <div class="zip-row">
      <div>
        <strong>${escapeHtml(zip.filename)}</strong>
        <p>${escapeHtml(zip.status)} ${size}</p>
      </div>
      ${download}
    </div>
  `;
}

function renderCode() {
  return `
    <section class="panel code-panel">
      <div class="section-heading">
        <h2>Code</h2>
      </div>
      <pre><code>${escapeHtml(mode === 'local' ? localExampleCode() : cloudExampleCode())}</code></pre>
    </section>
  `;
}

function bindEvents() {
  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      mode = button.dataset.mode as Mode;
      resetRunState(mode === 'local'
        ? 'Select local files to create a ZIP in your browser.'
        : 'Configure a public key and source URLs to create a cloud ZIP.');
      render();
    });
  });

  app.querySelector<HTMLInputElement>('[data-field="zip-name"]')?.addEventListener('input', (event) => {
    zipName = inputValue(event);
  });

  app.querySelector<HTMLInputElement>('[data-field="local-files"]')?.addEventListener('change', (event) => {
    localFiles = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
    resetRunState(`${localFiles.length} local file${localFiles.length === 1 ? '' : 's'} selected.`);
    render();
  });

  app.querySelectorAll<HTMLInputElement>('[data-sample-url]').forEach((input) => {
    input.addEventListener('change', () => {
      const asset = sampleAssets.find((candidate) => candidate.url === input.dataset.sampleUrl);
      if (!asset) return;
      const existing = localUrlFiles.find((file) => file.url === asset.url);
      if (existing) {
        existing.selected = input.checked;
      } else {
        localUrlFiles.unshift({
          url: asset.url,
          filename: asset.filename,
          selected: input.checked,
        });
      }
      resetRunState(input.checked ? `${asset.label} sample selected.` : `${asset.label} sample skipped.`);
      render();
    });
  });

  app.querySelector('[data-action="add-local-url"]')?.addEventListener('click', () => {
    localUrlFiles.push({ url: '', filename: `remote-${localUrlFiles.length + 1}`, selected: true });
    render();
  });

  app.querySelector('[data-action="add-cloud-file"]')?.addEventListener('click', () => {
    cloudFiles.push({ url: '', filename: `file-${cloudFiles.length + 1}`, selected: true });
    render();
  });

  app.querySelector('[data-action="create"]')?.addEventListener('click', () => {
    void runCreateZip();
  });

  bindUrlRows(localUrlFiles, 'local');
  bindUrlRows(cloudFiles, 'cloud');
}

function bindUrlRows(files: CloudFile[], scope: 'local' | 'cloud') {
  files.forEach((file, index) => {
    app.querySelector<HTMLInputElement>(`[data-${scope}-selected="${index}"]`)?.addEventListener('change', (event) => {
      file.selected = inputChecked(event);
      render();
    });
    app.querySelector<HTMLInputElement>(`[data-${scope}-url="${index}"]`)?.addEventListener('input', (event) => {
      file.url = inputValue(event);
    });
    app.querySelector<HTMLInputElement>(`[data-${scope}-name="${index}"]`)?.addEventListener('input', (event) => {
      file.filename = inputValue(event);
    });
  });
}

async function runCreateZip() {
  runState = {
    status: 'running',
    sdkStatus: 'creating',
    message: mode === 'local' ? 'Creating a ZIP in this browser...' : 'Creating a Public Session...',
    sessionId: null,
    zips: [],
    localResult: null,
    progress: null,
  };
  render();

  try {
    const result = mode === 'local'
      ? await createZip({
          strategy: 'local',
          files: [
            ...localFiles.map((file) => ({ file, filename: file.name })),
            ...localUrlFiles
              .filter((file) => file.selected && file.url)
              .map((file) => ({ url: file.url, filename: file.filename || undefined })),
          ],
          zipName,
          onStatusChange: handleStatus,
          onProgress: handleProgress,
        })
      : await createZip({
          strategy: 'cloud',
          publicKey,
          apiBaseUrl,
          files: cloudFiles
            .filter((file) => file.selected && file.url)
            .map((file) => ({ url: file.url, filename: file.filename || undefined })),
          zipName,
          onStatusChange: handleStatus,
        });

    runState = {
      status: 'completed',
      sdkStatus: 'completed',
      message: result.strategy === 'local' ? 'Local ZIP is ready.' : 'Cloud ZIP is ready.',
      sessionId: result.strategy === 'cloud' ? result.sessionId : null,
      zips: result.zips,
      localResult: result.strategy === 'local' ? result : null,
      progress: runState.progress,
    };
    render();
  } catch (error) {
    runState = {
      status: 'failed',
      sdkStatus: 'failed',
      message: errorMessage(error),
      sessionId: null,
      zips: [],
      localResult: null,
      progress: null,
    };
    render();
  }
}

function handleStatus(status: EazipStatus) {
  runState = {
    ...runState,
    sdkStatus: status,
    message: status === 'creating' ? 'Preparing ZIP creation...' : `Status: ${status}`,
  };
  render();
}

function handleProgress(progress: EazipProgress) {
  const files = `${progress.filesCompleted}/${progress.filesTotal}`;
  runState = {
    ...runState,
    progress,
    message: progress.phase === 'completed'
      ? 'Final ZIP is ready.'
      : `${progress.phase}: ${files} files`,
  };
  render();
}

function resetRunState(message: string) {
  runState.localResult?.revokeObjectUrl?.();
  runState = {
    status: 'idle',
    sdkStatus: 'idle',
    message,
    sessionId: null,
    zips: [],
    localResult: null,
    progress: null,
  };
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
  const urlFiles = localUrlFiles
    .filter((file) => file.selected && file.url)
    .map((file) => `  { url: '${file.url}', filename: '${file.filename}' }`)
    .join(',\n');

  return `import { createZip } from '@eazip/client';

const input = document.querySelector('input[type="file"]');
const selectedFiles = Array.from(input.files).map((file) => ({
  file,
  filename: file.name,
}));

const result = await createZip({
  strategy: 'local',
  files: [
    ...selectedFiles${urlFiles ? `,\n${urlFiles}` : ''}
  ],
  zipName: '${zipName}',
  onProgress: (progress) => console.log(progress),
});

await result.download();`;
}

function cloudExampleCode() {
  const files = cloudFiles
    .filter((file) => file.selected && file.url)
    .map((file) => `    { url: '${file.url}', filename: '${file.filename}' }`)
    .join(',\n');

  return `import { createZip } from '@eazip/client';

const result = await createZip({
  strategy: 'cloud',
  publicKey: import.meta.env.VITE_EAZIP_PUBLIC_KEY,
  files: [
${files || "    { url: 'https://assets.example.com/report.pdf', filename: 'report.pdf' }"}
  ],
  zipName: '${zipName}',
  onStatusChange: (status) => console.log(status),
});

await result.download();`;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
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

function inputValue(event: Event) {
  return (event.currentTarget as HTMLInputElement).value;
}

function inputChecked(event: Event) {
  return (event.currentTarget as HTMLInputElement).checked;
}
