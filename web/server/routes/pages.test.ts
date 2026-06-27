import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import express from "express";
import { WikiRegistry } from "../config.js";
import { handlePage } from "./pages.js";
import { buildServerConfig } from "../config.js";

function makeNestedProject(): string {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "llm-wiki-page-"));
  fs.mkdirSync(path.join(project, "raw"), { recursive: true });
  fs.mkdirSync(path.join(project, "audit"), { recursive: true });
  fs.mkdirSync(path.join(project, "wiki", "concepts"), { recursive: true });
  fs.writeFileSync(
    path.join(project, "wiki", "index.md"),
    `---
okf_version: "0.1"
name: wiki
description: Nested test bundle
---

# Index — Test
`,
  );
  return project;
}

test("GET /api/page serves index.md from wiki/ subfolder", async () => {
  const project = makeNestedProject();
  const cfg = buildServerConfig(
    [{ id: "okf", name: "OKF", path: project }],
    "okf",
    { configPath: null, port: 4875, host: "127.0.0.1", author: "test" },
  );
  const registry = new WikiRegistry(cfg);
  const app = express();
  app.get("/api/page", handlePage(registry));

  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/page?wiki=okf&path=index.md`);
    assert.equal(res.status, 200);
    const data = (await res.json()) as { path: string; title: string | null };
    assert.equal(data.path, "index.md");
    assert.equal(data.title, "index");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }
});

test("GET /api/page with empty path defaults to index.md", async () => {
  const project = makeNestedProject();
  const cfg = buildServerConfig(
    [{ id: "okf", name: "OKF", path: project }],
    "okf",
    { configPath: null, port: 4875, host: "127.0.0.1", author: "test" },
  );
  const registry = new WikiRegistry(cfg);
  const app = express();
  app.get("/api/page", handlePage(registry));

  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/page?wiki=okf`);
    assert.equal(res.status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  }
});
