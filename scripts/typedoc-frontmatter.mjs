import { MarkdownPageEvent } from 'typedoc-plugin-markdown';

function commentSummary(model) {
  const comment = model?.comment ?? model?.signatures?.[0]?.comment;
  if (!comment?.summary) return undefined;

  const summary = comment.summary
    .map((part) => part.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

  return summary || undefined;
}

/**
 * Add the metadata Fumadocs expects without duplicating a visible page title.
 *
 * @param {import('typedoc-plugin-markdown').MarkdownApplication} app
 */
export function load(app) {
  app.renderer.on(MarkdownPageEvent.BEGIN, (page) => {
    const title = page.model?.name ?? app.options.getValue('name');
    const description = commentSummary(page.model) ?? `API reference for ${title}.`;

    page.frontmatter = {
      ...page.frontmatter,
      title,
      description,
    };
  });
}
