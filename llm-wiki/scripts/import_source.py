#!/usr/bin/env python3
"""
import_source.py — Convert a source file to Markdown under raw/ using MarkItDown.

Usage:
    python3 import_source.py <source-file> <wiki-root> [--kind articles|papers|notes] [--title "Title"]

MarkItDown is an optional dependency:
    python3 -m pip install --user 'markitdown[all]'
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path


VALID_KINDS = {"articles", "papers", "notes"}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "source"


def infer_kind(source: Path) -> str:
    suffix = source.suffix.lower()
    if suffix in {".html", ".htm", ".url", ".webloc"}:
        return "articles"
    if suffix in {".pdf", ".epub"}:
        return "papers"
    return "notes"


def import_source(
    source: Path,
    wiki_root: Path,
    *,
    kind: str | None = None,
    title: str | None = None,
) -> Path:
    source = source.expanduser().resolve()
    wiki_root = wiki_root.expanduser().resolve()

    if not source.exists() or not source.is_file():
        raise ValueError(f"source file does not exist or is not a file: {source}")
    if not wiki_root.exists() or not wiki_root.is_dir():
        raise ValueError(f"wiki root does not exist or is not a directory: {wiki_root}")

    resolved_kind = kind or infer_kind(source)
    if resolved_kind not in VALID_KINDS:
        raise ValueError(f"kind must be one of: {', '.join(sorted(VALID_KINDS))}")

    resolved_title = title or source.stem.replace("_", " ").replace("-", " ").strip()
    slug = slugify(resolved_title)

    markdown = convert_with_markitdown(source)
    out_dir = wiki_root / "raw" / resolved_kind
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = unique_path(out_dir / f"{slug}.md")
    out_path.write_text(
        render_markdown(
            title=resolved_title,
            source=source,
            kind=resolved_kind,
            body=markdown,
        ),
        encoding="utf-8",
    )
    return out_path


def convert_with_markitdown(source: Path) -> str:
    try:
        from markitdown import MarkItDown
    except ImportError as exc:
        raise RuntimeError(
            "MarkItDown is not installed. Install it with: "
            "python3 -m pip install --user 'markitdown[all]'"
        ) from exc

    result = MarkItDown().convert(str(source))
    text = getattr(result, "text_content", None)
    if not text or not str(text).strip():
        raise RuntimeError(f"MarkItDown returned no text for: {source}")
    return str(text).strip() + "\n"


def render_markdown(*, title: str, source: Path, kind: str, body: str) -> str:
    today = date.today().isoformat()
    return f"""---
type: Reference
title: {yaml_scalar(title)}
description: Imported source ({kind}) converted by MarkItDown.
resource: {yaml_scalar(str(source))}
tags: [{kind}, raw-source]
timestamp: {today}T00:00:00Z
raw_kind: {kind}
converted_by: markitdown
---

{body.rstrip()}
"""


def yaml_scalar(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.stem
    suffix = path.suffix
    parent = path.parent
    i = 2
    while True:
        candidate = parent / f"{stem}-{i}{suffix}"
        if not candidate.exists():
            return candidate
        i += 1


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Source file to convert")
    parser.add_argument("wiki_root", type=Path, help="Wiki root containing raw/")
    parser.add_argument(
        "--kind",
        choices=sorted(VALID_KINDS),
        help="Destination raw subfolder. Defaults from file extension.",
    )
    parser.add_argument("--title", help="Title and output filename seed")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        out_path = import_source(
            args.source,
            args.wiki_root,
            kind=args.kind,
            title=args.title,
        )
    except (RuntimeError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(f"Imported source: {out_path}")
    print(f"Next: tell your agent to ingest {out_path.relative_to(args.wiki_root)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
