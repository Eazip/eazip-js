import Link from 'next/link';
import styles from './cloud-intro.module.css';
import shared from './shared.module.css';

export function CloudIntro() {
  return (
    <section className={`${shared.container} ${styles.section}`}>
      <div className={styles.card}>
        <div>
          <div className={styles.label}>Need multi-GB ZIPs?</div>
          <h2 className={styles.h2}>Start local. Scale without rewriting.</h2>
          <div className={styles.eyebrow}>Browser-first, cloud-ready</div>
        </div>

        <div className={styles.body}>
          <p>
            Use the MIT-licensed browser strategy for everyday ZIP downloads — no account, backend, or
            upload step required.
          </p>
          <p>
            For multi-GB archives, thousands of URLs, CORS-limited sources, or reload-resumable jobs,
            switch to Eazip Cloud with the same download call. <strong>No backend code to write</strong> —
            same API, same React tray.
          </p>
          <pre className={styles.code}>
            <code>{`zip.download({
  strategy: 'cloud',
  publicKey: 'pk_ez_...',
  files: urls,
})`}</code>
          </pre>
          <Link href="/docs/cloud" className={styles.link}>
            Explore Eazip Cloud →
          </Link>
        </div>
      </div>
    </section>
  );
}
