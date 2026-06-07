import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import type { WikiRegistry } from "../config.js";
import { createRenderer } from "../render/markdown.js";
import { wikiOr400 } from "./helpers.js";

const renderers = new Map<string, ReturnType<typeof createRenderer>>();

function getRenderer(wikiRoot: string) {
  let r = renderers.get(wikiRoot);
  if (!r) {
    r = createRenderer({ wikiRoot });
    renderers.set(wikiRoot, r);
  }
  return r;
}

export function handlePage(registry: WikiRegistry) {
  return (req: Request, res: Response) => {
    const wiki = wikiOr400(registry, req, res);
    if (!wiki) return;

    const relRaw = (req.query.path as string | undefined) ?? "";
    const rel = safeRel(relRaw);
    if (!rel) {
      res.status(400).json({ error: "missing or invalid `path` query" });
      return;
    }

    let full = path.join(wiki.path, rel);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      full = path.join(full, "index.md");
    }

    if (!full.endsWith(".md")) full += ".md";

    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      res.status(404).json({ error: "file not found", path: rel });
      return;
    }

    const relFromRoot = path.relative(wiki.path, full);
    if (relFromRoot.startsWith("..") || path.isAbsolute(relFromRoot)) {
      res.status(403).json({ error: "path escapes wiki root" });
      return;
    }

    const relPosix = relFromRoot.split(path.sep).join("/");
    const rawMarkdown = fs.readFileSync(full, "utf-8");
    const rendered = getRenderer(wiki.path).render(rawMarkdown, relPosix, wiki.id);
    res.json({
      wikiId: wiki.id,
      path: relPosix,
      title: rendered.title,
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

    const relRaw = (req.query.path as string | undefined) ?? "";
    const rel = safeRel(relRaw);
    if (!rel) {
      res.status(400).send("bad path");
      return;
    }
    const full = path.join(wiki.path, rel);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
      res.status(404).send("not found");
      return;
    }
    res.type("text/markdown").send(fs.readFileSync(full));
  };
}

function safeRel(input: string): string | null {
  if (!input) return "wiki/index.md";
  if (path.isAbsolute(input)) return null;
  const normalized = path.posix.normalize(input);
  if (normalized.startsWith("..")) return null;
  return normalized;
}
