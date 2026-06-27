---
name: llm-wiki
description: >-
  Build and maintain an OKF-conformant LLM knowledge base — a self-compiling
  Markdown bundle (Open Knowledge Format v0.1) where an Agent ingests raw
  sources, compiles cross-linked concept pages, answers queries against the
  corpus, lints for OKF health, and audits human feedback from the web viewer.
  Use when (1) scaffolding a new OKF bundle (default folder wiki-okf), (2)
  choosing or confirming a knowledge-base type (research/catalog/operations/general),
  (3) ingesting articles/papers/PDFs into raw/, (4) compiling wiki concepts,
  (5) answering questions and filing durable answers, (6) running lint passes,
  (7) processing audit feedback. Not for general note-taking or daily journals.
---

# LLM Wiki — OKF Knowledge Base Pattern

> **Experimental skill — iterating.**
> Authored by lym <973007435@qq.com> · [GitHub](https://github.com/kaerf15) · Conforms to [Open Knowledge Format v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) · Inspired by [Karpathy's llm-wiki Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

## Core idea

Instead of RAG (re-retrieving raw docs on every query), the LLM **compiles** raw sources into a persistent, cross-linked **OKF bundle**. Every ingest, query, lint, and audit pass makes the bundle richer. Knowledge compounds — and the human stays in the loop via structured feedback.

- **You** own: sourcing raw material, asking good questions, steering direction, choosing the KB type, filing feedback.
- **LLM** owns: all writing, cross-referencing, filing, bookkeeping, and acting on your feedback.

The bundle is a living artifact with **five operations** — `compile`, `ingest`, `query`, `lint`, `audit`. Every session starts by reading `AGENTS.md` and `index.md`.

## Starting a new bundle

**Default folder name**: `wiki-okf` (user may choose any path).

**Before scaffolding**, confirm the knowledge-base type with the user if not specified:

| `--type` | Use case | Concept folders |
|----------|----------|-----------------|
| `research` (default) | Papers, articles, general research | `concepts/`, `entities/`, `summaries/` |
| `catalog` | Data assets, tables, metrics | `datasets/`, `tables/`, `metrics/` |
| `operations` | Runbooks, playbooks, SOPs | `playbooks/`, `runbooks/`, `references/` |
| `general` | Minimal starter | `topics/` |

```bash
python3 scripts/scaffold.py ~/wikis/wiki-okf "My Research Topic"
python3 scripts/scaffold.py ~/wikis/sales-catalog "Sales Data" --type catalog
```

Install skill to `<bundle-root>/.agents/skills/llm-wiki/` (see project README).

## OKF directory layout

```
<bundle-root>/          ← default name: wiki-okf
├── index.md            ← Root index (okf_version: "0.1" in frontmatter)
├── log.md              ← OKF update history (optional)
├── AGENTS.md           ← Schema: scope, KB type, conventions
├── CLAUDE.md           ← Compatibility pointer: @AGENTS.md
├── .agents/skills/llm-wiki/
├── log/                ← Per-day operation log (producer extension)
├── audit/              ← Human feedback inbox
├── raw/                ← Immutable source documents
├── concepts/           ← OKF concepts (type varies by KB profile)
├── entities/
├── summaries/
└── outputs/queries/    ← Query answers (promote durable ones to concepts/)
```

Folder names depend on `--type`. See `references/okf-guide.md` for full OKF rules.

`AGENTS.md` is the **schema file**. Read `references/schema-guide.md` and `references/okf-guide.md`. Read both at session start together with `index.md`.

## OKF frontmatter (required)

Every concept document MUST have YAML frontmatter with a non-empty `type`:

```yaml
---
type: Concept
title: Transformers
description: One-sentence summary for index listings.
tags: [nlp, architecture]
timestamp: 2026-06-28T10:00:00Z
---
```

Recommended fields: `title`, `description`, `tags`, `timestamp`, `resource` (URI for bound assets).

Root `index.md` is special — it declares `okf_version: "0.1"` and has no `type`. Subdirectory `index.md` files have no frontmatter.

## Core principles

Four rules govern everything below. If a future instruction contradicts one, flag it to the user before acting.

### 1. Divide and conquer — flat structure

Target **400–1200 words per concept page**. When a topic would blow past that:

- Prefer a **named hub file**: `concepts/<Topic>.md` where **filename equals `title:`**.
- Only if needed, add a **shallow** aspect folder: `concepts/<Topic>/<aspect>.md` (one extra level max).
- Subdirectories MAY have their own `index.md` (OKF progressive disclosure).
- Keep paths shallow. No deep nesting.

On `compile`, flatten legacy `wiki/` layouts if migrating, merge duplicates, update links to OKF absolute form.

### 2. Mermaid for diagrams, KaTeX for formulas

- Flows, sequences, hierarchies → **mermaid** (never ASCII art).
- Formulas → **KaTeX** (`$...$` or `$$...$$`).

Both render in the web viewer.

### 3. Raw file policy

Small text sources → copy into `raw/<subfolder>/`.

Document sources → convert with MarkItDown:

```bash
python3 -m pip install --user 'markitdown[all]'
python3 scripts/import_source.py <source-file> <bundle-root> --kind papers
```

Large binaries → pointer at `raw/refs/<slug>.md` with `type: Reference` and `resource:` URI.

### 4. Audit is the human feedback surface

Humans file feedback via the **web viewer** or `audit/*.md`. The AI **must** periodically run the `audit` op. See `references/audit-guide.md`.

---

## Link format — OKF absolute (recommended)

Use bundle-relative absolute paths starting with `/`:

```markdown
[Transformers](/concepts/Transformers.md)
[Brand Reconnaissance](/concepts/Brand%20Reconnaissance.md)
[Andrej Karpathy](/entities/Andrej%20Karpathy.md)
[Karpathy LLM Wiki Gist](/summaries/Karpathy%20LLM%20Wiki%20Gist.md)
[external ref](/raw/refs/large-dataset.md)
```

Rules:
- Prefer `/concepts/...` absolute paths (stable when files move within subdirs).
- Include `.md`. URL-encode spaces (`%20`).
- Legacy `wiki/...` links still resolve in the web viewer.
- Link first mention of every entity or concept; at most twice per article.
- External citations go under `# Citations` per OKF convention.

The web viewer renders display text only, resolves dead links, shows **backlinks**, and provides a knowledge graph.

---

## The five operations

Every action appends an entry to `log/YYYYMMDD.md`.

### 1. `compile`

(Re)structure concepts from existing `raw/` material.

**Steps**: read schema + index → split oversized pages → merge duplicates → rebuild `index.md` → update `log.md` → log.

### 2. `ingest`

Add a new source. **One source typically touches 5–15 concept pages.**

**Steps**: save to `raw/` → read source → create summary → create/update concept pages (each with OKF `type:`) → update `index.md` → log.

### 3. `query`

Answer a question **grounded in the bundle**.

**Steps**: scan `index.md` → read relevant pages → follow one level of outbound links → synthesize with inline citations like `[Concept](/concepts/Concept.md)` → save to `outputs/queries/` → promote durable answers → log.

### 4. `lint`

```bash
python3 scripts/lint_wiki.py <bundle-root>
```

Reports: OKF conformance, dead links, orphans, missing index entries, audit shape.

### 5. `audit`

Process human feedback from `audit/`. See `references/audit-guide.md`.

---

## Tooling

| Tool | Purpose |
|------|---------|
| **`web/`** | Local preview — mermaid, KaTeX, backlinks, graph, feedback → `audit/` |
| `scripts/scaffold.py` | Bootstrap OKF bundle (`--type research\|catalog\|operations\|general`) |
| `scripts/lint_wiki.py` | OKF + graph health check |
| `scripts/audit_review.py` | Group open/resolved audits by target file |
| [qmd](https://github.com/tobi/qmd) | Optional local semantic search (>100 pages) |

## `index.md` format

```markdown
---
okf_version: "0.1"
---

# Index — <Topic>

> One-sentence scope.

## 🔖 Navigation
- [Concepts](#concepts) · [Entities](#entities) · [Summaries](#summaries)

## Concepts
* [Foo](/concepts/Foo.md) — one-line summary
* [Bar](/concepts/Bar.md) — hub page

## Entities
* [Andrej Karpathy](/entities/Andrej%20Karpathy.md) — AI researcher

## Summaries (chronological)
* [Karpathy LLM Wiki Gist](/summaries/Karpathy%20LLM%20Wiki%20Gist.md) — original Gist

## Open Questions
- Q1: ...
```

## References

- `references/okf-guide.md` — OKF v0.1 conformance rules
- `references/schema-guide.md` — What to put in `AGENTS.md`
- `references/article-guide.md` — How to write concept pages
- `references/log-guide.md` — The `log/` folder convention
- `references/audit-guide.md` — Audit file format and workflow
- `references/tooling-tips.md` — Web viewer, qmd, deployment
