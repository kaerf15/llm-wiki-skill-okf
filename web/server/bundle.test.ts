import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  defaultPagePath,
  readIndexMeta,
  resolveKnowledgeRoot,
  validateWikiProject,
} from "./bundle.js";

test("resolveKnowledgeRoot finds wiki-okf subfolder", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-nested-"));
  fs.mkdirSync(path.join(project, "raw"), { recursive: true });
  fs.mkdirSync(path.join(project, "audit"), { recursive: true });
  fs.mkdirSync(path.join(project, "wiki-okf", "concepts"), { recursive: true });
  fs.writeFileSync(
    path.join(project, "wiki-okf", "index.md"),
    `---
okf_version: "0.1"
name: wiki-okf
description: Test nested OKF bundle
---

# Index
`,
  );

  const kb = resolveKnowledgeRoot(project);
  assert.equal(kb, path.join(project, "wiki-okf"));
  assert.equal(defaultPagePath(kb), "index.md");
  assert.equal(readIndexMeta(kb).name, "wiki-okf");
  assert.equal(readIndexMeta(kb).description, "Test nested OKF bundle");
});

test("validateWikiProject accepts nested llm-wiki project", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-validate-"));
  fs.mkdirSync(path.join(project, "raw"), { recursive: true });
  fs.mkdirSync(path.join(project, "audit"), { recursive: true });
  fs.mkdirSync(path.join(project, "wiki-okf"), { recursive: true });
  fs.writeFileSync(
    path.join(project, "wiki-okf", "index.md"),
    '---\nokf_version: "0.1"\nname: wiki-okf\n---\n\n# Index\n',
  );
  const v = validateWikiProject(project);
  assert.equal(v.valid, true);
  assert.equal(v.knowledgeRoot, path.join(project, "wiki-okf"));
});

test("resolveKnowledgeRoot finds custom KB subfolder", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-custom-"));
  fs.mkdirSync(path.join(project, "raw"), { recursive: true });
  fs.mkdirSync(path.join(project, "audit"), { recursive: true });
  fs.mkdirSync(path.join(project, "my-research"), { recursive: true });
  fs.writeFileSync(
    path.join(project, "my-research", "index.md"),
    '---\nokf_version: "0.1"\nname: my-research\n---\n\n# Index\n',
  );

  assert.equal(resolveKnowledgeRoot(project), path.join(project, "my-research"));
});
