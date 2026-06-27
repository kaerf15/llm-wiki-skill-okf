import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildGraph } from "./graph.js";

test("OKF bundle uses frontmatter titles as graph node labels", () => {
  const wikiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-okf-graph-"));
  fs.mkdirSync(path.join(wikiRoot, "concepts/Brand System"), { recursive: true });
  fs.mkdirSync(path.join(wikiRoot, "entities"), { recursive: true });

  fs.writeFileSync(
    path.join(wikiRoot, "index.md"),
    '---\nokf_version: "0.1"\n---\n# Index — Demo\n',
  );
  fs.writeFileSync(
    path.join(wikiRoot, "concepts/Growth Loop.md"),
    "---\ntype: Concept\ntitle: Growth Flywheel\n---\n# Growth Flywheel\n",
  );
  fs.writeFileSync(
    path.join(wikiRoot, "concepts/Brand System/overview.md"),
    "---\ntype: Concept\ntitle: Brand Strategy\n---\n# Brand Strategy\n",
  );
  fs.writeFileSync(
    path.join(wikiRoot, "entities/Andrej Karpathy.md"),
    "---\ntype: Entity\ntitle: Andrej Karpathy\n---\n# Researcher\n",
  );

  const graph = buildGraph(wikiRoot);
  const labelsByPath = new Map(graph.nodes.map((node) => [node.path, node.label]));

  assert.equal(graph.nodes.length, 4);
  assert.equal(labelsByPath.get("index.md"), "index");
  assert.equal(labelsByPath.get("concepts/Growth Loop.md"), "Growth Flywheel");
  assert.equal(labelsByPath.get("concepts/Brand System/overview.md"), "Brand Strategy");
  assert.equal(labelsByPath.get("entities/Andrej Karpathy.md"), "Andrej Karpathy");
});
