import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from './recipes.module.css';
import shared from './shared.module.css';

const CORE_HUE = '#3ba88a';
const REACT_HUE = '#3b73f0';
const CLOUD_HUE = '#c99bff';

type Badge = 'core' | 'react' | 'cloud';

const BADGE_LABEL: Record<Badge, string> = {
  core: '@eazip/core',
  react: '@eazip/react',
  cloud: 'cloud',
};

const BADGE_HUE: Record<Badge, string> = {
  core: CORE_HUE,
  react: REACT_HUE,
  cloud: CLOUD_HUE,
};

const ICONS: Record<string, ReactNode> = {
  select: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 12.5l2.3 2.3L16 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  link: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9.5 14.5l5-5M8 17l-2.5 2.5a3.5 3.5 0 0 1-5-5L3 12M16 7l2.5-2.5a3.5 3.5 0 0 1 5 5L21 12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  bucket: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 8h14l-1.4 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3 8h18M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  retry: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12a8 8 0 1 1 2.6 5.9M4 12V6m0 6h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  scale: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7l8-4 8 4-8 4-8-4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 12l8 4 8-4M4 17l8 4 8-4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
  noFee: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 16.5a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 16.7 6.5 4 4 0 0 1 16.5 14.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 12v7m-3-3.5L12 19l3-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const RECIPES: Array<{ title: string; slug: string; badge: Badge; blurb: string; icon: keyof typeof ICONS }> = [
  {
    title: 'Download selected files',
    slug: 'download-selected-files',
    badge: 'react',
    blurb: 'Turn a gallery or asset picker into a single ZIP.',
    icon: 'select',
  },
  {
    title: 'Create a ZIP from remote URLs',
    slug: 'create-zip-from-remote-urls',
    badge: 'core',
    blurb: 'Fetch and zip files straight from their URLs.',
    icon: 'link',
  },
  {
    title: 'ZIP S3 or R2 objects',
    slug: 'zip-s3-or-r2-objects',
    badge: 'core',
    blurb: 'Bundle objects from signed bucket URLs.',
    icon: 'bucket',
  },
  {
    title: 'Add progress, cancel, and retry',
    slug: 'progress-cancel-retry',
    badge: 'react',
    blurb: 'Let the tray narrate every state for you.',
    icon: 'retry',
  },
  {
    title: 'Zip GB-scale, 1,000+ URL jobs',
    slug: 'gb-scale-url-jobs',
    badge: 'cloud',
    blurb: 'Offload huge, many-file archives to the cloud strategy.',
    icon: 'scale',
  },
  {
    title: 'Zero-egress exports',
    slug: 'zero-egress-exports',
    badge: 'cloud',
    blurb: 'Eazip Cloud ships downloads with zero egress fees — stream or store, pay only for what you use.',
    icon: 'noFee',
  },
];

export function Recipes() {
  return (
    <section className={`${shared.container} ${styles.section}`}>
      <div className={styles.header}>
        <h2 className={styles.h2}>Recipes</h2>
        <span className={styles.tagline}>common jobs, mapped out</span>
        <Link href="/docs/recipes" className={styles.browseAll}>
          Browse all →
        </Link>
      </div>

      <div className={styles.grid}>
        {RECIPES.map((recipe) => {
          const hue = BADGE_HUE[recipe.badge];
          return (
            <Link key={recipe.slug} href={`/docs/recipes/${recipe.slug}`} className={styles.card}>
              <div className={styles.icon}>{ICONS[recipe.icon]}</div>
              <div className={styles.body}>
                <div className={styles.titleRow}>
                  <span className={styles.title}>{recipe.title}</span>
                  <span
                    className={styles.badge}
                    style={{ color: hue, background: `color-mix(in srgb, ${hue} 16%, transparent)` }}
                  >
                    {BADGE_LABEL[recipe.badge]}
                  </span>
                </div>
                <p className={styles.blurb}>{recipe.blurb}</p>
              </div>
              <span className={styles.arrow} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
