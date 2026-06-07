import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveWikiLink } from "./links.js";

test("resolves URL-encoded spaces in wiki links to real files", () => {
  const wikiRoot = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-links-"));
  fs.mkdirSync(path.join(wikiRoot, "wiki/entities"), { recursive: true });
  fs.writeFileSync(path.join(wikiRoot, "wiki/entities/Andrej Karpathy.md"), "# Andrej Karpathy\n");

  const resolved = resolveWikiLink(
    wikiRoot,
    "wiki/index.md",
    "wiki/entities/Andrej%20Karpathy.md",
  );

  assert.deepEqual(resolved, {
    path: "wiki/entities/Andrej Karpathy.md",
    exists: true,
  });
});
