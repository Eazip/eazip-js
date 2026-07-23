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
          Turn files and URLs
          <br />
          into one{' '}
          <span className={styles.accent}>
            ZIP.
            <span className={styles.accentBar} aria-hidden="true" />
          </span>
        </h1>

        <p className={styles.sub}>
          Eazip packages files or remote URLs into a single ZIP, <strong>right in the browser</strong> — no
          backend, no zip server. Reach for the cloud only when a job outgrows the tab.
        </p>

        <div className={styles.ctaRow}>
          <Link href="/docs" className={styles.btnPrimary}>
            Get started
          </Link>
          <a
            href="https://github.com/Eazip/eazip-js"
            target="_blank"
            rel="noreferrer"
            className={styles.btnOutline}
          >
            GitHub
          </a>
          <CopyNpmChip />
        </div>
      </div>
    </div>
  );
}
