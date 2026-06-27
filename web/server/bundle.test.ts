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

test("resolveKnowledgeRoot finds default wiki/ subfolder", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-wiki-"));
  fs.mkdirSync(path.join(project, "raw"), { recursive: true });
  fs.mkdirSync(path.join(project, "audit"), { recursive: true });
  fs.mkdirSync(path.join(project, "wiki", "concepts"), { recursive: true });
  fs.writeFileSync(
    path.join(project, "wiki", "index.md"),
    `---
okf_version: "0.1"
name: wiki
description: Default wiki folder
---

# Index
`,
  );

  const kb = resolveKnowledgeRoot(project);
  assert.equal(kb, path.join(project, "wiki"));
  assert.equal(readIndexMeta(kb).name, "wiki");
});

test("resolveKnowledgeRoot finds custom KB subfolder", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-custom-"));
  fs.mkdirSync(path.join(project, "raw"), { recursive: true });
  fs.mkdirSync(path.join(project, "audit"), { recursive: true });
  fs.mkdirSync(path.join(project, "my-wiki"), { recursive: true });
  fs.writeFileSync(
    path.join(project, "my-wiki", "index.md"),
    `---
okf_version: "0.1"
name: my-wiki
description: Custom KB folder
---

# Index
`,
  );

  const kb = resolveKnowledgeRoot(project);
  assert.equal(kb, path.join(project, "my-wiki"));
  assert.equal(readIndexMeta(kb).name, "my-wiki");
});

test("validateWikiProject accepts nested llm-wiki project", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-validate-"));
  fs.mkdirSync(path.join(project, "raw"), { recursive: true });
  fs.mkdirSync(path.join(project, "audit"), { recursive: true });
  fs.mkdirSync(path.join(project, "wiki"), { recursive: true });
  fs.writeFileSync(
    path.join(project, "wiki", "index.md"),
    '---\nokf_version: "0.1"\nname: wiki\n---\n\n# Index\n',
  );
  const v = validateWikiProject(project);
  assert.equal(v.valid, true);
  assert.equal(v.knowledgeRoot, path.join(project, "wiki"));
});
