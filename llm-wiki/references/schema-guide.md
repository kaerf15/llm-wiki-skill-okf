# AGENTS.md Schema Guide

`AGENTS.md` is the **schema document** for a wiki topic. Every session should start by reading it together with `wiki/index.md`.

## Naming conventions

### Pages
- **All wiki pages** (except `wiki/index.md`): the `.md` filename must equal `title:` in frontmatter.
- **Concept pages** (`wiki/concepts/`): hub at `wiki/concepts/<title>.md`; optional `wiki/concepts/<topic>/<aspect-title>.md`.
- **Entity pages** (`wiki/entities/`): `wiki/entities/<title>.md`.
- **Summary pages** (`wiki/summaries/`): `wiki/summaries/<title>.md` — not kebab-case slugs.
- No subfolder `index.md` — only `wiki/index.md` exists.

### Links
Use standard Markdown links with paths relative to the wiki root:

```markdown
[Market Making Strategy](wiki/concepts/Market%20Making%20Strategy.md)
[Foo](wiki/concepts/Foo.md)
[Karpathy LLM Wiki Gist](wiki/summaries/Karpathy%20LLM%20Wiki%20Gist.md)
```

- Include `.md` in paths.
- URL-encode spaces.
- Link first mention; at most twice per article.

### Frontmatter

Every wiki page has YAML frontmatter: `title`, `type`, `created`, `updated`, `sources`, `tags`.

### Diagrams and formulas
- Diagrams: **mermaid** only.
- Formulas: **KaTeX** (`$...$` or `$$...$$`).

## Current articles (example)

```markdown
### Concepts
- [Transformers](wiki/concepts/Transformers.md) — overview
    - [attention](wiki/concepts/Transformers/attention.md) — mechanism

### Entities
- [Andrej Karpathy](wiki/entities/Andrej%20Karpathy.md) — researcher

### Summaries
- [Karpathy LLM Wiki Gist](wiki/summaries/Karpathy%20LLM%20Wiki%20Gist.md) — original Gist (2026-04-09)
```

## Update cadence

- After every new page: add to "Current articles".
- After ingest batch: update research gaps.
- After lint: fix dead links and orphans.
- After audit: refresh audit backlog counts.
