'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const GA_MEASUREMENT_ID = 'G-JMZW6S8J9J';
const CLOUD_HOST = 'eazip.io';
const CLOUD_PATH = '/cloud';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function sendPageView(pathname: string) {
  window.gtag?.('event', 'page_view', {
    page_location: window.location.href,
    page_path: pathname,
    page_title: document.title,
  });
}

export function Analytics() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const enabled = process.env.NODE_ENV === 'production';

  useEffect(() => {
    if (!enabled || !ready) return;
    sendPageView(pathname);
  }, [enabled, pathname, ready]);

  useEffect(() => {
    if (!enabled) return;

    const trackCloudClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.hostname !== CLOUD_HOST || !destination.pathname.startsWith(CLOUD_PATH)) return;

      window.gtag?.('event', 'cloud_cta_click', {
        link_text: link.textContent?.trim().slice(0, 100) || 'unlabeled',
        link_url: `${destination.origin}${destination.pathname}`,
        placement: link.dataset.analyticsPlacement || 'docs_link',
        source_page: window.location.pathname,
      });
    };

    document.addEventListener('click', trackCloudClick);
    return () => document.removeEventListener('click', trackCloudClick);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
      onReady={() => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer?.push(args));
        window.gtag('js', new Date());
        window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
        setReady(true);
      }}
    />
  );
}
