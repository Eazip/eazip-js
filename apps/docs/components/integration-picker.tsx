'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './integration-picker.module.css';

type Integration = 'react' | 'javascript';

const STORAGE_KEY = 'eazip-docs-integration';

const INTEGRATIONS: Record<
  Integration,
  {
    label: string;
    packageName: string;
    install: string;
    filename: string;
    code: string;
    description: string;
    href: string;
  }
> = {
  react: {
    label: 'React',
    packageName: '@eazip/react',
    install: 'npm install @eazip/react',
    filename: 'Exporter.tsx',
    code: `import { EazipTray, useEazip } from '@eazip/react';

function Exporter({ files }) {
  const zip = useEazip();

  return (
    <>
      <button onClick={() => zip.download({ files })}>
        Download as ZIP
      </button>
      <EazipTray />
    </>
  );
}`,
    description: 'Use the hook and drop-in tray for progress, retries, and downloads.',
    href: '/docs/getting-started/react',
  },
  javascript: {
    label: 'Vanilla JS',
    packageName: '@eazip/core',
    install: 'npm install @eazip/core',
    filename: 'export.ts',
    code: `import { createZip } from '@eazip/core';

const result = await createZip({
  files: fileInput.files ?? [],
  zipName: 'export.zip',
});

result.download();`,
    description: 'Use the framework-agnostic engine in any browser application.',
    href: '/docs/getting-started/javascript',
  },
};

export function IntegrationPicker({ placement = 'docs_overview' }: { placement?: string }) {
  const [integration, setIntegration] = useState<Integration>('react');
  const selected = INTEGRATIONS[integration];

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'react' || stored === 'javascript') setIntegration(stored);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, []);

  const selectIntegration = (next: Integration) => {
    setIntegration(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The selector still works for this page when persistence is unavailable.
    }
    window.gtag?.('event', 'integration_selected', {
      integration: next,
      placement,
      source_page: window.location.pathname,
    });
  };

  return (
    <div className={styles.picker}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="Choose an integration">
          {(Object.keys(INTEGRATIONS) as Integration[]).map((key) => (
            <button
              key={key}
              id={`integration-tab-${placement}-${key}`}
              type="button"
              role="tab"
              aria-selected={integration === key}
              aria-controls={`integration-panel-${placement}`}
              className={styles.tab}
              data-active={integration === key}
              onClick={() => selectIntegration(key)}
            >
              {INTEGRATIONS[key].label}
            </button>
          ))}
        </div>
        <code className={styles.package}>{selected.packageName}</code>
      </div>

      <div
        id={`integration-panel-${placement}`}
        role="tabpanel"
        aria-labelledby={`integration-tab-${placement}-${integration}`}
        className={styles.panel}
      >
        <div className={styles.install}>
          <span>Install</span>
          <code>{selected.install}</code>
        </div>

        <div className={styles.codeHeader}>{selected.filename}</div>
        <pre className={styles.code}>
          <code>{selected.code}</code>
        </pre>

        <div className={styles.footer}>
          <p>{selected.description}</p>
          <Link href={selected.href}>{selected.label} quickstart →</Link>
        </div>
      </div>
    </div>
  );
}
