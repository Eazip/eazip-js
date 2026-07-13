'use client';

import dynamic from 'next/dynamic';
import styles from './tray-demo.module.css';

// `ssr: false` is only valid from inside a Client Component, and keeps the
// live demo (and its @eazip/react bundle) out of the server render and off
// the critical path for LCP — it hydrates lazily once the browser is idle.
const TrayDemo = dynamic(() => import('./tray-demo'), {
  ssr: false,
  loading: () => (
    <div className={styles.panel}>
      <div className={styles.fallback}>Loading demo…</div>
    </div>
  ),
});

export default TrayDemo;
