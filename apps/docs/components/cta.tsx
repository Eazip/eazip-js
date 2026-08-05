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
            Free and MIT-licensed. Follow the three-step quickstart and add a polished ZIP download in
            minutes.
          </p>
        </div>
        <div className={styles.actions}>
          <Link
            href="#quickstart"
            className={styles.btnSolid}
            data-analytics-placement="homepage_final_cta"
          >
            View quickstart
          </Link>
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
