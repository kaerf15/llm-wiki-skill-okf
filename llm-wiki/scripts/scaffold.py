#!/usr/bin/env python3
"""
scaffold.py — Bootstrap a new OKF-conformant LLM Wiki bundle.

Usage:
    python3 scaffold.py <bundle-root> "<Topic Title>" [--type research|catalog|operations|general]

Example:
    python3 scaffold.py ~/wikis/wiki-okf "AI Research"
    python3 scaffold.py ~/wikis/my-catalog "Sales Data" --type catalog

Creates an Open Knowledge Format (OKF) v0.1 bundle. Default folder name is
wiki-okf (user may choose any path). Use --type to pick a knowledge-base
profile; if omitted, the agent should ask the user before scaffolding.

KB types:
  research   — concepts/, entities/, summaries/ (Karpathy-style, default)
  catalog    — datasets/, tables/, metrics/ (data catalog pattern)
  operations — playbooks/, runbooks/, references/
  general    — topics/ (minimal, extend as needed)
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime, timezone

OKF_VERSION = "0.1"
DEFAULT_BUNDLE_DIR = "wiki-okf"

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


def scaffold(root: str, title: str, kb_type: str = "research") -> None:
    if kb_type not in KB_TYPES:
        raise ValueError(f"unknown --type {kb_type!r}; choose from: {', '.join(KB_TYPES)}")

    profile = KB_TYPES[kb_type]
    today = date.today()
    today_iso = today.isoformat()
    today_compact = today.strftime("%Y%m%d")
    now_hm = datetime.now().strftime("%H:%M")
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    dirs = [
        "raw/articles",
        "raw/papers",
        "raw/notes",
        "raw/refs",
        "outputs/queries",
        "log",
        "audit",
        "audit/resolved",
        *profile["concept_dirs"],
    ]

    for d in dirs:
        os.makedirs(os.path.join(root, d), exist_ok=True)
    print(f"✓ Created OKF bundle tree under {root}/")

    _write(root, "audit/.gitkeep", "")
    _write(root, "audit/resolved/.gitkeep", "")

    type_lines = "\n".join(
        f"- `{folder}/` → OKF type `{t}`"
        for folder, t in profile["default_types"].items()
    )
    section_list = "\n".join(f"### {s}\n*(none)*\n" for s in ["Concepts", "Entities", "Summaries"] if kb_type == "research")
    if kb_type != "research":
        section_list = "\n".join(f"### {s}\n*(none)*\n" for s in profile["index_sections"])

    agents_md = f"""# {title} Knowledge Base

> Schema document — read at the start of every session together with `index.md`.
> This bundle conforms to [Open Knowledge Format (OKF) v{OKF_VERSION}](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).

## Bundle profile

- **KB type**: `{kb_type}` — {profile["label"]}
- **OKF version**: {OKF_VERSION}
- **Description**: {profile["description"]}

## Scope

What this bundle covers:
- <describe the topic area>

What this bundle deliberately excludes:
- <describe out-of-scope areas>

## Operations

This bundle follows the llm-wiki skill's five operations: `compile`, `ingest`, `query`, `lint`, `audit`.
Every operation appends an entry to `log/YYYYMMDD.md` and may update root `log.md`.

## OKF conventions

- **Required frontmatter**: every concept document MUST have `type:` (non-empty).
- **Recommended frontmatter**: `title`, `description`, `tags`, `timestamp` (ISO 8601).
- **Concept directories** (this profile):
{type_lines}
- **Links**: use OKF absolute bundle-relative paths, e.g. `[Foo](/concepts/Foo.md)`.
- **Index**: root `index.md` declares `okf_version`; subdirectory `index.md` files have no frontmatter.
- **Reserved filenames**: `index.md`, `log.md` — not concept documents.

## Naming conventions

- Concept filenames SHOULD equal `title:` when `title` is set.
- Only root `index.md` uses the reserved name at bundle root; subdirectories MAY have their own `index.md`.
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

*(none — run `python3 scripts/audit_review.py <bundle-root> --open` to refresh)*

## Notes for the LLM

- Language: <en | zh | bilingual>
- Tone: <neutral, academic, conversational, ...>
- Depth: <survey-level | deep technical>
- When creating a new bundle for a user, confirm KB type (`research`, `catalog`, `operations`, `general`) if not specified.
"""
    _write(root, "AGENTS.md", agents_md)
    print("✓ Created AGENTS.md")

    _write(root, "CLAUDE.md", "@AGENTS.md\n")
    print("✓ Created CLAUDE.md compatibility pointer")

    log_md = f"""# {today_iso}

## [{now_hm}] scaffold | Initialized {title} OKF bundle ({kb_type})
- Created OKF v{OKF_VERSION} directory tree
- KB type: {kb_type} ({profile["label"]})
- Created AGENTS.md, index.md, log.md
"""
    _write(root, f"log/{today_compact}.md", log_md)
    print(f"✓ Created log/{today_compact}.md")

    okf_log = f"""# Bundle Update Log

## {today_iso}
* **Initialization**: Created OKF v{OKF_VERSION} bundle for [{title}](/index.md) (type: {kb_type}).
"""
    _write(root, "log.md", okf_log)
    print("✓ Created log.md (OKF update history)")

    nav_links = " · ".join(f"[{s}](#{s.lower().replace(' ', '-').split('(')[0].strip()})" for s in profile["index_sections"])
    index_sections_md = "\n\n".join(
        f"## {s}\n\n*(none yet)*" for s in profile["index_sections"]
    )

    index_md = f"""---
okf_version: "{OKF_VERSION}"
---

# Index — {title}

> One-sentence scope of the bundle.

## 🔖 Navigation
- {nav_links} · [Open Questions](#open-questions)

{index_sections_md}

## Open Questions

- <First research question>
"""
    _write(root, "index.md", index_md)
    print("✓ Created index.md (OKF root index with okf_version)")

    for folder in profile["concept_dirs"]:
        sub_index = f"""# {folder.replace('_', ' ').title()}

*(none yet)*
"""
        _write(root, f"{folder}/index.md", sub_index)

    print(f"""
✅ OKF bundle scaffolded at: {root}/

Profile: {kb_type} ({profile["label"]})
OKF version: {OKF_VERSION}

Next steps:
  1. Fill in AGENTS.md — define scope and conventions
  2. Add sources to raw/ (or: python3 scripts/import_source.py <file> {root})
  3. Run ingest: tell your LLM agent "ingest raw/<file>.md"
  4. Ask questions: "what does the bundle say about X?"
  5. Run lint:  python3 scripts/lint_wiki.py {root}
  6. Process feedback: python3 scripts/audit_review.py {root} --open
""")


def _write(root: str, path: str, content: str) -> None:
    full = os.path.join(root, path)
    os.makedirs(os.path.dirname(full) or ".", exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(content)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("root", help="Bundle root directory (default name suggestion: wiki-okf)")
    parser.add_argument("title", help='Topic title, e.g. "AI Research"')
    parser.add_argument(
        "--type",
        choices=sorted(KB_TYPES.keys()),
        default="research",
        help="Knowledge-base profile (default: research). Ask the user if unsure.",
    )
    return parser.parse_args(argv)


if __name__ == "__main__":
    args = parse_args(sys.argv[1:])
    scaffold(args.root, args.title, args.type)
