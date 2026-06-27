#!/usr/bin/env python3
"""
lint_wiki.py — Health check for an OKF-conformant LLM Wiki bundle.

Usage:
    python3 lint_wiki.py <bundle-root>

Example:
    python3 lint_wiki.py ~/Documents/OKF

Checks:
  1. Dead links — markdown links to missing concept files
  2. Orphan pages — concept pages with no inbound links
  3. Missing index entries — concepts not listed in root index.md
  4. OKF frontmatter — every concept has non-empty type:
  5. Title/filename alignment — stem matches frontmatter title when set
  6. Frequently-linked missing pages — linked 3+ times but no page
  7. log/ shape — YYYYMMDD.md files with correct H1
  8. audit/ shape — valid AuditEntry frontmatter
  9. Audit targets — open audit target files exist

Supports OKF v0.1 layout (concepts at bundle root) and legacy wiki/ layout.

Exit codes:
  0 — no issues found
  1 — issues found (printed to stdout)
"""

from __future__ import annotations

import os
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote

OKF_VERSION = "0.1"
BUNDLE_EXCLUDE_DIRS = {"audit", "raw", "log", "outputs", ".agents", ".git", "node_modules"}
BUNDLE_META_FILES = {"AGENTS.md", "CLAUDE.md"}
OKF_RESERVED = {"index.md", "log.md"}
LEGACY_WIKI = "wiki"

MD_LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")
LOG_FILENAME_RE = re.compile(r"^(\d{4})(\d{2})(\d{2})\.md$")
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)

AUDIT_REQUIRED_FIELDS = {
    "id", "target", "target_lines", "anchor_before", "anchor_text",
    "anchor_after", "severity", "author", "source", "created", "status",
}
VALID_SEVERITIES = {"info", "suggest", "warn", "error"}
VALID_STATUSES = {"open", "resolved"}
VALID_SOURCES = {"web-viewer", "manual"}


def is_okf_bundle(root_path: Path) -> bool:
    index = root_path / "index.md"
    if index.exists():
        text = index.read_text(encoding="utf-8")
        if re.search(r"^okf_version:\s*", text, re.M):
            return True
    legacy = root_path / LEGACY_WIKI
    if legacy.exists() and legacy.is_dir():
        return False
    return index.exists()


def concept_scan_root(root_path: Path) -> Path:
    """Directory containing concept .md files to lint."""
    if is_okf_bundle(root_path):
        return root_path
    legacy = root_path / LEGACY_WIKI
    return legacy if legacy.exists() else root_path


def collect_concept_files(root_path: Path) -> list[Path]:
    """All navigable concept .md files in the bundle."""
    out: list[Path] = []

    def walk(dir_path: Path) -> None:
        for p in sorted(dir_path.iterdir()):
            if p.name.startswith("."):
                continue
            rel_parts = p.relative_to(root_path).parts
            if any(part in BUNDLE_EXCLUDE_DIRS for part in rel_parts):
                continue
            if p.is_dir():
                walk(p)
            elif p.suffix == ".md" and p.name not in BUNDLE_META_FILES:
                rel = p.relative_to(root_path).as_posix()
                if rel.startswith("audit/") or rel.startswith("raw/") or rel.startswith("outputs/"):
                    continue
                out.append(p)

    walk(root_path)
    return out


def is_concept_document(rel: str) -> bool:
    base = Path(rel).name
    if base in BUNDLE_META_FILES:
        return False
    if rel.startswith("audit/") or rel.startswith("raw/") or rel.startswith("outputs/"):
        return False
    if base == "index.md":
        return False
    if base == "log.md":
        return False
    return base.endswith(".md")


def load_pages(scan_root: Path, root_path: Path) -> dict[str, Path]:
    pages: dict[str, Path] = {}
    for p in collect_concept_files(root_path):
        rel = p.relative_to(root_path).as_posix()
        pages[rel] = p
        pages[rel.removesuffix(".md")] = p
        pages[p.stem] = p
    return pages


def is_external_href(href: str) -> bool:
    return bool(re.match(r"^(https?:|mailto:|#)", href, re.I))


def resolve_link_href(root_path: Path, from_rel: str, href: str) -> str | None:
    href = unquote(href.strip())
    if not href or is_external_href(href):
        return None

    path_part = href.split("#", 1)[0]
    if not path_part:
        return None

    candidate = path_part.replace("\\", "/")
    if not candidate.endswith(".md"):
        candidate += ".md"

    if candidate.startswith("/"):
        full = root_path / candidate.lstrip("/")
    elif candidate.startswith("wiki/") or candidate.startswith("raw/"):
        full = root_path / candidate
    elif candidate.startswith(("concepts/", "entities/", "summaries/", "datasets/",
                               "tables/", "metrics/", "playbooks/", "runbooks/",
                               "references/", "topics/")):
        full = root_path / candidate
    else:
        from_path = root_path / from_rel
        full = (from_path.parent / candidate).resolve()

    try:
        rel = full.relative_to(root_path.resolve()).as_posix()
    except ValueError:
        return None
    if rel.startswith(".."):
        return None
    return rel


def extract_md_links(text: str) -> list[tuple[str, str]]:
    return [(m.group(1), m.group(2)) for m in MD_LINK_RE.finditer(text)]


def parse_frontmatter(text: str) -> dict | None:
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None
    body = m.group(1)
    result: dict = {}
    lines = body.split("\n")
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            i += 1
            continue
        if ":" not in line:
            i += 1
            continue
        key, _, rest = line.partition(":")
        key = key.strip()
        val = rest.strip()
        if val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            if not inner:
                result[key] = []
            else:
                parts = [p.strip() for p in inner.split(",")]
                parsed: list = []
                for p in parts:
                    if p.isdigit() or (p.startswith("-") and p[1:].isdigit()):
                        parsed.append(int(p))
                    else:
                        parsed.append(p.strip('"').strip("'"))
                result[key] = parsed
        elif val.startswith('"') and val.endswith('"'):
            result[key] = val[1:-1].replace("\\n", "\n").replace('\\"', '"')
        elif val.startswith("'") and val.endswith("'"):
            result[key] = val[1:-1]
        else:
            result[key] = val.strip('"').strip("'")
        i += 1
    return result


def frontmatter_title(text: str) -> str | None:
    fm = parse_frontmatter(text)
    if not fm or "title" not in fm:
        return None
    title = fm["title"]
    if title is None:
        return None
    return str(title).strip()


def is_concept_link(rel: str, root_path: Path) -> bool:
    if rel.startswith("raw/"):
        return False
    if rel.startswith("audit/") or rel.startswith("outputs/"):
        return False
    if rel.startswith(f"{LEGACY_WIKI}/"):
        return True
    return is_concept_document(rel) or rel.endswith("/index.md") or rel == "index.md"


def should_skip_md_scan(root_path: Path, md_file: Path) -> bool:
    """Skip producer extensions and meta files when scanning markdown for links."""
    rel = md_file.relative_to(root_path).as_posix()
    if any(part in BUNDLE_EXCLUDE_DIRS for part in md_file.relative_to(root_path).parts):
        return True
    if md_file.name in BUNDLE_META_FILES:
        return True
    if "audit" in md_file.parts and md_file.parent.name in {"audit", "resolved"}:
        return True
    return False


def lint(root: str) -> int:
    root_path = Path(root)
    log_path = root_path / "log"
    audit_path = root_path / "audit"
    okf = is_okf_bundle(root_path)
    index_path = root_path / ("index.md" if okf else f"{LEGACY_WIKI}/index.md")

    concept_files = collect_concept_files(root_path)
    if not concept_files and not index_path.exists():
        print(f"ERROR: no concept files or index found at {root_path}", file=sys.stderr)
        return 1

    pages = load_pages(concept_scan_root(root_path), root_path)
    layout = "OKF v0.1" if okf else "legacy wiki/"
    print(f"Bundle layout: {layout}")

    issues = 0
    inbound: dict[str, list[str]] = defaultdict(list)

    # ── Pass 0: OKF conformance ─────────────────────────────────────────
    if okf:
        okf_issues: list[str] = []
        index_text = index_path.read_text(encoding="utf-8") if index_path.exists() else ""
        if not re.search(r'^okf_version:\s*["\']?' + OKF_VERSION, index_text, re.M):
            okf_issues.append(f"   {index_path.relative_to(root_path)} — missing or wrong okf_version: \"{OKF_VERSION}\"")

        missing_type: list[Path] = []
        for p in concept_files:
            rel = p.relative_to(root_path).as_posix()
            if not is_concept_document(rel):
                continue
            fm = parse_frontmatter(p.read_text(encoding="utf-8"))
            if not fm or not fm.get("type") or not str(fm["type"]).strip():
                missing_type.append(p)

        if missing_type:
            print(f"\n🔴 OKF concepts missing required type: ({len(missing_type)})")
            for p in missing_type:
                print(f"   {p.relative_to(root_path)}")
            issues += len(missing_type)
        elif okf_issues:
            print(f"\n🟡 OKF metadata issues ({len(okf_issues)}):")
            for s in okf_issues:
                print(s)
            issues += len(okf_issues)
        else:
            print("✅ OKF frontmatter conformance OK")
    else:
        print("ℹ️  Legacy layout — skipping OKF type check")

    # ── Pass 1: dead links ──────────────────────────────────────────────
    dead_links: list[tuple[str, str, str]] = []
    for md_file in root_path.rglob("*.md"):
        if should_skip_md_scan(root_path, md_file):
            continue
        rel_from_root = md_file.relative_to(root_path).as_posix()
        text = md_file.read_text(encoding="utf-8")
        for _text, href in extract_md_links(text):
            resolved = resolve_link_href(root_path, rel_from_root, href)
            if not resolved or not is_concept_link(resolved, root_path):
                continue
            full = root_path / resolved
            if full.exists() and full.is_file():
                stem_key = resolved.removesuffix(".md")
                inbound[stem_key].append(rel_from_root)
                inbound[Path(resolved).stem].append(rel_from_root)
            elif resolved in pages or Path(resolved).stem in pages:
                target = pages.get(resolved) or pages.get(Path(resolved).stem)
                if target:
                    inbound[target.stem].append(rel_from_root)
            else:
                dead_links.append((rel_from_root, _text or href, href))

    if dead_links:
        print(f"\n🔴 Dead links ({len(dead_links)}):")
        for source, label, href in dead_links:
            print(f"   {source} → [{label}]({href})")
        issues += len(dead_links)
    else:
        print("✅ No dead links")

    # ── Pass 2: orphan pages ────────────────────────────────────────────
    skip_orphan = {"index"}
    orphans = [
        p for p in concept_files
        if is_concept_document(p.relative_to(root_path).as_posix())
        and p.stem not in inbound
        and p.stem not in skip_orphan
    ]
    if orphans:
        print(f"\n🟡 Orphan pages ({len(orphans)}) — no inbound links:")
        for p in orphans:
            print(f"   {p.relative_to(root_path)}")
        issues += len(orphans)
    else:
        print("✅ No orphan pages")

    # ── Pass 3: missing index entries ───────────────────────────────────
    if index_path.exists():
        index_text = index_path.read_text(encoding="utf-8")
        not_in_index = []
        for p in concept_files:
            rel = p.relative_to(root_path).as_posix()
            if not is_concept_document(rel):
                continue
            stem = p.stem
            if rel not in index_text and rel.removesuffix(".md") not in index_text and stem not in index_text:
                not_in_index.append(p)
        if not_in_index:
            print(f"\n🟡 Pages missing from index.md ({len(not_in_index)}):")
            for p in not_in_index:
                print(f"   {p.relative_to(root_path)}")
            issues += len(not_in_index)
        else:
            print("✅ All concepts listed in index.md")
    else:
        print("⚠️  index.md not found — skipping index check")

    # ── Pass 4: title/filename alignment ────────────────────────────────
    title_mismatches: list[tuple[Path, str]] = []
    missing_titles: list[Path] = []
    for p in concept_files:
        rel = p.relative_to(root_path).as_posix()
        if not is_concept_document(rel):
            continue
        text = p.read_text(encoding="utf-8")
        title = frontmatter_title(text)
        if not title:
            if okf:
                continue  # OKF allows title from filename
            missing_titles.append(p)
            continue
        if p.stem != title:
            title_mismatches.append((p, title))

    if missing_titles:
        print(f"\n🟡 Concept pages missing title ({len(missing_titles)}):")
        for p in missing_titles:
            print(f"   {p.relative_to(root_path)}")
        issues += len(missing_titles)
    if title_mismatches:
        print(f"\n🟡 Filename/title mismatches ({len(title_mismatches)}):")
        for p, title in title_mismatches:
            print(f"   {p.relative_to(root_path)} — title: {title!r}, filename: {p.stem!r}")
        issues += len(title_mismatches)
    if not missing_titles and not title_mismatches:
        print("✅ Filenames align with titles")

    # ── Pass 5: frequently linked but missing ───────────────────────────
    link_counts: dict[str, int] = defaultdict(int)
    for md_file in root_path.rglob("*.md"):
        if should_skip_md_scan(root_path, md_file):
            continue
        rel_from_root = md_file.relative_to(root_path).as_posix()
        text = md_file.read_text(encoding="utf-8")
        for _text, href in extract_md_links(text):
            resolved = resolve_link_href(root_path, rel_from_root, href)
            if resolved and is_concept_link(resolved, root_path):
                link_counts[resolved] += 1

    missing_pages = [
        (link, count) for link, count in link_counts.items()
        if count >= 3 and not (root_path / link).exists()
    ]
    if missing_pages:
        print(f"\n🟡 Frequently linked but no page ({len(missing_pages)}):")
        for link, count in sorted(missing_pages, key=lambda x: -x[1]):
            print(f"   [{link}]({link}) — mentioned {count}x")
        issues += len(missing_pages)
    else:
        print("✅ No frequently-linked missing pages")

    # ── Pass 6: log/ shape ──────────────────────────────────────────────
    if log_path.exists() and log_path.is_dir():
        log_issues: list[str] = []
        for p in sorted(log_path.iterdir()):
            if p.is_dir() or p.name == ".gitkeep":
                continue
            m = LOG_FILENAME_RE.match(p.name)
            if not m:
                log_issues.append(f"   {p.relative_to(root_path)} — filename doesn't match YYYYMMDD.md")
                continue
            y, mo, d = m.groups()
            iso = f"{y}-{mo}-{d}"
            first_line = p.read_text(encoding="utf-8").splitlines()[:1]
            if not first_line or first_line[0].strip() != f"# {iso}":
                log_issues.append(f"   {p.relative_to(root_path)} — expected H1 '# {iso}'")
        if log_issues:
            print(f"\n🟡 log/ shape issues ({len(log_issues)}):")
            for s in log_issues:
                print(s)
            issues += len(log_issues)
        else:
            print("✅ log/ shape OK")
    else:
        print("⚠️  log/ directory not found — skipping log shape check")

    # ── Pass 7: audit/ shape ────────────────────────────────────────────
    audit_targets_to_check: list[tuple[str, str]] = []
    if audit_path.exists() and audit_path.is_dir():
        audit_files = [p for p in audit_path.rglob("*.md") if p.name != ".gitkeep"]
        audit_issues: list[str] = []
        for p in audit_files:
            text = p.read_text(encoding="utf-8")
            fm = parse_frontmatter(text)
            rel = p.relative_to(root_path)
            if fm is None:
                audit_issues.append(f"   {rel} — missing YAML frontmatter")
                continue
            missing = AUDIT_REQUIRED_FIELDS - set(fm.keys())
            if missing:
                audit_issues.append(
                    f"   {rel} — missing fields: {', '.join(sorted(missing))}"
                )
                continue
            if fm["severity"] not in VALID_SEVERITIES:
                audit_issues.append(
                    f"   {rel} — invalid severity '{fm['severity']}'"
                )
            if fm["source"] not in VALID_SOURCES:
                audit_issues.append(f"   {rel} — invalid source '{fm['source']}'")
            expected_status = "resolved" if "resolved" in p.parts else "open"
            if fm["status"] != expected_status:
                audit_issues.append(
                    f"   {rel} — status '{fm['status']}' doesn't match directory"
                )
            if fm["status"] == "open":
                audit_targets_to_check.append((fm["id"], fm["target"]))

        if audit_issues:
            print(f"\n🔴 audit/ shape issues ({len(audit_issues)}):")
            for s in audit_issues:
                print(s)
            issues += len(audit_issues)
        else:
            print(f"✅ audit/ shape OK ({len(audit_files)} files)")
    else:
        print("⚠️  audit/ directory not found — skipping audit shape check")

    # ── Pass 8: audit targets exist ─────────────────────────────────────
    missing_targets: list[tuple[str, str]] = []
    for audit_id, target in audit_targets_to_check:
        target_path = root_path / target
        if not target_path.exists():
            missing_targets.append((audit_id, target))
    if missing_targets:
        print(f"\n🔴 Open audits with missing target files ({len(missing_targets)}):")
        for audit_id, target in missing_targets:
            print(f"   {audit_id} → {target}")
        issues += len(missing_targets)
    elif audit_targets_to_check:
        print("✅ All open-audit targets exist")

    print(f"\n{'─'*40}")
    if issues == 0:
        print("✅ Bundle is healthy — no issues found")
    else:
        print(f"⚠️  {issues} issue(s) found — review above and fix before next ingest")

    return 0 if issues == 0 else 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    sys.exit(lint(sys.argv[1]))
