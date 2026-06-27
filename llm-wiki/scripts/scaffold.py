#!/usr/bin/env python3
"""
scaffold.py — Bootstrap a new OKF-conformant LLM Wiki project.

Usage:
    python3 scaffold.py <workspace> "<Topic Title>" [--type research|catalog|operations|general] [--kb-dir wiki-okf]

Example:
    python3 scaffold.py ~/Documents/OKF "AI Research"
    python3 scaffold.py ~/wikis/my-catalog "Sales Data" --type catalog

Layout (same as legacy llm-wiki, but wiki/ → wiki-okf/ with OKF inside):

    <workspace>/              ← project root (raw/, log/, audit/, .agents/)
    └── wiki-okf/             ← AI 解析内容（原 wiki/，可改名）
        ├── index.md          ← okf_version: "0.1"
        ├── concepts/
        └── ...

If basename(workspace) == kb-dir, knowledge lives at workspace root (no nested subfolder).

Agent: ask user for --kb-dir before running; default wiki-okf only after user confirms.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, datetime, timezone

OKF_VERSION = "0.1"
DEFAULT_KB_DIR = "wiki-okf"


def yaml_scalar(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)

KB_TYPES: dict[str, dict] = {
    "research": {
        "label": "Research Wiki",
        "description": "Karpathy-style research: concepts, entities, summaries",
        "concept_dirs": ["concepts", "entities", "summaries"],
        "default_types": {
            "concepts": "Concept",
            "entities": "Entity",
            "summaries": "Summary",
        },
        "index_sections": ["Concepts", "Entities", "Summaries (chronological)"],
    },
    "catalog": {
        "label": "Data Catalog",
        "description": "Data assets: datasets, tables, metrics",
        "concept_dirs": ["datasets", "tables", "metrics"],
        "default_types": {
            "datasets": "Dataset",
            "tables": "Table",
            "metrics": "Metric",
        },
        "index_sections": ["Datasets", "Tables", "Metrics"],
    },
    "operations": {
        "label": "Operations",
        "description": "Runbooks, playbooks, and operational references",
        "concept_dirs": ["playbooks", "runbooks", "references"],
        "default_types": {
            "playbooks": "Playbook",
            "runbooks": "Runbook",
            "references": "Reference",
        },
        "index_sections": ["Playbooks", "Runbooks", "References"],
    },
    "general": {
        "label": "General",
        "description": "Minimal OKF bundle — add concept folders as needed",
        "concept_dirs": ["topics"],
        "default_types": {"topics": "Topic"},
        "index_sections": ["Topics"],
    },
}


def resolve_paths(workspace: str, kb_dir: str) -> tuple[str, str]:
    """Return (project_root, knowledge_root)."""
    project = os.path.abspath(workspace)
    if os.path.basename(project) == kb_dir:
        return project, project
    knowledge = os.path.join(project, kb_dir)
    return project, knowledge


def scaffold(workspace: str, title: str, kb_type: str = "research", kb_dir: str = DEFAULT_KB_DIR) -> None:
    if kb_type not in KB_TYPES:
        raise ValueError(f"unknown --type {kb_type!r}; choose from: {', '.join(KB_TYPES)}")

    profile = KB_TYPES[kb_type]
    project, knowledge = resolve_paths(workspace, kb_dir)
    nested = project != knowledge
    kb_label = kb_dir if nested else os.path.basename(knowledge)
    index_ref = f"{kb_dir}/index.md" if nested else "index.md"

    today = date.today()
    today_iso = today.isoformat()
    today_compact = today.strftime("%Y%m%d")
    now_hm = datetime.now().strftime("%H:%M")

    producer_dirs = [
        "raw/articles",
        "raw/papers",
        "raw/notes",
        "raw/refs",
        "outputs/queries",
        "log",
        "audit",
        "audit/resolved",
    ]
    for d in producer_dirs:
        os.makedirs(os.path.join(project, d), exist_ok=True)

    os.makedirs(knowledge, exist_ok=True)
    for folder in profile["concept_dirs"]:
        os.makedirs(os.path.join(knowledge, folder), exist_ok=True)

    print(f"✓ Project root: {project}/")
    print(f"✓ Knowledge folder: {knowledge}/ ({kb_label})")

    _write(project, "audit/.gitkeep", "")
    _write(project, "audit/resolved/.gitkeep", "")

    type_lines = "\n".join(
        f"- `{folder}/` → OKF type `{t}`"
        for folder, t in profile["default_types"].items()
    )
    section_list = "\n".join(f"### {s}\n*(none)*\n" for s in profile["index_sections"])

    agents_md = f"""# {title} Knowledge Base

> Schema document — read at the start of every session together with `{index_ref}`.
> This bundle conforms to [Open Knowledge Format (OKF) v{OKF_VERSION}](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

## Bundle profile

- **KB type**: `{kb_type}` — {profile["label"]}
- **Knowledge folder**: `{kb_label}/` (AI 解析后的概念页；原 legacy 的 `wiki/` 目录)
- **OKF version**: {OKF_VERSION}
- **Description**: {profile["description"]}

## Scope

What this bundle covers:
- <describe the topic area>

What this bundle deliberately excludes:
- <describe out-of-scope areas>

## Operations

This bundle follows the llm-wiki skill's five operations: `compile`, `ingest`, `query`, `lint`, `audit`.
Every operation appends an entry to `log/YYYYMMDD.md` and may update `{index_ref.replace('index.md', 'log.md') if nested else 'log.md'}`.

## OKF conventions

- **Required frontmatter**: every concept document MUST have `type:` (non-empty).
- **Recommended frontmatter**: `title`, `description`, `tags`, `timestamp` (ISO 8601).
- **Concept directories** (this profile):
{type_lines}
- **Links**: use OKF absolute paths, e.g. `[Foo](/concepts/Foo.md)`.
- **Index**: `{index_ref}` declares `okf_version`; subdirectory `index.md` files have no frontmatter.

## Naming conventions

- Concept filenames SHOULD equal `title:` when `title` is set.
- Large binaries → pointer at `raw/refs/<slug>.md` with `type: Reference` and `resource:` URI.

## Current articles

*None yet — update after every compile.*

{section_list}
## Open research questions

- <What do you want to understand better?>

## Research gaps

Sources to ingest:
- [ ] <URL or paper title> — why it's relevant

## Audit backlog

*(none — run `python3 scripts/audit_review.py {project} --open` to refresh)*

## Notes for the LLM

- Language: <en | zh | bilingual>
- Tone: <neutral, academic, conversational, ...>
- Depth: <survey-level | deep technical>
"""
    _write(project, "AGENTS.md", agents_md)
    print("✓ Created AGENTS.md")

    _write(project, "CLAUDE.md", "@AGENTS.md\n")
    print("✓ Created CLAUDE.md")

    log_md = f"""# {today_iso}

## [{now_hm}] scaffold | Initialized {title} OKF project ({kb_type})
- Project root: {project}
- Knowledge folder: {kb_label}/
- Created AGENTS.md, {index_ref}, log.md
"""
    _write(project, f"log/{today_compact}.md", log_md)
    print(f"✓ Created log/{today_compact}.md")

    okf_log = f"""# Bundle Update Log

## {today_iso}
* **Initialization**: Created OKF v{OKF_VERSION} bundle for [{title}](/index.md) (type: {kb_type}).
"""
    _write(knowledge, "log.md", okf_log)
    print("✓ Created log.md (OKF update history)")

    nav_links = " · ".join(
        f"[{s}](#{s.lower().replace(' ', '-').split('(')[0].strip()})" for s in profile["index_sections"]
    )
    index_sections_md = "\n\n".join(f"## {s}\n\n*(none yet)*" for s in profile["index_sections"])

    kb_name = os.path.basename(knowledge)
    index_md = f"""---
okf_version: "{OKF_VERSION}"
name: {yaml_scalar(kb_name)}
description: {yaml_scalar(f"OKF knowledge base — {title}")}
---

# Index — {title}

> One-sentence scope of the bundle.

## 🔖 Navigation
- {nav_links} · [Open Questions](#open-questions)

{index_sections_md}

## Open Questions

- <First research question>
"""
    _write(knowledge, "index.md", index_md)
    print("✓ Created index.md (OKF root index with okf_version)")

    if nested:
        bundle_md = f"""# 项目结构

| 路径 | 用途 |
|------|------|
| `{kb_dir}/` | **AI 解析后的知识**（原 `wiki/` 目录，OKF 格式） |
| `{kb_dir}/index.md` | 知识库总索引 |
| `{kb_dir}/concepts/` 等 | 概念页（ingest 后才有内容） |
| `raw/` | 原始资料 |
| `audit/` | 人工反馈 |
| `.agents/skills/llm-wiki/` | Agent skill |

- **类型**：{kb_type}（{profile["label"]}）
- **OKF 版本**：{OKF_VERSION}
"""
        _write(project, "BUNDLE.md", bundle_md)
        print("✓ Created BUNDLE.md")

    for folder in profile["concept_dirs"]:
        sub_index = f"""# {folder.replace('_', ' ').title()}

*(none yet)*
"""
        _write(knowledge, f"{folder}/index.md", sub_index)

    print(f"""
✅ 知识库项目已创建

项目根（workspace）：
  {project}/

AI 解析内容（OKF 知识目录）：
  {knowledge}/

左侧应看到 `{kb_label}/` 文件夹（内有 index.md、concepts/），以及同级的 raw/、audit/。
ingest 之前 concept 目录为空是正常的。

Profile: {kb_type} ({profile["label"]})
OKF version: {OKF_VERSION}

Next steps:
  1. Fill in AGENTS.md — define scope and conventions
  2. Add sources to raw/ (or: python3 scripts/import_source.py <file> {project})
  3. Run ingest: tell your LLM agent "ingest raw/<file>.md"
  4. Run lint:  python3 scripts/lint_wiki.py {project}
  5. Process feedback: python3 scripts/audit_review.py {project} --open
""")


def _write(root: str, path: str, content: str) -> None:
    full = os.path.join(root, path)
    os.makedirs(os.path.dirname(full) or ".", exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("workspace", help="Project workspace the user opened")
    parser.add_argument("title", help='Topic title, e.g. "AI Research"')
    parser.add_argument(
        "--type",
        choices=sorted(KB_TYPES.keys()),
        default="research",
        help="Knowledge-base profile (default: research)",
    )
    parser.add_argument(
        "--kb-dir",
        default=DEFAULT_KB_DIR,
        help=f"Knowledge subfolder name — replaces legacy wiki/ (default: {DEFAULT_KB_DIR})",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    args = parse_args(sys.argv[1:])
    scaffold(args.workspace, args.title, args.type, args.kb_dir)
