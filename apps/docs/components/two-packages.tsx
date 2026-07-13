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
        <div className={styles.label}>Two packages · one mental model</div>
        <h2 className={styles.h2}>A few lines of core, or one component</h2>
      </div>

      <div className={styles.row}>
        <div className={styles.text}>
          <span
            className={styles.badge}
            style={{ color: CORE_HUE, background: `color-mix(in srgb, ${CORE_HUE} 15%, transparent)` }}
          >
            @eazip/core
          </span>
          <h3 className={styles.h3}>The framework-agnostic engine</h3>
          <p className={styles.body}>
            Feed it files, blobs, or remote URLs; get back a ZIP the browser downloads. ESM-only,
            tree-shakeable, zero config.
          </p>
        </div>
        <div className={styles.code}>
          <CodeWindow filename="export.ts" lines={EXPORT_TS} />
        </div>
      </div>

      <div className={`${styles.row} ${styles.rowReversed}`}>
        <div className={styles.code}>
          <CodeWindow filename="App.tsx" lines={APP_TSX} />
        </div>
        <div className={styles.text}>
          <span
            className={styles.badge}
            style={{ color: REACT_HUE, background: `color-mix(in srgb, ${REACT_HUE} 15%, transparent)` }}
          >
            @eazip/react
          </span>
          <h3 className={styles.h3}>Or a single component</h3>
          <p className={styles.body}>
            {
              'A useEazip() hook plus a self-contained <EazipTray/> that narrates progress, retries and the download. Flip one option to cloud when you outgrow the browser.'
            }
          </p>
        </div>
      </div>
    </section>
  );
}
