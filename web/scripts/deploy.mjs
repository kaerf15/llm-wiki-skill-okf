#!/usr/bin/env node
/**
 * deploy.mjs — Install/update llm-wiki web to APP_ROOT, build, register wikis.
 *
 * Usage:
 *   node scripts/deploy.mjs --app-root ~/Library/Application\ Support/llm-wiki --wiki ~/Documents/OKF
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoWebDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(repoWebDir, "..");

function defaultAppRoot() {
  if (process.platform === "win32") {
    const base = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    return path.join(base, "llm-wiki");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "llm-wiki");
  }
  return path.join(os.homedir(), ".config", "llm-wiki");
}

function defaultConfigPath(appRoot) {
  return path.join(appRoot, "wikis.json");
}

function slugFromPath(wikiPath) {
  const base = path.basename(path.resolve(wikiPath));
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "wiki";
}

function cpDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (name === "node_modules" || name === "dist" || name.endsWith(".tsbuildinfo")) continue;
    const from = path.join(src, name);
    const to = path.join(dest, name);
    const st = fs.statSync(from);
    if (st.isDirectory()) cpDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function validateWikiProject(projectRoot) {
  const project = path.resolve(projectRoot);
  const DEFAULT_KB = "wiki-okf";
  const LEGACY_WIKI = "wiki";
  const EXCLUDE = new Set(["audit", "raw", "log", "outputs", ".agents", ".git", "node_modules"]);

  function hasIndex(dir) {
    return fs.existsSync(path.join(dir, "index.md"));
  }

  function looksLikeProject(dir) {
    const hasRaw = fs.existsSync(path.join(dir, "raw"));
    const hasAudit = fs.existsSync(path.join(dir, "audit"));
    const hasConcepts =
      fs.existsSync(path.join(dir, "concepts")) || fs.existsSync(path.join(dir, "entities"));
    return hasRaw && hasAudit && !hasConcepts;
  }

  function resolveKb(root) {
    if (hasIndex(root) && !looksLikeProject(root)) return root;
    if (fs.existsSync(path.join(root, "wiki/index.md"))) return root;
    for (const name of [DEFAULT_KB, LEGACY_WIKI]) {
      const sub = path.join(root, name);
      if (hasIndex(sub)) return sub;
    }
    try {
      for (const e of fs.readdirSync(root, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name.startsWith(".") || EXCLUDE.has(e.name)) continue;
        const sub = path.join(root, e.name);
        if (hasIndex(sub)) return sub;
      }
    } catch {
      /* ignore */
    }
    return root;
  }

  if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
    return { valid: false, error: `path not found: ${project}`, knowledgeRoot: project };
  }

  const knowledgeRoot = resolveKb(project);
  const indexPath = path.join(knowledgeRoot, "index.md");
  if (!fs.existsSync(indexPath)) {
    return {
      valid: false,
      error: `no index.md — use PROJECT_ROOT (e.g. ${project}), expect ${DEFAULT_KB}/index.md inside`,
      knowledgeRoot,
    };
  }

  return { valid: true, knowledgeRoot, indexPath };
}

function loadConfig(filePath) {
  if (!fs.existsSync(filePath)) return { wikis: [] };
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveConfig(filePath, config) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function mergeWikis(existing, wikiPaths) {
  const byPath = new Map();
  for (const w of existing.wikis ?? []) {
    byPath.set(path.resolve(w.path), w);
  }
  for (const raw of wikiPaths) {
    const resolved = path.resolve(raw);
    const check = validateWikiProject(resolved);
    if (!check.valid) {
      console.error(`error: ${check.error}`);
      process.exit(1);
    }
    console.log(`✓ wiki project: ${resolved}`);
    console.log(`  knowledge:    ${check.knowledgeRoot}`);
    byPath.set(resolved, {
      id: slugFromPath(resolved),
      name: path.basename(resolved),
      path: resolved,
    });
  }
  const wikis = Array.from(byPath.values());
  if (wikis.length === 0) {
    console.error("error: at least one --wiki <PROJECT_ROOT> is required");
    process.exit(1);
  }
  const defaultWikiId =
    existing.defaultWikiId && wikis.some((w) => w.id === existing.defaultWikiId)
      ? existing.defaultWikiId
      : wikis[0].id;
  return { defaultWikiId, wikis };
}

function parseArgs(argv) {
  const out = {
    appRoot: null,
    repoRoot: null,
    wikis: [],
    wikisConfig: null,
    author: "lym",
    skipSync: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--app-root") out.appRoot = path.resolve(argv[++i] ?? "");
    else if (a === "--repo") out.repoRoot = path.resolve(argv[++i] ?? "");
    else if (a === "--wiki" || a === "-w") out.wikis.push(path.resolve(argv[++i] ?? ""));
    else if (a === "--wikis-config") out.wikisConfig = path.resolve(argv[++i] ?? "");
    else if (a === "--author") out.author = argv[++i] ?? out.author;
    else if (a === "--skip-sync") out.skipSync = true;
    else if (a === "--help" || a === "-h") {
      console.log(`Usage:
  node scripts/deploy.mjs --app-root <dir> --wiki <PROJECT_ROOT>

  --wiki must be the project root (with raw/, audit/), NOT the wiki-okf/ subfolder.
`);
      process.exit(0);
    }
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
const appRoot = opts.appRoot ?? defaultAppRoot();
const sourceRepo = opts.repoRoot ?? repoRoot;
const configPath = opts.wikisConfig ?? defaultConfigPath(appRoot);
const appWebDir = path.join(appRoot, "web");

console.log(`App root:  ${appRoot}`);
console.log(`Repo:      ${sourceRepo}`);

if (!opts.skipSync) {
  console.log("Syncing web + audit-shared…");
  fs.mkdirSync(appRoot, { recursive: true });
  cpDir(path.join(sourceRepo, "web"), appWebDir);
  cpDir(path.join(sourceRepo, "audit-shared"), path.join(appRoot, "audit-shared"));
}

if (opts.wikis.length > 0) {
  const merged = mergeWikis(loadConfig(configPath), opts.wikis);
  saveConfig(configPath, merged);
  console.log(`Updated ${configPath}`);
}

console.log("Installing dependencies…");
const appAuditDir = path.join(appRoot, "audit-shared");
run("npm", ["install"], appAuditDir);
run("npm", ["run", "build"], appAuditDir);
run("npm", ["install"], appWebDir);
run("npm", ["run", "build"], appWebDir);

console.log(`
✅ Web deployed to ${appWebDir}
   Start: cd "${appWebDir}" && npm start -- --wikis-config "${configPath}"
`);
