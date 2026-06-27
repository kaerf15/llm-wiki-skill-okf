# OKF Guide — Open Knowledge Format v0.1

This project produces **OKF-conformant knowledge bundles** compatible with [Google Cloud Knowledge Catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog) and any tool that reads Markdown + YAML frontmatter.

Spec: [okf/SPEC.md](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)

## Conformance checklist

A bundle is OKF v0.1 conformant when:

1. Every non-reserved `.md` concept file has parseable YAML frontmatter with non-empty `type:`.
2. Root `index.md` declares `okf_version: "0.1"` in frontmatter.
3. Reserved filenames (`index.md`, `log.md`) follow OKF structure when present.

Soft guidance (lint warns but does not fail): dead links, missing `description`, filename ≠ `title`.

## Bundle vs legacy layout

| | OKF (this skill) | Legacy Karpathy |
|--|------------------|-----------------|
| Root index | `index.md` with `okf_version` | `wiki/index.md` |
| Concepts | `concepts/Foo.md` | `wiki/concepts/Foo.md` |
| Links | `/concepts/Foo.md` | `wiki/concepts/Foo.md` |
| Log history | `log.md` + `log/YYYYMMDD.md` | `log/YYYYMMDD.md` only |
| Required field | `type` | `title` + `type` |

The web viewer and linter support **both** layouts for migration.

## Knowledge-base types

When scaffolding, pick a profile with `--type` or ask the user:

### research (default)

Karpathy-style research wiki.

```
concepts/   → type: Concept
entities/   → type: Entity
summaries/  → type: Summary
```

### catalog

Data catalog pattern (BigQuery-style OKF examples).

```
datasets/  → type: Dataset
tables/    → type: Table
metrics/   → type: Metric
```

### operations

Operational knowledge.

```
playbooks/    → type: Playbook
runbooks/     → type: Runbook
references/   → type: Reference
```

### general

Minimal starter — extend folders as the domain grows.

```
topics/  → type: Topic
```

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

`type` values are not centrally registered. Pick values that describe the concept clearly. Consumers MUST tolerate unknown types.

## Links

**Recommended** — OKF absolute (bundle-relative):

```markdown
See [customers table](/tables/customers.md) for the join key.
```

**Also supported** — relative:

```markdown
See [neighboring concept](./other.md).
```

**Legacy** (still resolves):

```markdown
[Old link](wiki/concepts/Foo.md)
```

## Index files

Root `index.md`:

```markdown
---
okf_version: "0.1"
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

## Workspace = bundle root

The user opens a dedicated folder (e.g. `~/Documents/OKF/`) as their Cursor workspace — that folder **is** the bundle root. Do not create nested `wiki/` or `wiki-okf/` subfolders. Legacy `wiki/concepts/` migrates to root-level `concepts/`.
