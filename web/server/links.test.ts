import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveWikiLink, wikiPageLabel } from "./links.js";

test("root index always labels as index in chrome", () => {
  const text = '---\nokf_version: "0.1"\ntitle: Index — Demo\n---\n# Index — Demo\n';
  assert.equal(wikiPageLabel("index.md", text), "index");
});

test("resolves OKF absolute links", () => {
  const wikiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-links-"));
  fs.mkdirSync(path.join(wikiRoot, "entities"), { recursive: true });
  fs.writeFileSync(path.join(wikiRoot, "entities/Andrej Karpathy.md"), "# Andrej Karpathy\n");

  const resolved = resolveWikiLink(wikiRoot, "index.md", "/entities/Andrej%20Karpathy.md");

  assert.deepEqual(resolved, {
    path: "entities/Andrej Karpathy.md",
    exists: true,
  });
});

test("resolves relative concept links", () => {
  const wikiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-rel-links-"));
  fs.mkdirSync(path.join(wikiRoot, "concepts"), { recursive: true });
  fs.writeFileSync(path.join(wikiRoot, "concepts/Foo.md"), "# Foo\n");
  fs.writeFileSync(path.join(wikiRoot, "concepts/Bar.md"), "[Foo](./Foo.md)\n");

  const resolved = resolveWikiLink(wikiRoot, "concepts/Bar.md", "./Foo.md");

  assert.deepEqual(resolved, {
    path: "concepts/Foo.md",
    exists: true,
  });
});
