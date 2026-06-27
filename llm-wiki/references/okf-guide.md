# OKF Guide — Open Knowledge Format v0.1

This project produces **OKF-conformant knowledge bundles** compatible with [Google Cloud Knowledge Catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog) and any tool that reads Markdown + YAML frontmatter.

Spec: [okf/SPEC.md](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)

## Conformance checklist

A bundle is OKF v0.1 conformant when:

1. Every non-reserved `.md` concept file has parseable YAML frontmatter with non-empty `type:`.
2. Root `index.md` declares `okf_version: "0.1"` in frontmatter.
3. Reserved filenames (`index.md`, `log.md`) follow OKF structure when present.

Soft guidance (lint warns but does not fail): dead links, missing `description`, filename ≠ `title`.

## Directory layout

```
<project-root>/           ← workspace
├── raw/ · log/ · audit/
└── wiki/                 ← KNOWLEDGE_ROOT (default name; user may rename)
    ├── index.md          ← okf_version, name, description
    ├── concepts/         → type: Concept
    ├── entities/         → type: Entity
    └── summaries/        → type: Summary
```

Only the knowledge folder name (`KB_DIR`, default `wiki`) is customizable.

## Frontmatter

```yaml
---
type: Concept                    # REQUIRED — descriptive, self-explanatory string
title: Human-readable name       # Recommended
description: One-line summary    # Recommended — used in index listings
resource: https://...            # Optional — URI of underlying asset
tags: [tag1, tag2]               # Optional
timestamp: 2026-06-28T10:00:00Z  # Optional — ISO 8601 last-modified
---
```

## Links

**Recommended** — OKF absolute (bundle-relative):

```markdown
See [customers table](/concepts/customers.md) for the join key.
```

**Also supported** — relative:

```markdown
See [neighboring concept](./other.md).
```

## Index files

Root `index.md`:

```markdown
---
okf_version: "0.1"
name: my-research
description: One-sentence scope — shown to agents like Skill description.
---

# Index — My Topic

## Concepts
* [Foo](/concepts/Foo.md) — short description from frontmatter
```

Subdirectory `index.md` — **no frontmatter**, lists that folder's contents:

```markdown
# Concepts

* [Foo](/concepts/Foo.md) — one-line summary
```

## Log files

- **`log.md`** — OKF chronological update history at bundle root.
- **`log/YYYYMMDD.md`** — llm-wiki producer extension for per-operation detail.

## Producer extensions

These directories are outside OKF concept scanning:

- `audit/` — human feedback (llm-wiki audit workflow)
- `raw/` — immutable source material
- `log/` — daily operation logs
- `outputs/` — query answers, charts
- `AGENTS.md`, `CLAUDE.md` — schema meta files

## Citations

External sources at the bottom of concept bodies:

```markdown
# Citations

[1] [BigQuery public dataset announcement](https://cloud.google.com/blog/...)
[2] [Internal runbook](https://wiki.internal/data/quality)
```

## Project layout

Workspace = project root (`raw/`, `log/`, `audit/`). AI-compiled OKF content lives in **`<KB_DIR>/`** (default **`wiki/`**). **Always ask the user for KB_DIR before scaffolding**; use default only after they confirm.
