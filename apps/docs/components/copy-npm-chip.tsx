'use client';

import { useState } from 'react';
import { useIntegrationPreference } from './integration-preference';
import styles from './hero.module.css';

export function CopyNpmChip() {
  const [copied, setCopied] = useState(false);
  const { integration, setIntegration } = useIntegrationPreference();
  const installCommand = `npm i @eazip/${integration}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable — silently ignore, the command is still
      // visible as selectable text.
    }
  };

  return (
    <div className={styles.npmChip}>
      <span className={styles.npmPrompt}>$</span>
      <span className={styles.npmPrefix}>npm i @eazip/</span>
      <span className={styles.npmSegments} aria-label="Choose a package">
        {(['react', 'core'] as const).map((packageName) => (
          <button
            key={packageName}
            type="button"
            className={styles.npmSegment}
            data-active={integration === packageName}
            aria-pressed={integration === packageName}
            onClick={() => {
              setIntegration(packageName);
              setCopied(false);
            }}
          >
            {packageName}
          </button>
        ))}
      </span>
      <button
        type="button"
        className={styles.copyButton}
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy install command'}
      >
        {copied ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
      </button>
    </div>
  );
}
