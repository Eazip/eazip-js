import styles from './two-packages.module.css';
import shared from './shared.module.css';
import { CodeWindow } from './code-window';
import { EXPORT_TS, APP_TSX } from './code-snippets';

const CORE_HUE = '#3ba88a';
const REACT_HUE = '#3b73f0';

export function TwoPackages() {
  return (
    <section className={`${shared.container} ${styles.section}`}>
      <div className={styles.header}>
        <div className={styles.label}>Two integrations · one ZIP engine</div>
        <h2 className={styles.h2}>Choose the integration that fits your app</h2>
      </div>

      <div className={styles.row}>
        <div className={styles.text}>
          <span
            className={styles.badge}
            style={{ color: REACT_HUE, background: `color-mix(in srgb, ${REACT_HUE} 15%, transparent)` }}
          >
            @eazip/react
          </span>
          <h3 className={styles.h3}>For React apps</h3>
          <p className={styles.body}>
            {
              'Use the useEazip() hook and drop-in <EazipTray /> for progress, cancel, retry, and completed downloads.'
            }
          </p>
        </div>
        <div className={styles.code}>
          <CodeWindow filename="App.tsx" lines={APP_TSX} />
        </div>
      </div>

      <div className={`${styles.row} ${styles.rowReversed}`}>
        <div className={styles.text}>
          <span
            className={styles.badge}
            style={{ color: CORE_HUE, background: `color-mix(in srgb, ${CORE_HUE} 15%, transparent)` }}
          >
            @eazip/core
          </span>
          <h3 className={styles.h3}>For any JavaScript app</h3>
          <p className={styles.body}>
            Feed it local blobs and remote URLs, then download the resulting ZIP. Framework-agnostic,
            ESM-only, and zero config.
          </p>
        </div>
        <div className={styles.code}>
          <CodeWindow filename="export.ts" lines={EXPORT_TS} />
        </div>
      </div>
    </section>
  );
}
