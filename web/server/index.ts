import express from "express";
import path from "node:path";
import url from "node:url";
import fs from "node:fs";
import { parseArgs, WikiRegistry } from "./config.js";
import { defaultPagePath, resolveKnowledgeRoot } from "./bundle.js";
import { handleTree } from "./routes/tree.js";
import { handlePage, handleRaw } from "./routes/pages.js";
import { handleAuditList, handleAuditCreate, handleAuditResolve } from "./routes/audit.js";
import { handleGraph } from "./routes/graph.js";
import { handleBacklinks } from "./routes/backlinks.js";

const cfg = parseArgs(process.argv);
const registry = new WikiRegistry(cfg);

const app = express();
app.use(express.json({ limit: "2mb" }));

// ── API ────────────────────────────────────────────────────────────────────
app.get("/api/config", (_req, res) => {
  res.json({
    author: cfg.author,
    defaultWikiId: cfg.defaultWikiId,
    configPath: cfg.configPath,
    wikis: cfg.wikis.map((w) => ({
      id: w.id,
      name: w.name,
      path: w.path,
      defaultPage: defaultPagePath(resolveKnowledgeRoot(w.path)),
    })),
  });
});
app.get("/api/tree", handleTree(registry));
app.get("/api/graph", handleGraph(registry));
app.get("/api/backlinks", handleBacklinks(registry));
app.get("/api/page", handlePage(registry));
app.get("/api/raw", handleRaw(registry));
app.get("/api/audit", handleAuditList(registry));
app.post("/api/audit", handleAuditCreate(registry));
app.patch("/api/audit/:id/resolve", handleAuditResolve(registry));

// ── Static client ──────────────────────────────────────────────────────────
const here = path.dirname(url.fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, "../dist/client");
if (!fs.existsSync(clientDist)) {
  console.warn(
    `warning: client bundle not found at ${clientDist}. Run 'npm run build' first.`,
  );
}
app.use("/assets", express.static(path.join(clientDist, "assets")));
app.use("/katex", express.static(path.resolve(here, "../node_modules/katex/dist")));
app.get("/", (_req, res) => {
  const index = path.join(clientDist, "index.html");
  if (fs.existsSync(index)) {
    res.sendFile(index);
  } else {
    res.status(500).send("client bundle missing. Run: npm run build");
  }
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(cfg.port, cfg.host, () => {
  console.log(`llm-wiki web server listening on http://${cfg.host}:${cfg.port}`);
  console.log(`  wikis (${cfg.wikis.length}):`);
  for (const w of cfg.wikis) {
    const mark = w.id === cfg.defaultWikiId ? " (default)" : "";
    console.log(`    - ${w.id}${mark}: ${w.path}`);
  }
  if (cfg.configPath) console.log(`  config: ${cfg.configPath}`);
  console.log(`  author: ${cfg.author}`);
});
