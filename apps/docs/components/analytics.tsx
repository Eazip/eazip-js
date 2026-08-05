'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getGuideLinkAnalyticsEvent } from '@/lib/guide-analytics';
import { getOutboundAnalyticsEvent } from '@/lib/outbound-analytics';

const GA_MEASUREMENT_ID = 'G-JMZW6S8J9J';

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

    const trackOutboundClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link) return;

      const destination = new URL(link.href, window.location.href);
      const guideEvent = getGuideLinkAnalyticsEvent(destination, {
        currentOrigin: window.location.origin,
        linkText: link.textContent || undefined,
        placement: link.dataset.analyticsPlacement,
        sourcePage: window.location.pathname,
      });
      if (guideEvent) window.gtag?.('event', guideEvent.name, guideEvent.params);

      const analyticsEvent = getOutboundAnalyticsEvent(destination, {
        linkText: link.textContent || undefined,
        placement: link.dataset.analyticsPlacement || 'docs_link',
        sourcePage: window.location.pathname,
      });
      if (!analyticsEvent) return;

      window.gtag?.('event', analyticsEvent.name, analyticsEvent.params);
    };

    document.addEventListener('click', trackOutboundClick);
    return () => document.removeEventListener('click', trackOutboundClick);
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
