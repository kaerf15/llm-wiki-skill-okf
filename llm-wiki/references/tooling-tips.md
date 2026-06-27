# Tooling Tips

## Web viewer — `web/`

Local Node.js server: mermaid, KaTeX, backlinks, knowledge graph, audit feedback, **multi-wiki switching**. Supports OKF v0.1 bundles and legacy `wiki/` layout.

### Multi-wiki config

Register bundles in `wikis.json` (see `web/wikis.example.json`). The top-bar dropdown switches wikis without restarting the server.

```bash
npm start -- --wiki ~/Documents/OKF --wiki ~/wikis/sales-catalog
npm start -- --wikis-config ~/Library/Application\ Support/llm-wiki/wikis.json
```

Autostart merges `--wiki` paths into the default config file:

```bash
npm run autostart:install -- --wiki ~/Documents/OKF --wiki ~/wikis/work
```

### Single wiki

```bash
cd web
npm install
npm run build
npm start -- --wiki "/path/to/OKF"
```

Open `http://127.0.0.1:4875`.

Features:
- **Navigation tree** from bundle root (OKF layout) or `wiki/` (legacy)
- **Rendered pages** with internal SPA navigation
- **Backlinks** — pages that link to the current page (right sidebar)
- **Knowledge graph** — force-directed view of link structure (G key)
- **Feedback** — select text → comment → writes to `audit/`

### Web deploy (recommended)

After scaffolding a project, deploy web with the repo script (syncs, builds, validates paths):

```bash
node web/scripts/deploy.mjs \
  --app-root ~/Library/Application\ Support/llm-wiki \
  --wiki ~/Documents/OKF
```

- `--wiki` must be **PROJECT_ROOT** (contains `raw/`, `audit/`), not `wiki-okf/` subfolder.
- Script verifies `<KB_DIR>/index.md` exists before writing `wikis.json`.

Then start:

```bash
cd ~/Library/Application\ Support/llm-wiki/web
npm start -- --wikis-config ~/Library/Application\ Support/llm-wiki/wikis.json
```

## Autostart

```bash
npm run autostart:install -- --wiki "/path/to/OKF" --port 4875 --author "lym"
npm run autostart:uninstall   # remove
```

macOS: `~/Library/LaunchAgents/com.llm-wiki.web.plist`  
Windows: Task Scheduler task `LLM Wiki Web`

## Skill installation

Install this skill to the bundle root so any compatible Agent can discover it:

```text
<bundle-root>/.agents/skills/llm-wiki/
```

Cursor users may optionally symlink to `.cursor/skills/llm-wiki/`.

## Scaffolding OKF bundles

```bash
python3 scripts/scaffold.py ~/Documents/OKF "My Topic"
python3 scripts/scaffold.py ~/wikis/sales-catalog "Sales Data" --type catalog
```

Bundle root = workspace folder the user opened. Ask for KB type if not specified.

## MarkItDown importer

```bash
python3 -m pip install --user 'markitdown[all]'
python3 scripts/import_source.py "/path/to/source.pdf" "/path/to/OKF" --kind papers
```

Kinds: `articles` · `papers` · `notes`

## qmd (optional, large bundles)

```bash
pip install qmd
qmd collection add . --name my-okf
qmd embed
qmd query "your question" --collection my-okf
```

## Git workflow

Track the bundle as a git repo. Keep large binaries out — use `raw/refs/` pointer files.

## Charts and outputs

Save matplotlib scripts to `outputs/charts/`. Embed in articles:

```markdown
![analysis chart](../outputs/charts/my-analysis.png)
```

Interactive HTML can live under `outputs/` and open in a browser.
