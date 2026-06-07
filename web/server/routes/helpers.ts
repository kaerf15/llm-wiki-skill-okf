import type { Request, Response } from "express";
import type { WikiRegistry } from "../config.js";

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
