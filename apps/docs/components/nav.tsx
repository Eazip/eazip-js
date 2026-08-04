import Link from 'next/link';
import { LargeSearchToggle, SearchToggle } from 'fumadocs-ui/components/layout/search-toggle';
import { LogoMark } from './logo-mark';
import { ThemeToggle } from './theme-toggle';
import styles from './nav.module.css';

const NAV_LINKS = [
  { label: 'Get started', href: '/docs' },
  { label: 'Guides', href: '/docs/guides' },
  { label: 'Cloud', href: '/docs/cloud' },
  { label: 'Reference', href: '/docs/reference' },
];

export function Nav() {
  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          <LogoMark size={27} />
          <span className={styles.wordmark}>Eazip</span>
        </Link>

        <nav className={styles.links}>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.spacer} />

        <LargeSearchToggle className={styles.search} />
        <SearchToggle className={styles.searchIcon} />

        <div className={styles.actions}>
          <ThemeToggle />
          <a
            href="https://github.com/Eazip/eazip-js"
            target="_blank"
            rel="noreferrer"
            className={styles.iconButton}
            aria-label="Eazip on GitHub"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.54-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.4-5.28 5.69.42.36.78 1.08.78 2.18 0 1.57-.02 2.84-.02 3.23 0 .31.21.67.8.56A10.52 10.52 0 0 0 23.5 12c0-6.27-5.23-11.5-11.5-11.5z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
