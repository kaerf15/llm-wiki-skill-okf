import type { Request, Response } from "express";
import type { WikiRegistry } from "../config.js";
import { findBacklinks } from "../links.js";
import { wikiOr400, knowledgeRoot } from "./helpers.js";

export function handleBacklinks(registry: WikiRegistry) {
  return (req: Request, res: Response) => {
    const wiki = wikiOr400(registry, req, res);
    if (!wiki) return;

    const rel = (req.query.path as string | undefined)?.replace(/\\/g, "/");
    if (!rel) {
      res.status(400).json({ error: "missing `path` query" });
      return;
    }
    const target = rel.endsWith(".md") ? rel : `${rel}.md`;
    res.json({ target, backlinks: findBacklinks(knowledgeRoot(wiki), target) });
  };
}
