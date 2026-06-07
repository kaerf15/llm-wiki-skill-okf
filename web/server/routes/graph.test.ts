import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildGraph } from "./graph.js";

test("uses wiki document filenames as graph node labels", () => {
  const wikiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-graph-"));
  fs.mkdirSync(path.join(wikiRoot, "wiki/concepts/Brand System"), { recursive: true });
  fs.mkdirSync(path.join(wikiRoot, "wiki/entities"), { recursive: true });

  fs.writeFileSync(path.join(wikiRoot, "wiki/index.md"), "# Wiki Home\n");
  fs.writeFileSync(path.join(wikiRoot, "wiki/concepts/Growth Loop.md"), "# Growth Flywheel\n");
  fs.writeFileSync(path.join(wikiRoot, "wiki/concepts/Brand System/index.md"), "# Brand Strategy\n");
  fs.writeFileSync(path.join(wikiRoot, "wiki/entities/Andrej Karpathy.md"), "# Researcher\n");

  const graph = buildGraph(wikiRoot);
  const labelsByPath = new Map(graph.nodes.map((node) => [node.path, node.label]));

  assert.equal(graph.nodes.length, 4);
  assert.equal(labelsByPath.get("wiki/index.md"), "index-wiki");
  assert.equal(labelsByPath.get("wiki/concepts/Growth Loop.md"), "Growth Loop");
  assert.equal(labelsByPath.get("wiki/concepts/Brand System/index.md"), "index-Brand System");
  assert.equal(labelsByPath.get("wiki/entities/Andrej Karpathy.md"), "Andrej Karpathy");
});
