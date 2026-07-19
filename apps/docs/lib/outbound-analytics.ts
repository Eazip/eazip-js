const CLOUD_HOST = 'eazip.io';
const CLOUD_PATH = '/cloud';
const NPM_HOSTS = new Set(['npmjs.com', 'www.npmjs.com']);
const TRACKED_NPM_PACKAGES = new Map([
  ['/package/@eazip/core', '@eazip/core'],
  ['/package/@eazip/react', '@eazip/react'],
]);

type AnalyticsContext = {
  linkText?: string;
  placement?: string;
  sourcePage: string;
};

export type OutboundAnalyticsEvent =
  | {
      name: 'cloud_cta_click';
      params: {
        link_text: string;
        link_url: string;
        placement: string;
        source_page: string;
      };
    }
  | {
      name: 'npm_package_click';
      params: {
        package_name: string;
        placement: string;
        source_page: string;
      };
    };

export function getOutboundAnalyticsEvent(
  destination: URL,
  { linkText, placement, sourcePage }: AnalyticsContext,
): OutboundAnalyticsEvent | null {
  const eventPlacement = placement || 'docs_link';
  const isCloudPage =
    destination.hostname === CLOUD_HOST &&
    (destination.pathname === CLOUD_PATH || destination.pathname.startsWith(`${CLOUD_PATH}/`));

  if (isCloudPage) {
    return {
      name: 'cloud_cta_click',
      params: {
        link_text: linkText?.trim().slice(0, 100) || 'unlabeled',
        link_url: `${destination.origin}${destination.pathname}`,
        placement: eventPlacement,
        source_page: sourcePage,
      },
    };
  }

  if (!NPM_HOSTS.has(destination.hostname)) return null;
  const packageName = TRACKED_NPM_PACKAGES.get(destination.pathname);
  if (!packageName) return null;

  return {
    name: 'npm_package_click',
    params: {
      package_name: packageName,
      placement: eventPlacement,
      source_page: sourcePage,
    },
  };
}
