import { docs } from '@/.source';
import { loader } from 'fumadocs-core/source';

// The site serves at the domain root (homepage at `/`), with all content
// pages under the `/docs` segment (app/docs/[...slug]) — so every generated
// link (sidebar, search results, prev/next) must carry the /docs prefix.
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
});
