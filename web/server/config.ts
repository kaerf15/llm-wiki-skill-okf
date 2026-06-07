import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Request } from "express";

export interface WikiEntry {
  id: string;
  name: string;
  path: string;
}

export interface WikisConfigFile {
  defaultWikiId?: string;
  wikis: WikiEntry[];
}

export interface ServerConfig {
  wikis: WikiEntry[];
  defaultWikiId: string;
  configPath: string | null;
  port: number;
  host: string;
  author: string;
}

export function defaultConfigPath(): string {
  if (process.platform === "win32") {
    const base =
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");
    return path.join(base, "llm-wiki", "wikis.json");
  }
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "llm-wiki",
      "wikis.json",
    );
  }
  return path.join(os.homedir(), ".config", "llm-wiki", "wikis.json");
}

export function slugFromPath(wikiPath: string): string {
  const base = path.basename(path.resolve(wikiPath));
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "wiki";
}

export function loadWikisConfig(filePath: string): WikisConfigFile {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as WikisConfigFile;
  if (!parsed.wikis || !Array.isArray(parsed.wikis)) {
    throw new Error(`invalid wikis config: ${filePath}`);
  }
  return parsed;
}

export function saveWikisConfig(filePath: string, config: WikisConfigFile): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

export function normalizeWikiEntry(rawPath: string, id?: string, name?: string): WikiEntry {
  const resolved = path.resolve(rawPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`wiki path does not exist or is not a directory: ${resolved}`);
  }
  const baseId = id?.trim() || slugFromPath(resolved);
  return {
    id: baseId,
    name: name?.trim() || path.basename(resolved),
    path: resolved,
  };
}

export function mergeWikiPaths(
  existing: WikiEntry[],
  paths: string[],
): { wikis: WikiEntry[]; defaultWikiId: string } {
  const byPath = new Map<string, WikiEntry>();
  for (const w of existing) {
    byPath.set(path.resolve(w.path), w);
  }
  for (const p of paths) {
    const entry = normalizeWikiEntry(p);
    byPath.set(path.resolve(entry.path), entry);
  }
  const wikis = Array.from(byPath.values());
  if (wikis.length === 0) {
    throw new Error("at least one wiki path is required");
  }
  return { wikis, defaultWikiId: wikis[0]!.id };
}

export function buildServerConfig(
  wikis: WikiEntry[],
  defaultWikiId: string,
  opts: { configPath: string | null; port: number; host: string; author: string },
): ServerConfig {
  const ids = new Set(wikis.map((w) => w.id));
  if (wikis.length === 0) {
    throw new Error("no wikis configured");
  }
  if (ids.size !== wikis.length) {
    throw new Error("duplicate wiki ids in configuration");
  }
  const defaultId = ids.has(defaultWikiId) ? defaultWikiId : wikis[0]!.id;
  return {
    wikis,
    defaultWikiId: defaultId,
    configPath: opts.configPath,
    port: opts.port,
    host: opts.host,
    author: opts.author,
  };
}

export class WikiRegistry {
  readonly config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
  }

  get(id: string): WikiEntry | undefined {
    return this.config.wikis.find((w) => w.id === id);
  }

  resolve(id?: string | null): WikiEntry | undefined {
    const key = id ?? this.config.defaultWikiId;
    return this.get(key);
  }

  fromRequest(req: Request): WikiEntry | null {
    const raw = req.query.wiki;
    const id = typeof raw === "string" ? raw : undefined;
    return this.resolve(id) ?? null;
  }
}

export function parseArgs(argv: string[]): ServerConfig {
  const args = argv.slice(2);
  let configPath: string | null = null;
  const wikiPaths: string[] = [];
  let port = 4875;
  let host = "127.0.0.1";
  let author = "lym";

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    switch (a) {
      case "--wikis-config":
        configPath = path.resolve(args[++i] ?? "");
        break;
      case "--wiki":
      case "-w":
        wikiPaths.push(args[++i] ?? "");
        break;
      case "--port":
      case "-p":
        port = parseInt(args[++i] ?? "4875", 10);
        break;
      case "--host":
        host = args[++i] ?? host;
        break;
      case "--author":
        author = args[++i] ?? author;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        if (a.startsWith("--")) {
          console.error(`unknown flag: ${a}`);
          printHelp();
          process.exit(1);
        }
    }
  }

  let wikis: WikiEntry[] = [];
  let defaultWikiId = "";

  const fileToLoad = configPath ?? (fs.existsSync(defaultConfigPath()) ? defaultConfigPath() : null);
  if (fileToLoad && fs.existsSync(fileToLoad)) {
    const loaded = loadWikisConfig(fileToLoad);
    wikis = loaded.wikis.map((w) => normalizeWikiEntry(w.path, w.id, w.name));
    defaultWikiId = loaded.defaultWikiId ?? wikis[0]?.id ?? "";
    if (!configPath) configPath = fileToLoad;
  }

  if (wikiPaths.length > 0) {
    const merged = mergeWikiPaths(wikis, wikiPaths.filter(Boolean));
    wikis = merged.wikis;
    if (!defaultWikiId) defaultWikiId = merged.defaultWikiId;
  }

  if (wikis.length === 0) {
    console.error("error: no wikis configured. Use --wiki <path> and/or --wikis-config <file>");
    printHelp();
    process.exit(1);
  }

  return buildServerConfig(wikis, defaultWikiId, { configPath, port, host, author });
}

function printHelp(): void {
  console.log(`
Usage:
  npm start -- [options]

Options:
  -w, --wiki <path>           Wiki root (repeatable). Merged with --wikis-config.
      --wikis-config <file>   JSON file listing wikis (default: ~/.../llm-wiki/wikis.json if present)
  -p, --port <n>              Port (default: 4875)
      --host <addr>           Bind address (default: 127.0.0.1)
      --author <name>         Author for audit feedback (default: lym)
  -h, --help                  Show help

Examples:
  npm start -- --wiki ~/wikis/research --wiki ~/wikis/work
  npm start -- --wikis-config ~/Library/Application\\ Support/llm-wiki/wikis.json

wikis.json format:
  {
    "defaultWikiId": "research",
    "wikis": [
      { "id": "research", "name": "AI Research", "path": "/Users/me/wikis/research" }
    ]
  }
`);
}
