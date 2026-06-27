# AGENTS.md Schema Guide

`AGENTS.md` is the **schema document** for an OKF bundle. Every session should start by reading it together with `index.md`.

## OKF bundle profile

Document OKF version in `AGENTS.md`:

```markdown
## Bundle profile
- **OKF version**: 0.1
- **Knowledge folder**: wiki   ← KB_DIR; user may rename
```

Directory layout is fixed: `concepts/`, `entities/`, `summaries/` under KB_DIR.

## Naming conventions

### Concept pages
- Concept filenames SHOULD equal `title:` when `title` is set.
- **Concept pages** (`concepts/`): hub at `concepts/<title>.md`; optional `concepts/<topic>/<aspect>.md`.
- **Entity pages** (`entities/`): `entities/<title>.md`.
- **Summary pages** (`summaries/`): `summaries/<title>.md`.
- Subdirectories MAY have `index.md` for progressive disclosure (OKF §6).

### Links
Use OKF absolute bundle-relative paths:

```markdown
[Market Making Strategy](/concepts/Market%20Making%20Strategy.md)
[Foo](/concepts/Foo.md)
[Karpathy LLM Wiki Gist](/summaries/Karpathy%20LLM%20Wiki%20Gist.md)
```

- Include `.md`. URL-encode spaces.
- Link first mention; at most twice per article.

### Frontmatter (OKF required)

Every concept document MUST have `type:` (non-empty). Recommended: `title`, `description`, `tags`, `timestamp`.

### Diagrams and formulas
- Diagrams: **mermaid** only.
- Formulas: **KaTeX** (`$...$` or `$$...$$`).

## Current articles (example)

```markdown
### Concepts
- [Transformers](/concepts/Transformers.md) — overview
    - [attention](/concepts/Transformers/attention.md) — mechanism

### Entities
- [Andrej Karpathy](/entities/Andrej%20Karpathy.md) — researcher

### Summaries
- [Karpathy LLM Wiki Gist](/summaries/Karpathy%20LLM%20Wiki%20Gist.md) — original Gist (2026-04-09)
```

## Update cadence

- After every new page: add to "Current articles".
- After ingest batch: update research gaps and `log.md`.
- After lint: fix dead links and OKF conformance issues.
- After audit: refresh audit backlog counts.
