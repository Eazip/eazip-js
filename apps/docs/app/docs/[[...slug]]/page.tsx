import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { source } from '@/lib/source';
import { GuideCodeTab, GuideCodeTabs } from '@/components/guide-code-tabs';
import { getMDXComponents } from '@/components/mdx';
import { OverviewIntegrationCards } from '@/components/overview-integration-cards';

type PageParams = { slug?: string[] };

const SECTION_NAMES: Record<string, string> = {
  cloud: 'Eazip Cloud',
  concepts: 'Concepts',
  'getting-started': 'Getting Started',
  guides: 'Guides',
  react: 'React',
  reference: 'Reference',
};

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const section = slug?.[0];
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Docs',
      item: 'https://eazip.io/docs',
    },
    ...(section
      ? [
          {
            '@type': 'ListItem',
            position: 2,
            name: SECTION_NAMES[section] ?? section,
            item: `https://eazip.io/docs/${section}`,
          },
        ]
      : []),
    ...(slug && slug.length > 1
      ? [
          {
            '@type': 'ListItem',
            position: 3,
            name: page.data.title,
            item: `https://eazip.io${page.url}`,
          },
        ]
      : []),
  ];
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  return (
    <>
      {breadcrumbItems.length > 1 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
          }}
        />
      ) : null}
      <DocsPage toc={page.data.toc} full={page.data.full}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, page),
              GuideCodeTab,
              GuideCodeTabs,
              OverviewIntegrationCards,
            })}
          />
        </DocsBody>
      </DocsPage>
    </>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      canonical: page.url,
    },
    openGraph: {
      type: 'article',
      url: page.url,
      title: page.data.title,
      description: page.data.description,
    },
    twitter: {
      card: 'summary',
      title: page.data.title,
      description: page.data.description,
    },
  };
}
