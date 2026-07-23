import styles from './quickstart.module.css';
import shared from './shared.module.css';
import { IntegrationPicker } from './integration-picker';

export function Quickstart() {
  return (
    <section className={`${shared.container} ${styles.section}`}>
      <div className={styles.header}>
        <div className={styles.label}>Quickstart</div>
        <h2 className={styles.h2}>Choose your integration</h2>
        <p className={styles.intro}>
          React and framework-agnostic JavaScript share the same local engine and Cloud upgrade path.
        </p>
      </div>
      <div className={styles.picker}>
        <IntegrationPicker placement="homepage_quickstart" />
      </div>
    </section>
  );
}
