# AGENTS.md Schema Guide

`AGENTS.md` is the **schema document** for a wiki topic. Every session should start by reading it together with `wiki/index.md`.

## Naming conventions

### Pages
- **Concept pages** (`wiki/concepts/`): Title Case noun phrases.
- **Folder-split concepts**: `wiki/concepts/<topic>/index.md` + aspect files.
- **Entity pages** (`wiki/entities/`): Proper names.
- **Summary pages** (`wiki/summaries/`): kebab-case source slug.

### Links
Use standard Markdown links with paths relative to the wiki root:

```markdown
[Market Making Strategy](wiki/concepts/Market%20Making%20Strategy.md)
[Foo](wiki/concepts/Foo/index.md)
[summaries/karpathy-gist](wiki/summaries/karpathy-gist.md)
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
- [Transformers](wiki/concepts/Transformers/index.md) — overview
    - [attention](wiki/concepts/Transformers/attention.md) — mechanism

### Entities
- [Andrej Karpathy](wiki/entities/Andrej%20Karpathy.md) — researcher

### Summaries
- [karpathy-gist](wiki/summaries/karpathy-gist.md) — original Gist (2026-04-09)
```

## Update cadence

- After every new page: add to "Current articles".
- After ingest batch: update research gaps.
- After lint: fix dead links and orphans.
- After audit: refresh audit backlog counts.
