import type { Request, Response } from "express";
import type { WikiRegistry, WikiEntry } from "../config.js";
import { resolveKnowledgeRoot } from "../bundle.js";

/** Project workspace path (raw/, audit/, .agents/). */
export function projectRoot(wiki: WikiEntry): string {
  return wiki.path;
}

/** OKF knowledge root (index.md, concepts/). */
export function knowledgeRoot(wiki: WikiEntry): string {
  return resolveKnowledgeRoot(wiki.path);
}

export function wikiOr400(registry: WikiRegistry, req: Request, res: Response) {
  const wiki = registry.fromRequest(req);
  if (!wiki) {
    res.status(400).json({
      error: "unknown or missing wiki",
      hint: "pass ?wiki=<id> — see GET /api/config for available wikis",
    });
    return null;
  }
  return wiki;
}
