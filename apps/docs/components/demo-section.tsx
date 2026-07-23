import styles from './demo-section.module.css';
import shared from './shared.module.css';
import TrayDemo from './tray-demo-loader';
import { CodeWindow } from './code-window';
import { EXPORTER_TSX } from './code-snippets';

export function DemoSection() {
  return (
    <section className={`${shared.container} ${styles.section}`}>
      <div className={styles.grid}>
        <TrayDemo />
        <CodeWindow filename="Exporter.tsx" lines={EXPORTER_TSX} />
      </div>
      <p className={styles.caption}>
        Live React demo using <code>&lt;EazipTray /&gt;</code> — the same local engine is available from{' '}
        <code>@eazip/core</code>.
      </p>
    </section>
  );
}
