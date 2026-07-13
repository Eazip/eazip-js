import styles from './quickstart.module.css';
import shared from './shared.module.css';

const STEPS = [
  { title: 'Install', chip: 'npm i @eazip/react', desc: 'Add the package. No build step, no config.' },
  {
    title: 'Start a download',
    chip: 'zip.download({ files })',
    desc: 'Files, blobs, URL strings — anything goes in.',
  },
  { title: 'Drop in the tray', chip: '<EazipTray />', desc: 'Progress, retries and download — handled.' },
  { title: 'Scale if needed', chip: "strategy: 'cloud'", desc: 'Hand huge jobs to Eazip Cloud.' },
];

export function Quickstart() {
  return (
    <section className={`${shared.container} ${styles.section}`}>
      <div className={styles.grid}>
        <div>
          <div className={styles.label}>Quickstart</div>
          <h2 className={styles.h2}>From install to download</h2>
          <p className={styles.intro}>The same four moves behind the demo above. Copy, paste, ship.</p>
        </div>

        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.number} aria-hidden="true">
                {index + 1}
              </span>
              <div className={styles.stepBody}>
                <span className={styles.title}>{step.title}</span>
                <code className={styles.chip}>{step.chip}</code>
                <p className={styles.desc}>{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
