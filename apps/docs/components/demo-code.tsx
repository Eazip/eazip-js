'use client';

import { CodeWindow } from './code-window';
import { DEMO_CORE_TS, EXPORTER_TSX } from './code-snippets';
import { useIntegrationPreference } from './integration-preference';
import styles from './demo-section.module.css';

export function DemoCode() {
  const { integration, setIntegration } = useIntegrationPreference();

  return (
    <CodeWindow
      lines={integration === 'react' ? EXPORTER_TSX : DEMO_CORE_TS}
      titlebar={
        <div className={styles.codeTabs} role="tablist" aria-label="Demo integration">
          <button
            type="button"
            role="tab"
            aria-selected={integration === 'react'}
            className={styles.codeTab}
            data-active={integration === 'react'}
            onClick={() => setIntegration('react')}
          >
            @eazip/react
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={integration === 'core'}
            className={styles.codeTab}
            data-active={integration === 'core'}
            onClick={() => setIntegration('core')}
          >
            @eazip/core
          </button>
        </div>
      }
    />
  );
}
