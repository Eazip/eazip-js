import { describe, expect, it } from 'vitest';
import { getOutboundAnalyticsEvent } from '../lib/outbound-analytics';

describe('getOutboundAnalyticsEvent', () => {
  it('tracks a Cloud CTA without leaking query parameters or fragments', () => {
    expect(
      getOutboundAnalyticsEvent(
        new URL('https://eazip.io/cloud/?utm_source=docs&token=secret#pricing'),
        {
          linkText: '  Try Eazip Cloud  ',
          placement: 'remote_urls_recipe_cloud_cta',
          sourcePage: '/docs/recipes/create-zip-from-remote-urls',
        },
      ),
    ).toEqual({
      name: 'cloud_cta_click',
      params: {
        link_text: 'Try Eazip Cloud',
        link_url: 'https://eazip.io/cloud/',
        placement: 'remote_urls_recipe_cloud_cta',
        source_page: '/docs/recipes/create-zip-from-remote-urls',
      },
    });
  });

  it('does not treat a lookalike path or hostname as a Cloud CTA', () => {
    const context = { sourcePage: '/docs' };

    expect(getOutboundAnalyticsEvent(new URL('https://eazip.io/cloudy'), context)).toBeNull();
    expect(getOutboundAnalyticsEvent(new URL('https://app.eazip.io/cloud/'), context)).toBeNull();
  });

  it('tracks exact Eazip package links on npm', () => {
    expect(
      getOutboundAnalyticsEvent(new URL('https://www.npmjs.com/package/@eazip/core'), {
        placement: 'remote_urls_recipe_install',
        sourcePage: '/docs/recipes/create-zip-from-remote-urls',
      }),
    ).toEqual({
      name: 'npm_package_click',
      params: {
        package_name: '@eazip/core',
        placement: 'remote_urls_recipe_install',
        source_page: '/docs/recipes/create-zip-from-remote-urls',
      },
    });
  });

  it('ignores untracked npm package and lookalike paths', () => {
    const context = { sourcePage: '/docs' };

    expect(getOutboundAnalyticsEvent(new URL('https://npmjs.com/package/jszip'), context)).toBeNull();
    expect(getOutboundAnalyticsEvent(new URL('https://npmjs.com/package/@eazip/core/versions'), context)).toBeNull();
  });
});
