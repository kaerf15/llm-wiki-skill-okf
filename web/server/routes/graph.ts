import fs from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import type { WikiRegistry } from "../config.js";
import { wikiOr400, knowledgeRoot } from "./helpers.js";
import { collectConceptFiles, isConceptDocument } from "../bundle.js";
import {
  extractMarkdownLinks,
  wikiPageLabel,
  resolveWikiLinkTarget,
} from "../links.js";

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  group: string;
  degree: number;
  title: string | null;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function isLinkableConceptPath(relPath: string): boolean {
  return isConceptDocument(relPath) || relPath.endsWith("/index.md") || relPath === "index.md";
}

export function buildGraph(wikiRoot: string): GraphData {
  const files = collectConceptFiles(wikiRoot);
  const nodes: Map<string, GraphNode> = new Map();

  for (const f of files) {
    const relFromRoot = path.relative(wikiRoot, f).split(path.sep).join("/");
    if (!isLinkableConceptPath(relFromRoot)) continue;

    const parts = relFromRoot.split("/");
    const group = parts.length > 1 ? parts[0]! : "root";
    const text = fs.readFileSync(f, "utf-8");
    const label = wikiPageLabel(relFromRoot, text);

    nodes.set(relFromRoot, {
      id: relFromRoot,
      label,
      path: relFromRoot,
      group,
      degree: 0,
      title: label,
    });
  }

  const edges: GraphEdge[] = [];
  const seenEdges = new Set<string>();

  for (const f of files) {
    const relFromRoot = path.relative(wikiRoot, f).split(path.sep).join("/");
    if (!isLinkableConceptPath(relFromRoot)) continue;
    const srcId = relFromRoot.replace(/\\/g, "/");
    const text = fs.readFileSync(f, "utf-8");

    for (const link of extractMarkdownLinks(text)) {
      if (/^(https?:|mailto:|#)/i.test(link.href)) continue;
      const tgtId = resolveWikiLinkTarget(wikiRoot, relFromRoot, link.href);
      if (!tgtId || tgtId === srcId) continue;
      if (!nodes.has(tgtId)) continue;

      const key = `${srcId}→${tgtId}`;
      if (seenEdges.has(key)) continue;
      seenEdges.add(key);
      edges.push({ source: srcId, target: tgtId });

      nodes.get(srcId)!.degree += 1;
      nodes.get(tgtId)!.degree += 1;
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}

export function handleGraph(registry: WikiRegistry) {
  return (req: Request, res: Response) => {
    const wiki = wikiOr400(registry, req, res);
    if (!wiki) return;
    res.json(buildGraph(knowledgeRoot(wiki)));
  };
}
