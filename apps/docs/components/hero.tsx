import Link from 'next/link';
import { CopyNpmChip } from './copy-npm-chip';
import styles from './hero.module.css';

export function Hero() {
  return (
    <div className={styles.wrap}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} aria-hidden="true" />
          OPEN-SOURCE ZIP TOOLKIT · MIT
        </div>

        <h1 className={styles.title}>
          Add{' '}
          <span className={styles.accent}>
            “Download as ZIP”
            <span className={styles.accentBar} aria-hidden="true" />
          </span>
          <br />
          to any web app.
        </h1>

        <p className={styles.sub}>
          Create ZIPs from files or remote URLs, <strong>right in the browser</strong> — without any backend
          code. Eazip handles multi-GB archives and thousands of URLs too — just switch to Eazip Cloud for
          larger jobs.
        </p>

        <div className={styles.ctaRow}>
          <Link href="/docs" className={styles.btnPrimary}>
            Get started
          </Link>
          <CopyNpmChip />
        </div>
      </div>
    </div>
  );
}
