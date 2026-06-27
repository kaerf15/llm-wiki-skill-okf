# Wiki Article Writing Guide

Guidelines for writing high-quality OKF concept pages. Read before compiling a new concept or entity page.

## Length targets

| Page type | Target length | Notes |
|-----------|--------------|-------|
| Concept page | 400–1200 words | Dense, no padding. **Hard ceiling: 1200.** |
| Topic hub page (`<Topic>.md`) | 150–400 words | Definition + map of sub-pages |
| Aspect page under a topic folder | 400–1200 words | Covers one aspect |
| Entity page | 200–500 words | Factual, link-heavy |
| Summary page | 150–400 words | Takeaways, not a rewrite |

## OKF frontmatter template

```yaml
---
type: Concept
title: Transformers
description: Self-attention architecture for sequence modeling.
tags: [nlp, deep-learning]
timestamp: 2026-06-28T10:00:00Z
---
```

`type` is **required**. Use profile-appropriate values: `Concept`, `Entity`, `Summary`, `Table`, `Playbook`, etc.

## Divide and conquer — when to split

If a concept page **would** exceed ~1200 words, split it:

1. Write the hub at `concepts/<title>.md` — filename should equal `title:`.
2. If aspects are needed, create `concepts/<topic>/<aspect-title>.md` (one folder level only).
3. Link aspects from the hub:
   ```markdown
   - [aspect-1](/concepts/<Topic>/aspect-1.md) — one-line summary
   ```
4. Update `index.md` with indented bullets.

## Concept page structure

```markdown
## Relationship to other concepts

- [Related Concept A](/concepts/Related%20Concept%20A.md) — how they relate

# Citations

[1] [Source Title](/summaries/Source%20Title.md) — (date) one-line description
```

## Link rules

1. **Link first mention** of every entity or concept.
2. **Link maximum twice per article** for the same target.
3. **Use OKF absolute paths**: `[Title](/concepts/Title.md)`.
4. **After writing a new page**, grep existing articles for the title and add incoming links.

## Diagrams — always mermaid

ASCII art is banned. Use mermaid for flows, sequences, hierarchies, states.

## Formulas — always KaTeX

Inline `$...$` or block `$$...$$`. The web viewer renders math server-side with KaTeX.

## Handling contradictions

State both claims, cite sources with links, add to Open Questions. Do not silently pick one.

## Incorporating audit feedback

Locate anchor → apply smallest fix → bump `timestamp:` → write resolution → move to `audit/resolved/` → log.
