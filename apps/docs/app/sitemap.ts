import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://eazip.io/' },
    ...source.getPages().map((page) => ({ url: `https://eazip.io${page.url}` })),
  ];
}
