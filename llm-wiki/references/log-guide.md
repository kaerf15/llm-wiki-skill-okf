# Log Guide — the `log/` folder

One file per day: `log/YYYYMMDD.md`.

## Format

```markdown
# 2026-04-09

## [09:15] ingest | google-gemma-4-article
- Source: raw/articles/google-gemma-4.md
- Touched: summaries/google-gemma-4, concepts/Gemma.md, index.md

## [15:05] lint | 2 dead links found, 2 fixed
- Updated links to [Claude Code Architecture](wiki/tech/claude-code/Claude_Code_Architecture.md) in 2 files
```

Link to touched files with standard Markdown links when helpful.

## Ops

`compile` · `ingest` · `query` · `promote` · `lint` · `audit` · `split` · `scaffold`

## Quick grep

```bash
grep -rh "^## \[" log/ | tail -20
```
