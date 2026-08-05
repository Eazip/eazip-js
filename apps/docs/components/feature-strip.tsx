import styles from './feature-strip.module.css';
import shared from './shared.module.css';

const FEATURES = [
  {
    title: 'No backend to build',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
    body: (
      <>Create ZIP downloads in the browser without running ZIP workers, temporary storage, or download servers.</>
    ),
  },
  {
    title: 'Production-ready download UX',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 8.5h18" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6.2" cy="6.2" r="0.6" fill="currentColor" />
        <circle cx="8.2" cy="6.2" r="0.6" fill="currentColor" />
      </svg>
    ),
    body: <>Use the React tray for progress, cancel, retry, completion, and multiple ZIP downloads.</>,
  },
  {
    title: 'Scale without a rewrite',
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
        Keep the same API and UI when moving large, long-running, or resumable jobs to Eazip Cloud.
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
