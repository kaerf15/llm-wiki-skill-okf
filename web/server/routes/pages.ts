import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import type { WikiRegistry } from "../config.js";
import { createRenderer } from "../render/markdown.js";
import { wikiPageLabel } from "../links.js";
import { wikiOr400, knowledgeRoot, projectRoot } from "./helpers.js";
import { defaultPagePath } from "../bundle.js";

const renderers = new Map<string, ReturnType<typeof createRenderer>>();

function getRenderer(kbRoot: string) {
  let r = renderers.get(kbRoot);
  if (!r) {
    r = createRenderer({ wikiRoot: kbRoot });
    renderers.set(kbRoot, r);
  }
  return r;
}

export function handlePage(registry: WikiRegistry) {
  return (req: Request, res: Response) => {
    const wiki = wikiOr400(registry, req, res);
    if (!wiki) return;

    const kb = knowledgeRoot(wiki);
    const relRaw = (req.query.path as string | undefined) ?? "";
    const rel = safeRel(relRaw, kb);
    if (!rel) {
      res.status(400).json({ error: "missing or invalid `path` query" });
      return;
    }

    let full = path.join(kb, rel);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      full = path.join(full, "index.md");
    }

    if (!full.endsWith(".md")) full += ".md";

    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      res.status(404).json({ error: "file not found", path: rel });
      return;
    }

    const relFromRoot = path.relative(kb, full);
    if (relFromRoot.startsWith("..") || path.isAbsolute(relFromRoot)) {
      res.status(403).json({ error: "path escapes wiki root" });
      return;
    }

    const relPosix = relFromRoot.split(path.sep).join("/");
    const rawMarkdown = fs.readFileSync(full, "utf-8");
    const rendered = getRenderer(kb).render(rawMarkdown, relPosix, wiki.id);
    res.json({
      wikiId: wiki.id,
      path: relPosix,
      title: wikiPageLabel(relPosix, rawMarkdown),
      frontmatter: rendered.frontmatter,
      html: rendered.html,
      raw: rendered.rawMarkdown,
    });
  };
}

export function handleRaw(registry: WikiRegistry) {
  return (req: Request, res: Response) => {
    const wiki = wikiOr400(registry, req, res);
    if (!wiki) return;

    const kb = knowledgeRoot(wiki);
    const relRaw = (req.query.path as string | undefined) ?? "";
    const rel = safeRel(relRaw, kb);
    if (!rel) {
      res.status(400).send("bad path");
      return;
    }
    const full = path.join(kb, rel);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      res.status(404).send("not found");
      return;
    }
    res.type("text/markdown").send(fs.readFileSync(full));
  };
}

function safeRel(input: string, wikiRoot?: string): string | null {
  if (!input) {
    if (wikiRoot) return defaultPagePath(wikiRoot);
    return "index.md";
  }
  if (path.isAbsolute(input)) return null;
  const normalized = path.posix.normalize(input);
  if (normalized.startsWith("..")) return null;
  return normalized;
}
