# Audit Guide — human feedback on bundle content

The `audit/` directory is the human feedback surface. Feedback is produced by the **web viewer** or written manually, and **consumed by the AI during the `audit` operation**.

## File format

```markdown
---
id: 20260409-143022-a1b2
target: concepts/Example.md
target_lines: [45, 52]
anchor_before: "## Overview\n\n"
anchor_text: "incorrect claim here"
anchor_after: "\n\n## Next section"
severity: warn
author: lym
source: web-viewer
created: 2026-04-09T14:30:22+08:00
status: open
---

# Comment

Explanation of what's wrong and how to fix it.
```

Note: `target` paths are relative to the bundle root (OKF layout), e.g. `concepts/Example.md` not `wiki/concepts/Example.md`.

### Source values

- `web-viewer` — filed from the local web UI
- `manual` — written by hand

### Severity

`info` · `suggest` · `warn` · `error` — process error/warn first.

## Anchor strategy

Line numbers drift. Every audit carries `anchor_before`, `anchor_text`, `anchor_after` for relocation. Algorithm lives in `audit-shared/src/anchor.ts`.

## Processing workflow

1. `python3 scripts/audit_review.py <bundle-root> --open`
2. For each open audit: locate → accept / partial / reject / defer
3. Append `# Resolution`, set `status: resolved`, move to `audit/resolved/`
4. Log under `log/YYYYMMDD.md` and update `log.md`

## Tooling

- `scripts/lint_wiki.py` — validates audit shape and targets
- `scripts/audit_review.py` — lists and groups audits
- `web/` — select text in browser → writes audit files
- `audit-shared/` — shared schema and anchor logic for the web server
