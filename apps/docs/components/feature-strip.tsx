import styles from './feature-strip.module.css';
import shared from './shared.module.css';

const FEATURES = [
  {
    title: 'Files or URLs',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 3h7l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 13l2.5 2.5L15 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    body: (
      <>Zip local blobs and remote URLs into one archive — mix and match freely.</>
    ),
  },
  {
    title: 'Runs in the browser',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 8.5h18" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6.2" cy="6.2" r="0.6" fill="currentColor" />
        <circle cx="8.2" cy="6.2" r="0.6" fill="currentColor" />
      </svg>
    ),
    body: <>Packaged entirely client-side. No backend, no zip server to run.</>,
  },
  {
    title: 'Cloud when you scale',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 18a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.2 7.98 4 4 0 0 1 17 18H7z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
    body: (
      <>
        Thousands of files or many GB? Switch <code>strategy: &apos;cloud&apos;</code>.
      </>
    ),
  },
];

export function FeatureStrip() {
  return (
    <section className={`${shared.container} ${styles.section}`}>
      <div className={styles.grid}>
        {FEATURES.map((feature) => (
          <div key={feature.title} className={styles.card}>
            <div className={styles.icon}>{feature.icon}</div>
            <h3 className={styles.title}>{feature.title}</h3>
            <p className={styles.body}>{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
