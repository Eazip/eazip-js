import Link from 'next/link';
import styles from './cta.module.css';
import shared from './shared.module.css';

export function Cta() {
  return (
    <section className={`${shared.container} ${styles.section}`}>
      <div className={styles.card}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.text}>
          <h2 className={styles.h2}>Ship your first ZIP today.</h2>
          <p className={styles.body}>
            Free and MIT-licensed. When a job outgrows the browser, Eazip Cloud is one option away — same
            API, same tray, same UX.
          </p>
        </div>
        <div className={styles.actions}>
          <a
            href="https://eazip.io/cloud/?utm_source=eazip_js_docs&utm_medium=docs&utm_campaign=cloud_activation&utm_content=homepage_final_cta"
            className={styles.btnSolid}
            data-analytics-placement="homepage_final_cta"
          >
            Try Eazip Cloud
          </a>
          <a
            href="https://github.com/Eazip/eazip-js"
            target="_blank"
            rel="noreferrer"
            className={styles.btnOutline}
          >
            Star on GitHub
          </a>
          <Link href="/docs" className={styles.btnOutline}>
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
