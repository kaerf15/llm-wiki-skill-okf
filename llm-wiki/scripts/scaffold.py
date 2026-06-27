#!/usr/bin/env python3
"""
scaffold.py — Bootstrap a new llm-wiki / OKF knowledge project.

Usage:
    python3 scaffold.py <workspace> "<Topic Title>" [--kb-dir wiki]

Example:
    python3 scaffold.py ~/Documents/OKF "AI Research"
    python3 scaffold.py ~/Documents/OKF "My Topic" --kb-dir my-wiki

Layout (only the wiki/ folder name is customizable):

    <workspace>/              ← project root: raw/, log/, audit/, .agents/
    └── wiki/                 ← AI 解析内容（默认名 wiki，用户可改）
        ├── index.md
        ├── concepts/
        ├── entities/
        └── summaries/

Agent: ask user for --kb-dir before running; default wiki only after user confirms.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, datetime

OKF_VERSION = "0.1"
DEFAULT_KB_DIR = "wiki"

CONCEPT_DIRS = ["concepts", "entities", "summaries"]
INDEX_SECTIONS = ["Concepts", "Entities", "Summaries (chronological)"]
OKF_TYPES = {"concepts": "Concept", "entities": "Entity", "summaries": "Summary"}


def yaml_scalar(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def resolve_paths(workspace: str, kb_dir: str) -> tuple[str, str]:
    project = os.path.abspath(workspace)
    if os.path.basename(project) == kb_dir:
        return project, project
    return project, os.path.join(project, kb_dir)


def scaffold(workspace: str, title: str, kb_dir: str = DEFAULT_KB_DIR) -> None:
    project, knowledge = resolve_paths(workspace, kb_dir)
    nested = project != knowledge
    kb_label = kb_dir if nested else os.path.basename(knowledge)
    index_ref = f"{kb_dir}/index.md" if nested else "index.md"

    today = date.today()
    today_iso = today.isoformat()
    today_compact = today.strftime("%Y%m%d")
    now_hm = datetime.now().strftime("%H:%M")

    for d in [
        "raw/articles", "raw/papers", "raw/notes", "raw/refs",
        "outputs/queries", "log", "audit", "audit/resolved",
    ]:
        os.makedirs(os.path.join(project, d), exist_ok=True)

    os.makedirs(knowledge, exist_ok=True)
    for folder in CONCEPT_DIRS:
        os.makedirs(os.path.join(knowledge, folder), exist_ok=True)

    print(f"✓ Project root: {project}/")
    print(f"✓ Knowledge folder: {knowledge}/ ({kb_label})")

    _write(project, "audit/.gitkeep", "")
    _write(project, "audit/resolved/.gitkeep", "")

    type_lines = "\n".join(
        f"- `{folder}/` → OKF type `{t}`" for folder, t in OKF_TYPES.items()
    )
    section_list = "\n".join(f"### {s}\n*(none)*\n" for s in INDEX_SECTIONS)

    agents_md = f"""# {title} Knowledge Base

> Schema document — read at the start of every session together with `{index_ref}`.
> Conforms to [Open Knowledge Format (OKF) v{OKF_VERSION}](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

## Knowledge folder

- **`{kb_label}/`** — AI 解析后的概念页（名称可改，默认 wiki）
- **OKF version**: {OKF_VERSION}

## Scope

What this wiki covers:
- <describe the topic area>

What this wiki deliberately excludes:
- <describe out-of-scope areas>

## Operations

Five operations: `compile`, `ingest`, `query`, `lint`, `audit`.
Every operation appends an entry to `log/YYYYMMDD.md`.

## Conventions

- **Concept directories** (fixed):
{type_lines}
- **Required frontmatter** on concept pages: `type:` (non-empty).
- **Links**: `[Foo](/concepts/Foo.md)` (OKF absolute paths).
- **Index**: `{index_ref}` has `okf_version`, `name`, `description`.

## Naming

- Concept filenames SHOULD equal `title:` when set.
- Large binaries → `raw/refs/<slug>.md` pointer with `type: Reference`.

## Current articles

*None yet — update after every compile.*

{section_list}
## Open research questions

- <What do you want to understand better?>

## Research gaps

- [ ] <source> — why relevant

## Notes for the LLM

- Language: <en | zh | bilingual>
- Tone: <neutral, academic, ...>
"""
    _write(project, "AGENTS.md", agents_md)
    _write(project, "CLAUDE.md", "@AGENTS.md\n")

    _write(project, f"log/{today_compact}.md", f"""# {today_iso}

## [{now_hm}] scaffold | Initialized {title}
- Project root: {project}
- Knowledge folder: {kb_label}/
""")
    _write(knowledge, "log.md", f"""# Bundle Update Log

## {today_iso}
* **Initialization**: [{title}](/index.md)
""")

    nav = " · ".join(
        f"[{s}](#{s.lower().replace(' ', '-').split('(')[0].strip()})" for s in INDEX_SECTIONS
    )
    sections = "\n\n".join(f"## {s}\n\n*(none yet)*" for s in INDEX_SECTIONS)

    _write(knowledge, "index.md", f"""---
okf_version: "{OKF_VERSION}"
name: {yaml_scalar(os.path.basename(knowledge))}
description: {yaml_scalar(f"{title} — llm-wiki knowledge base")}
---

# Index — {title}

> One-sentence scope.

## 🔖 Navigation
- {nav} · [Open Questions](#open-questions)

{sections}

## Open Questions

- <First question>
""")

    if nested:
        _write(project, "BUNDLE.md", f"""# 项目结构

| 路径 | 说明 |
|------|------|
| `{kb_dir}/` | 知识库（内含 concepts/ 等） |
| `raw/` | 原始资料 |
| `audit/` | 人工反馈 |

OKF v{OKF_VERSION}
""")

    for folder in CONCEPT_DIRS:
        _write(knowledge, f"{folder}/index.md", f"# {folder.title()}\n\n*(none yet)*\n")

    print(f"""
✅ 知识库已创建

项目根：{project}/
知识库：{knowledge}/  （`{kb_label}/`：index.md · concepts/ · entities/ · summaries/）

Next: 填 AGENTS.md → raw/ 加资料 → ingest → lint
""")


def _write(root: str, path: str, content: str) -> None:
    full = os.path.join(root, path)
    os.makedirs(os.path.dirname(full) or ".", exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("workspace", help="Project workspace")
    parser.add_argument("title", help='Topic title, e.g. "AI Research"')
    parser.add_argument(
        "--kb-dir",
        default=DEFAULT_KB_DIR,
        help=f"Knowledge subfolder name (default: {DEFAULT_KB_DIR})",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    args = parse_args(sys.argv[1:])
    scaffold(args.workspace, args.title, args.kb_dir)
