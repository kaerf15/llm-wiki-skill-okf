# Tooling Tips

## Web viewer — `web/`

Local Node.js server: mermaid, KaTeX, backlinks, knowledge graph, audit feedback, **multi-wiki switching**.

### Multi-wiki config

Register wikis in `wikis.json` (see `web/wikis.example.json`). The top-bar dropdown switches wikis without restarting the server.

```bash
npm start -- --wiki ~/wikis/a --wiki ~/wikis/b
npm start -- --wikis-config ~/Library/Application\ Support/llm-wiki/wikis.json
```

Autostart merges `--wiki` paths into the default config file:

```bash
npm run autostart:install -- --wiki ~/wikis/research --wiki ~/wikis/work
```

### Single wiki

```bash
cd web
npm install
npm run build
npm start -- --wiki "/path/to/wiki-root"
```

Open `http://127.0.0.1:4875`.

Features:
- **Navigation tree** from `wiki/index.md`
- **Rendered pages** with internal SPA navigation
- **Backlinks** — pages that link to the current page (right sidebar)
- **Knowledge graph** — force-directed view of link structure (G key)
- **Feedback** — select text → comment → writes to `audit/`

### Autostart

```bash
npm run autostart:install -- --wiki "/path/to/wiki-root" --port 4875 --author "lym"
npm run autostart:uninstall   # remove
```

macOS: `~/Library/LaunchAgents/com.llm-wiki.web.plist`  
Windows: Task Scheduler task `LLM Wiki Web`

## Skill installation

Install this skill to the wiki root so any compatible Agent can discover it:

```text
<wiki-root>/.agents/skills/llm-wiki/
```

Cursor users may optionally symlink to `.cursor/skills/llm-wiki/`.

## MarkItDown importer

```bash
python3 -m pip install --user 'markitdown[all]'
python3 scripts/import_source.py "/path/to/source.pdf" "/path/to/wiki-root" --kind papers
```

Kinds: `articles` · `papers` · `notes`

## qmd (optional, large wikis)

```bash
pip install qmd
qmd collection add wiki/ --name my-wiki
qmd embed
qmd query "your question" --collection my-wiki
```

## Git workflow

Track the wiki as a git repo. Keep large binaries out — use `raw/refs/` pointer files.

## Charts and outputs

Save matplotlib scripts to `outputs/charts/`. Embed in articles:

```markdown
![analysis chart](../outputs/charts/my-analysis.png)
```

Interactive HTML can live under `outputs/` and open in a browser.
