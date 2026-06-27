# Log Guide — the `log/` folder and `log.md`

## Two log surfaces

| File | Purpose |
|------|---------|
| `log.md` | OKF update history — high-level bundle changes (newest first) |
| `log/YYYYMMDD.md` | llm-wiki operation detail — one file per day |

## log/ format

```markdown
# 2026-04-09

## [09:15] ingest | google-gemma-4-article
- Source: raw/articles/google-gemma-4.md
- Touched: summaries/google-gemma-4, concepts/Gemma.md, index.md

## [15:05] lint | 2 dead links found, 2 fixed
- Updated links to [Claude Code Architecture](/concepts/Claude%20Code%20Architecture.md) in 2 files
```

Link to touched files with OKF absolute paths when helpful.

## log.md format (OKF)

```markdown
# Bundle Update Log

## 2026-06-28
* **Update**: Added [Transformers](/concepts/Transformers.md) concept page.
* **Ingest**: Processed raw/papers/attention-is-all-you-need.md.
```

## Ops

`compile` · `ingest` · `query` · `promote` · `lint` · `audit` · `split` · `scaffold`

## Quick grep

```bash
grep -rh "^## \[" log/ | tail -20
```
