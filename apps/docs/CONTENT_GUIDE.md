# Eazip documentation guide

This guide defines how the public Eazip documentation is organized and how to
write and review its pages. It is intentionally about durable information
architecture and editorial rules; product behavior and API details remain
defined by the code, types, and tests.

## Goals

The documentation should help a reader answer one of these questions without
having to understand the repository or package layout first:

1. How do I get a ZIP download working?
2. How do I complete a specific ZIP workflow?
3. How does Eazip behave, and what trade-offs should I understand?
4. What is the exact public API?
5. When and how should I use Eazip Cloud?
6. Why is my integration not working?

Organize content around those reader needs. A framework, package, or internal
component is not automatically a top-level documentation section.

## Target information architecture

The target top-level structure is:

```text
Overview
Getting Started
Guides
Concepts
Cloud
Reference
Troubleshooting
```

The current top-level React section is transitional. Do not add new pages to it
unless they are required to complete its migration. React content belongs in
one of three places:

- first installation and success: **Getting Started / React**;
- a user outcome such as adding or localizing the tray: **Guides**;
- exact hooks, components, props, and types: **Reference / React**.

Cloud remains a top-level exception because it is a separate product boundary
with its own credentials, origin configuration, sessions, and execution
behavior. Common ZIP workflows should still live in Guides and link to Cloud
only where the execution strategy changes.

### Guide groups

As the guide collection grows, group it by outcome rather than framework or
package:

```text
Guides
├─ Create archives
├─ Connect sources
├─ Build the experience
└─ Scale and deliver
```

Avoid creating a group until it has enough pages to help navigation. A short,
flat guide list is better than empty or one-page categories.

## Decide where a page belongs

Use the first matching rule:

1. **Does it take a new user to their first working ZIP?** Put it in Getting
   Started.
2. **Does it help a user complete one concrete job?** Put it in Guides.
3. **Does it explain a model, behavior, invariant, or trade-off?** Put it in
   Concepts.
4. **Does it document an exact symbol, option, type, return value, or error?**
   Put it in Reference.
5. **Is it specifically about Cloud credentials, configuration, sessions, or
   execution behavior?** Put it in Cloud.
6. **Does it start from a symptom or failure?** Put it in Troubleshooting.
7. **Is it a runnable demonstration rather than canonical explanation?** Put
   the code in `examples/` and link it from the relevant page.
8. **Is it time-based news, opinion, comparison, a benchmark, or a release
   story?** It belongs in a future blog, not in the product documentation.

When a page seems to belong in two sections, choose the reader's primary intent
and link to the supporting page. Do not duplicate the same explanation or code
as two independent sources of truth.

## Section contracts

Each section makes a different promise to the reader. Page structure and tone
should follow that promise.

### Overview

**Reader question:** Where should I start?

**Promise:** The reader can choose the right next page quickly.

The Overview is a compact technical router, not a second landing page. It may:

- define Eazip in one short paragraph;
- let the reader choose React or framework-agnostic JavaScript;
- summarize Local and Cloud execution without teaching either in depth;
- link to Getting Started, Guides, Concepts, Cloud, and Reference.

Avoid long tutorials, exhaustive feature lists, API details, and a duplicate of
the homepage demo. Every block should help the reader make a choice.

### Getting Started

**Reader question:** How do I use Eazip in my application?

**Promise:** The reader can complete the basic workflow and understand the
small set of concepts needed to continue in the chosen environment.

React and JavaScript pages should use the same basic shape:

1. what the integration is for and its supported environment;
2. installation and the default Local behavior;
3. one complete, minimal application example;
4. a brief explanation of each important piece;
5. the accepted input shapes;
6. basic progress, cancellation, and partial-result behavior where relevant;
7. the Cloud scale path without advanced Cloud configuration;
8. next steps.

Project scaffolding may be included when it improves reproducibility, but mark
it optional so readers with an existing app can skip it. Do not add advanced
variations, a full API listing, or several competing setup styles. These pages
teach the basic operating model, not only the fastest copy-and-paste path. Keep
that model concise and link to a Guide, Concept, or Reference page for depth.

`How Eazip works` may provide a short orientation to the shared Local and Cloud
job model. Deeper lifecycle and behavior explanations belong in Concepts.

### Guides

**Reader question:** How do I complete this specific ZIP workflow?

**Promise:** The reader can reach one observable outcome in their application.

Use an outcome-oriented title. Prefer:

- `Create a ZIP from remote URLs`
- `Show ZIP progress and let users cancel`

Avoid vague titles such as `Using URLs`, `Progress events`, or `Advanced
usage`.

A guide should normally contain:

1. **Outcome** — what the reader will have when finished;
2. **When to use this** — relevant conditions and important non-goals;
3. **Prerequisites** — packages, browser requirements, CORS, keys, or Cloud;
4. **Complete example** — runnable code, not disconnected fragments;
5. **How it works** — only the explanation needed for this task;
6. **Limits and scale path** — when Local is enough and when Cloud helps;
7. **Troubleshooting** — failures specific to this workflow;
8. **Next steps** — related Guides, Concepts, and Reference pages.

Use React and Core examples according to the task, not by default. If the prose
and behavior are shared, keep one guide and clearly label the framework-specific
code. Split pages only when the setup, constraints, or reader outcome differs
materially.

Do not publish placeholder guides, empty category pages, or “coming soon”
content. An unpublished page is better than an indexed page that does not solve
the promised task.

### Concepts

**Reader question:** Why does Eazip work this way, and what should I choose?

**Promise:** The reader gains a reliable mental model for making decisions.

Concept pages should explain:

- terminology and relationships;
- lifecycle or state transitions;
- invariants and behavior shared by packages;
- alternatives and trade-offs;
- limits that affect architectural choices.

Start with the practical takeaway, then explain the model. Use diagrams or
tables only when they clarify relationships. Link to Guides for implementation
and Reference for exact contracts. Do not turn a Concept page into a
step-by-step tutorial or repeat complete setup code.

Use noun or question-based titles such as `ZIP jobs`, `Input types`, or `How
splitting works`.

### Cloud

**Reader question:** How do I configure and use Eazip Cloud correctly?

**Promise:** The reader understands the Cloud boundary and can configure the
Cloud-specific part of an integration safely.

Cloud pages cover:

- obtaining and using public keys;
- allowed origins and browser security boundaries;
- Local versus Cloud execution behavior;
- stored versus streamed results;
- backend-created sessions and secret handling;
- Cloud-specific lifecycle, expiry, and operational constraints.

Lead with the user-visible reason for the configuration, not dashboard or API
internals. Never expose secret values in browser examples. Keep general tasks,
such as creating a ZIP from URLs, in Guides and link to the relevant Cloud page
for the scale or security-specific part.

### Reference

**Reader question:** What is the exact public contract?

**Promise:** The reader can look up behavior without interpreting prose or
examples.

Reference is organized by public package and symbol. A reference entry should
include, when applicable:

1. import and signature;
2. concise description;
3. parameters, props, and types;
4. defaults and allowed values;
5. return value or rendered behavior;
6. errors and important edge cases;
7. one minimal usage example;
8. links to relevant Guides and Concepts.

Keep Reference factual, consistent, and easy to scan. Avoid marketing copy,
long tutorials, and explanations that belong in Concepts. Code, exported types,
and tests are the source of truth; update Reference in the same change as a
public API change.

### Troubleshooting

**Reader question:** Why is this failing, and how do I recover?

**Promise:** The reader can move from a symptom to a verified fix.

Use symptom-oriented titles and this structure:

1. symptom or error message;
2. affected environments;
3. likely causes, in diagnostic order;
4. checks that distinguish those causes;
5. fix;
6. how to verify the fix;
7. prevention and related pages.

Prefer focused pages such as `Remote URLs fail with a CORS error` over a large
uncategorized FAQ. A Guide may contain task-specific troubleshooting, but link
to the canonical Troubleshooting page when the problem applies across tasks.

## Supporting content

### Examples

Runnable projects live in `examples/`. They prove that an integration works and
give readers code they can adapt; they are not the canonical explanation of an
API or workflow.

Each maintained example should:

- state what it demonstrates;
- list the packages and environment it uses;
- include exact run instructions;
- avoid required secrets for Local mode;
- link back to the relevant Guide and Reference page.

Add a public Examples index only when there are enough maintained examples to
make it a useful destination.

### Blog

A future blog may contain announcements, comparisons, benchmarks, architecture
stories, and customer examples. Blog posts must link to canonical Guides or
Reference pages for current setup instructions. A blog post must never be the
only place that documents supported behavior.

## Writing rules

### Lead with the outcome

Start pages and sections with what the reader can do or decide. Introduce
internal abstractions only after they are needed.

### Use direct, concrete language

- Address the reader as “you” when useful.
- Prefer active voice and short paragraphs.
- Use one term consistently for one concept.
- Explain necessary jargon at first use.
- Keep product claims factual in documentation; reserve campaign language for
  marketing pages.

Display text uses **Eazip** and **Eazip Cloud**. Package names, code, commands,
and domains remain lowercase and use code formatting where appropriate.

### Make titles predictable

- Getting Started: environment or integration, such as `React`.
- Guides: user outcome, preferably starting with a verb.
- Concepts: model, object, or explanatory question.
- Reference: package, component, hook, function, or type name.
- Troubleshooting: visible symptom or error.

Avoid generic page titles such as `Overview`, `Advanced`, or `Usage` below a
section index.

### Design for scanning

Use visual structure where it helps the reader identify choices or parallel
ideas faster. Vary the structure deliberately instead of styling every section
the same way.

- Use bullets for three or more parallel benefits, conditions, steps, or
  destinations. Keep connected reasoning in prose.
- Use cards for a small set of entry points, tables for exact repeated-field
  comparisons, and numbered lists for ordered procedures.
- Use familiar official ecosystem icons, such as the React mark, when they make
  a choice recognizable at a glance. Always pair an icon with a text label and
  keep decorative SVGs hidden from assistive technology.
- Use emoji only occasionally when it adds meaning to a note or status. Do not
  decorate every heading or mix emoji and product icons without a reason.
- Avoid stacking multiple visual patterns in one section. One clear scanning
  aid is usually enough.

### Keep code trustworthy

- Verify imports, options, return values, and example key formats against the
  current implementation.
- Prefer complete, copyable examples over fragments.
- Label pseudocode explicitly.
- Use Local execution by default unless the task requires Cloud.
- Never invent endpoints, limits, error codes, or accepted value formats.
- Never put secret keys or private session credentials in browser code.
- Keep examples narrow enough that the documentation point is visible.
- Wrap long JSX props and calls so examples do not require horizontal scrolling
  at the normal documentation width.

When a public example cannot be exercised automatically, verify it against the
exported types and the nearest maintained example application.

### Link by reader intent

Use descriptive link text. `Create a ZIP from remote URLs` is better than
`click here` or `learn more`.

Expected linking patterns:

- Getting Started links to the next useful Guide, one orienting Concept, and
  the relevant Reference.
- Guides link to supporting Concepts, exact Reference entries, related Guides,
  and canonical Troubleshooting pages.
- Concepts link to Guides that apply the model and Reference that defines the
  contract.
- Reference links to at least one task-oriented example when one exists.

### Write for search without writing for a crawler

- Give every page a unique, accurate frontmatter title and description.
- Use the words a developer would use to describe the task or symptom.
- Make one page the canonical answer for one primary search intent.
- Avoid near-duplicate React and Core pages when only the code differs.
- Use headings and internal links to expose related subtopics naturally.
- Do not add keywords that the page does not fully answer.
- Include a framework name in the title only when the setup, code, and prose
  fully answer that framework-specific intent. Put the task before the brand.
- When behavior is shared, keep one URL and switch the JavaScript and React
  examples in place. Render both examples in the initial HTML, persist the
  reader's choice, and default to the language named in the title.
- Write a page-specific description that states the outcome, environment, and
  important differentiator. Do not use a comma-separated keyword list.
- Do not add a `meta keywords` tag. Search engines that matter to this project
  do not use it; put relevant terms in useful titles, headings, prose, and code.
- Preserve a self-referencing canonical URL and include every canonical,
  indexable page in the sitemap.

Evaluate search-focused Guides after they have been indexed and have enough
data to compare. Use Search Console impressions, clicks, click-through rate,
queries, and average position together with GA page views and
`guide_link_click` events. Improve weak titles or merge overlapping intent
before deleting a useful page solely because its raw click count is lower.

## Sources of truth

Use this order when content disagrees:

1. code, exported types, and tests define supported behavior;
2. public documentation defines the canonical workflow and mental model;
3. package READMEs provide a compact package-level entry point and link to the
   public documentation;
4. examples demonstrate maintained integrations;
5. blog posts and release announcements provide time-based context, not the
   current contract.

Behavior, public API, or supported-workflow changes must update affected
Reference, Guides, and Concepts in the same pull request. Do not preserve an old
documentation claim for marketing consistency when the implementation has
changed.

## Review checklist

Before publishing or merging a documentation page, confirm:

- [ ] The page is in the section that matches the reader's primary intent.
- [ ] Its title and opening state a specific outcome, model, contract, or
      symptom.
- [ ] Prerequisites and supported environments are explicit.
- [ ] Code uses current public APIs and realistic value formats.
- [ ] Local and Cloud behavior are distinguished where relevant.
- [ ] The page has one clear source of truth and does not duplicate another
      page.
- [ ] Links lead to the next likely task, supporting concept, exact reference,
      or canonical fix.
- [ ] Frontmatter title and description are unique and accurate.
- [ ] The page contains no placeholders, hidden prerequisites, secrets, or
      unsupported claims.
- [ ] New or changed links, MDX, and examples pass the relevant docs checks.
