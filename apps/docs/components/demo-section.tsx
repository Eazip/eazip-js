import styles from './demo-section.module.css';
import shared from './shared.module.css';
import TrayDemo from './tray-demo-loader';
import { DemoCode } from './demo-code';

export function DemoSection() {
  return (
    <section className={`${shared.container} ${styles.section}`}>
      <div className={styles.grid}>
        <TrayDemo />
        <DemoCode />
      </div>
    </section>
  );
}
