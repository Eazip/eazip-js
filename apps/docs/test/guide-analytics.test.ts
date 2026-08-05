import { describe, expect, it } from 'vitest';
import { getGuideLinkAnalyticsEvent } from '../lib/guide-analytics';

describe('getGuideLinkAnalyticsEvent', () => {
  it('tracks navigation to a specific Guide without query parameters', () => {
    expect(
      getGuideLinkAnalyticsEvent(
        new URL('https://eazip.io/docs/guides/gb-scale-url-jobs?source=home#split'),
        {
          currentOrigin: 'https://eazip.io',
          linkText: '  Create multi-GB ZIP archives  ',
          placement: 'homepage_guides',
          sourcePage: '/',
        },
      ),
    ).toEqual({
      name: 'guide_link_click',
      params: {
        destination_path: '/docs/guides/gb-scale-url-jobs',
        link_text: 'Create multi-GB ZIP archives',
        placement: 'homepage_guides',
        source_page: '/',
      },
    });
  });

  it('ignores external, index, and same-page links', () => {
    const context = {
      currentOrigin: 'https://eazip.io',
      sourcePage: '/docs/guides/create-zip-from-remote-urls',
    };

    expect(
      getGuideLinkAnalyticsEvent(
        new URL('https://example.com/docs/guides/gb-scale-url-jobs'),
        context,
      ),
    ).toBeNull();
    expect(
      getGuideLinkAnalyticsEvent(new URL('https://eazip.io/docs/guides'), context),
    ).toBeNull();
    expect(
      getGuideLinkAnalyticsEvent(
        new URL('https://eazip.io/docs/guides/create-zip-from-remote-urls'),
        context,
      ),
    ).toBeNull();
  });
});
