import Link from 'next/link';
import { LogoMark } from './logo-mark';
import styles from './footer.module.css';
import shared from './shared.module.css';

const COLUMNS: Array<{
  heading: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}> = [
  {
    heading: 'Docs',
    links: [
      { label: 'Get started', href: '/docs/getting-started' },
      { label: 'React SDK', href: '/docs/react' },
      { label: 'Core API', href: '/docs/core' },
      { label: 'Eazip Cloud', href: '/docs/cloud' },
    ],
  },
  {
    heading: 'Recipes',
    links: [
      { label: 'Download selected files', href: '/docs/recipes/download-selected-files' },
      { label: 'Download remote files as a ZIP', href: '/docs/recipes/create-zip-from-remote-urls' },
      { label: 'ZIP S3 or R2 objects', href: '/docs/recipes/zip-s3-or-r2-objects' },
      { label: 'Add progress, cancel, and retry', href: '/docs/recipes/progress-cancel-retry' },
    ],
  },
  {
    heading: 'Community',
    links: [
      { label: 'GitHub', href: 'https://github.com/Eazip/eazip-js', external: true },
      { label: 'npm', href: 'https://www.npmjs.com/package/@eazip/react', external: true },
      { label: 'Changelog', href: 'https://github.com/Eazip/eazip-js/releases', external: true },
      { label: 'Discord', href: 'https://discord.gg/77MVCqmV4U', external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className={`${shared.container} ${styles.footer}`}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandRow}>
            <LogoMark size={24} />
            <span className={styles.wordmark}>Eazip</span>
          </Link>
          <p className={styles.blurb}>Open-source ZIP toolkit for the web. Files, URLs, and the browser.</p>
        </div>

        <div className={styles.columns}>
          {COLUMNS.map((column) => (
            <div key={column.heading} className={styles.column}>
              <h4 className={styles.heading}>{column.heading}</h4>
              <ul className={styles.links}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a href={link.href} target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© 2026 Eazip · MIT License</span>
        <span>eazip.io/docs</span>
      </div>
    </footer>
  );
}
