import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import type { WikiRegistry } from "../config.js";
import { wikiPageLabel } from "../links.js";
import { wikiOr400, knowledgeRoot } from "./helpers.js";
import { BUNDLE_EXCLUDE_DIRS, BUNDLE_META_FILES, OKF_INDEX_PATH } from "../bundle.js";

export interface TreeNode {
  name: string;
  path: string; // relative to wikiRoot
  kind: "file" | "dir";
  children?: TreeNode[];
}

/**
 * Build a navigation tree from the OKF bundle (excluding producer extensions).
 */
export function buildTree(wikiRoot: string): TreeNode {
  return walk(wikiRoot, wikiRoot, "");
}

function walk(wikiRoot: string, dir: string, rel: string): TreeNode {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith(".") && !BUNDLE_EXCLUDE_DIRS.has(e.name))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const children: TreeNode[] = [];
  let rootIndexNode: TreeNode | null = null;

  for (const e of entries) {
    const full = path.join(dir, e.name);
    const nodeRel = rel ? path.posix.join(rel, e.name) : e.name;

    if (e.isDirectory()) {
      children.push(walk(wikiRoot, full, nodeRel));
    } else if (e.name.endsWith(".md") && !BUNDLE_META_FILES.has(e.name)) {
      const text = fs.readFileSync(full, "utf-8");
      const node: TreeNode = {
        name: wikiPageLabel(nodeRel, text),
        path: nodeRel,
        kind: "file",
      };
      if (e.name === "index.md" && !rel) {
        rootIndexNode = node;
        continue;
      }
      children.push(node);
    }
  }

  if (rootIndexNode) children.unshift(rootIndexNode);

  const name = rel ? path.basename(dir) : path.basename(wikiRoot);
  return { name, path: rel || OKF_INDEX_PATH.replace(/\/index\.md$/, "") || ".", kind: "dir", children };
}

export function handleTree(registry: WikiRegistry) {
  return (req: Request, res: Response) => {
    const wiki = wikiOr400(registry, req, res);
    if (!wiki) return;
    res.json(buildTree(knowledgeRoot(wiki)));
  };
}
