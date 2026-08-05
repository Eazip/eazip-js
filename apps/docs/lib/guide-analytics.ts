type GuideLinkAnalyticsContext = {
  currentOrigin: string;
  linkText?: string;
  placement?: string;
  sourcePage: string;
};

export type GuideLinkAnalyticsEvent = {
  name: 'guide_link_click';
  params: {
    destination_path: string;
    link_text: string;
    placement: string;
    source_page: string;
  };
};

export function getGuideLinkAnalyticsEvent(
  destination: URL,
  { currentOrigin, linkText, placement, sourcePage }: GuideLinkAnalyticsContext,
): GuideLinkAnalyticsEvent | null {
  if (destination.origin !== currentOrigin) return null;
  if (!destination.pathname.startsWith('/docs/guides/')) return null;
  if (destination.pathname === sourcePage) return null;

  return {
    name: 'guide_link_click',
    params: {
      destination_path: destination.pathname,
      link_text: linkText?.trim().slice(0, 100) || 'unlabeled',
      placement: placement || 'docs_link',
      source_page: sourcePage,
    },
  };
}
