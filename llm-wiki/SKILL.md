---
name: llm-wiki
description: >-
  Build and maintain an OKF-conformant LLM knowledge base — a self-compiling
  Markdown bundle (Open Knowledge Format v0.1) where an Agent ingests raw
  sources, compiles cross-linked concept pages, answers queries against the
  corpus, lints for OKF health, and audits human feedback from the web viewer.
  Use when the user asks to (1) create/deploy/scaffold a new OKF knowledge base,
  (2) ingest/compile/query/lint/audit an existing bundle. Before creating: ALWAYS
  ask for the knowledge folder name (KB_DIR; default wiki-okf if user confirms default)
  and KB type if omitted (default research). Never scaffold with default KB_DIR without
  asking first unless the user already specified the name in the same request.
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

**Only create when the user asks** (deploy, scaffold, 建知识库, etc.). Do not scaffold proactively.

Read `references/create-guide.md` before every create. **Project directory ≠ knowledge base directory** — never scaffold inside `llm-wiki-skill-okf` tool repo.

### 创建前必问（deploy 提示词 / 直接调 skill 均适用）

**未开始 scaffold 之前**，先向用户确认。用户在本轮消息里**已经明确给出**的项可直接采用，**缺的必须先问**，问完仍无答复才用默认值。

| 项 | 用户本轮已说 | 用户没说 → **必须先问** | 问完仍无答复 |
|----|------------|------------------------|-------------|
| **知识库文件夹名（KB_DIR / `--kb-dir`）** | 用用户给的名称 | 「知识库文件夹叫什么？默认 **wiki-okf**（替代原 wiki/），用默认请直接说“默认”。」 | **`wiki-okf`** |
| **知识库类型（KB_TYPE / `--type`）** | 用对应类型 | 「什么类型？research / catalog / operations / general」 | **`research`** |
| **主题标题** | 用用户标题 | 可从文件夹名推导，或简短问一句 | 从 KB_DIR 推导 |

**禁止**在用户未指定、也未被问过的情况下，静默使用默认 `wiki-okf` 直接创建。

### 解析路径（必遵 — read create-guide.md）

**Project root = workspace。** AI 解析内容在 **`wiki-okf/`**（默认，替代 legacy `wiki/`），内部 OKF 格式。

```
KB_DIR = 用户指定或默认 wiki-okf
if basename(WORKSPACE) == KB_DIR:
  PROJECT_ROOT = KNOWLEDGE_ROOT = WORKSPACE
else:
  PROJECT_ROOT = WORKSPACE
  KNOWLEDGE_ROOT = WORKSPACE / KB_DIR

raw/, log/, audit/, .agents/ → PROJECT_ROOT
index.md, concepts/, entities/, summaries/ → KNOWLEDGE_ROOT
```

Example: workspace `OKF/` + KB_DIR `wiki-okf` → **`OKF/wiki-okf/index.md`** + **`OKF/raw/`**（同级）。

### Types → directory layout

| `--type` | When user says… | Concept dirs |
|----------|-----------------|--------------|
| `research` (**default**) | 研究、论文、通用 wiki | `concepts/`, `entities/`, `summaries/` |
| `catalog` | 数据目录、表、指标 | `datasets/`, `tables/`, `metrics/` |
| `operations` | 运维、SOP、runbook | `playbooks/`, `runbooks/`, `references/` |
| `general` | 最小 starter | `topics/` |

### Create workflow

```bash
python3 scripts/scaffold.py <PROJECT_ROOT> "<Topic Title>" --type <type> --kb-dir wiki-okf
mkdir -p <PROJECT_ROOT>/.agents/skills
cp -R <skill-source>/llm-wiki <PROJECT_ROOT>/.agents/skills/llm-wiki
```

```bash
python3 scripts/scaffold.py ~/Documents/OKF "My Research Topic" --type research
python3 scripts/scaffold.py ~/wikis/sales-catalog "Sales Data" --type catalog --kb-dir sales-catalog
```

Install skill to `<PROJECT_ROOT>/.agents/skills/llm-wiki/` only — see `references/create-guide.md`.

## OKF directory layout

```
<project-root>/           ← workspace (e.g. ~/OKF)
├── raw/ · log/ · audit/
├── AGENTS.md
├── .agents/skills/llm-wiki/
└── wiki-okf/             ← KNOWLEDGE_ROOT (default; replaces legacy wiki/)
    ├── index.md          ← okf_version: "0.1"
    ├── log.md
    ├── concepts/
    ├── entities/
    └── summaries/
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

Root `index.md` is special — it declares `okf_version`, plus **`name`** and **`description`** (like Skill `SKILL.md` for agent discovery). No `type`. Subdirectory `index.md` files have no frontmatter.

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
name: my-research
description: One-sentence scope for agents (like Skill description).
---

# Index — My Topic
```

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

- `references/create-guide.md` — **How to create a bundle (project vs KB path)**
- `references/okf-guide.md` — OKF v0.1 conformance rules
- `references/schema-guide.md` — What to put in `AGENTS.md`
- `references/article-guide.md` — How to write concept pages
- `references/log-guide.md` — The `log/` folder convention
- `references/audit-guide.md` — Audit file format and workflow
- `references/tooling-tips.md` — Web viewer, qmd, deployment
