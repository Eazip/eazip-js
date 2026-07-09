import { useMemo, useState } from 'react';
import { EazipTray, useEazip, type EazipSourceFile } from '@eazip/react';
import { assetFromUrl, buildAssets, samplePhotos, type DemoAsset } from './assets.js';

const ENV_PUBLIC_KEY = import.meta.env.VITE_EAZIP_PUBLIC_KEY as string | undefined;
const API_BASE_URL = import.meta.env.VITE_EAZIP_API_BASE_URL as string | undefined;
const KEY_STORAGE = 'eazip-demo-public-key';

const EXT_COLORS: Record<string, string> = {
  SVG: '#3ba88a',
  TXT: '#3b6ec4',
  CSV: '#3ba85e',
  JPG: '#c4493b',
  PNG: '#3b82c4',
  URL: '#7c5cd6',
};

function formatSize(bytes: number): string {
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}

function storedKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

type Placement = 'corner' | 'bar' | 'anchored';
type Theme = 'light' | 'dark' | 'auto';
type Locale = 'en' | 'ja';
type Strategy = 'local' | 'cloud';

export function App() {
  const baseAssets = useMemo(buildAssets, []);
  const [remoteAssets, setRemoteAssets] = useState<DemoAsset[]>([]);
  const assets = useMemo(() => [...baseAssets, ...remoteAssets], [baseAssets, remoteAssets]);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(baseAssets.slice(0, 6).map((asset) => asset.id)),
  );
  const [placement, setPlacement] = useState<Placement>('corner');
  const [theme, setTheme] = useState<Theme>('auto');
  const [accent, setAccent] = useState('#3056d3');
  const [locale, setLocale] = useState<Locale>('en');
  const [strategy, setStrategy] = useState<Strategy>('local');
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [savedKey, setSavedKey] = useState(storedKey);
  const [keyDraft, setKeyDraft] = useState('');

  const zip = useEazip();

  const publicKey = savedKey || ENV_PUBLIC_KEY || '';
  const cloudReady = strategy !== 'cloud' || Boolean(publicKey);
  const selectable = (asset: DemoAsset) => strategy === 'local' || 'url' in asset.source;
  const selectedAssets = assets.filter((asset) => selected.has(asset.id) && selectable(asset));
  const allSelected = assets.filter(selectable).every((asset) => selected.has(asset.id));

  const toggle = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(assets.filter(selectable).map((asset) => asset.id)));
  };

  const addAssets = (added: DemoAsset[]) => {
    if (added.length === 0) return;
    setRemoteAssets((previous) => {
      const known = new Set([...baseAssets, ...previous].map((asset) => asset.id));
      return [...previous, ...added.filter((asset) => !known.has(asset.id))];
    });
    setSelected((previous) => new Set([...previous, ...added.map((asset) => asset.id)]));
  };

  const addFromDraft = () => {
    const added = urlDraft
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => assetFromUrl(line, remoteAssets.length + index))
      .filter((asset): asset is DemoAsset => asset !== null);
    addAssets(added);
    setUrlDraft('');
    setAddPanelOpen(false);
  };

  const removeAsset = (id: string) => {
    setRemoteAssets((previous) => previous.filter((asset) => asset.id !== id));
    setSelected((previous) => {
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  };

  const saveKey = () => {
    const key = keyDraft.trim();
    if (!key) return;
    try {
      localStorage.setItem(KEY_STORAGE, key);
    } catch {
      // Session-only fallback.
    }
    setSavedKey(key);
    setKeyDraft('');
  };

  const clearKey = () => {
    try {
      localStorage.removeItem(KEY_STORAGE);
    } catch {
      // ignore
    }
    setSavedKey('');
  };

  const handleDownload = () => {
    if (selectedAssets.length === 0 || !cloudReady) return;
    const files: EazipSourceFile[] = selectedAssets.map((asset) => asset.source);
    if (strategy === 'cloud') {
      zip.download({
        strategy: 'cloud',
        publicKey,
        files,
        zipName: 'assets.zip',
        ...(API_BASE_URL ? { apiBaseUrl: API_BASE_URL } : {}),
      });
      return;
    }
    zip.download({
      strategy: 'local',
      files,
      zipName: 'assets.zip',
    });
  };

  return (
    <div style={{ ['--accent' as string]: accent }}>
      <header className="topbar">
        <div className="topbar-row">
          <div className="logo">
            <div className="logo-inner" />
          </div>
          <div className="app-name">Northwind</div>
          <div className="app-sub">Assets</div>
          <div className="spacer" />
          <div className="segmented" role="tablist" aria-label="Zip strategy">
            <button
              type="button"
              role="tab"
              aria-selected={strategy === 'local'}
              className={strategy === 'local' ? 'active' : ''}
              onClick={() => setStrategy('local')}
            >
              Local
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={strategy === 'cloud'}
              className={strategy === 'cloud' ? 'active' : ''}
              onClick={() => setStrategy('cloud')}
            >
              Cloud
            </button>
          </div>
        </div>
        <div className="topbar-row">
          <button type="button" className="select-all-btn" onClick={toggleAll}>
            {allSelected ? 'Clear' : 'Select all'}
          </button>
          <div className="sel-count">
            {selectedAssets.length > 0 ? `${selectedAssets.length} selected` : `${assets.length} items`}
          </div>
          <div className="spacer" />
          <button
            type="button"
            className="download-btn"
            disabled={selectedAssets.length === 0 || zip.isBusy || !cloudReady}
            onClick={handleDownload}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download as ZIP
          </button>
        </div>
        <div className="controls">
          <div className="control">
            <label htmlFor="placement">Place</label>
            <select
              id="placement"
              value={placement}
              onChange={(event) => setPlacement(event.target.value as Placement)}
            >
              <option value="corner">Corner</option>
              <option value="bar">Bar</option>
              <option value="anchored">Anchored</option>
            </select>
          </div>
          <div className="control">
            <label htmlFor="theme">Theme</label>
            <select id="theme" value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="control">
            <label htmlFor="accent">Accent</label>
            <input
              id="accent"
              type="color"
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
            />
          </div>
          <div className="control">
            <label htmlFor="locale">Locale</label>
            <select id="locale" value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="en">EN</option>
              <option value="ja">JA</option>
            </select>
          </div>
        </div>
      </header>

      {strategy === 'cloud' && !publicKey ? (
        <div className="setup-banner">
          <div>
            <strong>Cloud needs a public key.</strong> Paste one to try server-side zipping — get a key at{' '}
            <a href="https://eazip.io" target="_blank" rel="noreferrer">
              eazip.io
            </a>
            .
          </div>
          <div className="setup-actions">
            <input
              type="text"
              placeholder="pk_ez_…"
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveKey();
              }}
            />
            <button type="button" onClick={saveKey} disabled={!keyDraft.trim()}>
              Save
            </button>
          </div>
        </div>
      ) : null}
      {strategy === 'cloud' && savedKey ? (
        <div className="setup-banner ready">
          <div>
            <strong>Cloud ready.</strong> Using key ····{savedKey.slice(-4)} (stored in this browser).
          </div>
          <div className="setup-actions">
            <button type="button" onClick={clearKey}>
              Remove key
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid">
        {assets.map((asset) => {
          const isSelected = selected.has(asset.id) && selectable(asset);
          return (
            <div className="tile-wrap" key={asset.id}>
              <button
                type="button"
                className={`tile${isSelected ? ' selected' : ''}`}
                disabled={!selectable(asset)}
                title={selectable(asset) ? undefined : 'In-memory file — switch to Local to include it'}
                onClick={() => toggle(asset.id)}
              >
                <div
                  className="thumb"
                  style={
                    asset.thumbUrl
                      ? undefined
                      : {
                          background: `linear-gradient(150deg, hsl(${asset.hue}, 24%, 88%), hsl(${asset.hue}, 28%, 78%))`,
                        }
                  }
                >
                  {asset.thumbUrl ? <img src={asset.thumbUrl} alt="" loading="lazy" /> : null}
                  {isSelected ? (
                    <div className="check">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M5 12l4 4L19 7"
                          stroke="#fff"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  ) : null}
                  {'url' in asset.source ? (
                    <span className="remote-badge" title="Remote URL">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M7 17L17 7M9 7h8v8"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  ) : null}
                  <span className="ext-badge" style={{ background: EXT_COLORS[asset.ext] ?? '#6b7177' }}>
                    {asset.ext}
                  </span>
                </div>
                <div className="tile-meta">
                  <div className="tile-name">{asset.name}</div>
                  <div className="tile-size">{asset.size > 0 ? formatSize(asset.size) : 'remote'}</div>
                </div>
              </button>
              {asset.removable ? (
                <button
                  type="button"
                  className="tile-remove"
                  aria-label={`Remove ${asset.name}`}
                  onClick={() => removeAsset(asset.id)}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                  </svg>
                </button>
              ) : null}
            </div>
          );
        })}

        <button type="button" className="tile ghost-tile" onClick={() => setAddPanelOpen((open) => !open)}>
          <div className="ghost-inner">
            <span className="ghost-plus">+</span>
            <span>Add from URLs</span>
          </div>
        </button>
      </div>

      {addPanelOpen ? (
        <div className="add-panel">
          <div className="add-panel-head">
            <strong>Add remote assets</strong>
            <span>One URL per line. Remote assets work in both strategies; the cloud strategy requires them.</span>
          </div>
          <textarea
            rows={4}
            placeholder={'https://cdn.example.com/report.pdf\nhttps://cdn.example.com/hero.png'}
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            autoFocus
          />
          <div className="add-panel-actions">
            <button type="button" className="primary" onClick={addFromDraft} disabled={!urlDraft.trim()}>
              Add URLs
            </button>
            <button
              type="button"
              onClick={() => {
                addAssets(samplePhotos(remoteAssets.length));
                setAddPanelOpen(false);
              }}
            >
              Add sample images
            </button>
            <div className="spacer" />
            <button type="button" onClick={() => setAddPanelOpen(false)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      <p className="hint">
        {strategy === 'cloud'
          ? 'Cloud strategy: the zip is built by the Eazip API from URL assets (they must be reachable by the API — check your app’s allowed source hosts). Tip: reload mid-export to watch the tray resume.'
          : 'Local strategy: files are zipped right here in the browser — nothing is uploaded. Remote URLs are fetched by the browser (CORS applies); failures are skipped and reported in the tray.'}
      </p>

      <EazipTray placement={placement} theme={theme} accent={accent} locale={locale} />
    </div>
  );
}
