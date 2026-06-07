#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_PORT = 4875;
const DEFAULT_HOST = "127.0.0.1";
const MAC_LABEL = "com.llm-wiki.web";
const WINDOWS_TASK_NAME = "LLM Wiki Web";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(scriptDir, "..");

const { command, options } = parseArgs(process.argv.slice(2));

if (command === "install") {
  install();
} else if (command === "uninstall") {
  uninstall();
} else {
  printHelp();
  process.exit(command === "help" ? 0 : 1);
}

function defaultConfigPath() {
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

function slugFromPath(wikiPath) {
  const base = path.basename(path.resolve(wikiPath));
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "wiki";
}

function loadConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    return { wikis: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveConfig(filePath, config) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function mergeWikiPaths(existing, wikiPaths) {
  const byPath = new Map();
  for (const w of existing.wikis ?? []) {
    byPath.set(path.resolve(w.path), w);
  }
  for (const raw of wikiPaths) {
    const resolved = path.resolve(raw);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      fail(`error: wiki root does not exist or is not a directory: ${resolved}`);
    }
    const id = slugFromPath(resolved);
    byPath.set(resolved, {
      id,
      name: path.basename(resolved),
      path: resolved,
    });
  }
  const wikis = Array.from(byPath.values());
  if (wikis.length === 0) {
    fail("error: at least one --wiki path is required");
  }
  const defaultWikiId =
    existing.defaultWikiId && wikis.some((w) => w.id === existing.defaultWikiId)
      ? existing.defaultWikiId
      : wikis[0].id;
  return { defaultWikiId, wikis };
}

function install() {
  const wikiPaths = options.wikis ?? [];
  if (wikiPaths.length === 0) {
    fail("error: at least one --wiki <path> is required for install");
  }

  const configPath = options.wikisConfig
    ? path.resolve(options.wikisConfig)
    : defaultConfigPath();
  const merged = mergeWikiPaths(loadConfig(configPath), wikiPaths);
  saveConfig(configPath, merged);

  const port = parsePort(options.port);
  const host = options.host ?? DEFAULT_HOST;
  const author = options.author;

  console.log(`Updated wikis config: ${configPath}`);
  for (const w of merged.wikis) {
    console.log(`  - ${w.id}: ${w.path}`);
  }

  if (process.platform === "darwin") {
    installMac({ configPath, port, host, author });
  } else if (process.platform === "win32") {
    installWindows({ configPath, port, host, author });
  } else {
    fail("error: autostart install currently supports macOS and Windows only");
  }
}

function uninstall() {
  if (process.platform === "darwin") {
    uninstallMac();
  } else if (process.platform === "win32") {
    uninstallWindows();
  } else {
    fail("error: autostart uninstall currently supports macOS and Windows only");
  }
}

function installMac({ configPath, port, host, author }) {
  const launchAgents = path.join(os.homedir(), "Library", "LaunchAgents");
  const logsDir = path.join(os.homedir(), "Library", "Logs");
  const appDir = path.join(os.homedir(), "Library", "Application Support", "llm-wiki");
  const runnerPath = path.join(appDir, "llm-wiki-web.sh");
  const plistPath = path.join(launchAgents, `${MAC_LABEL}.plist`);
  fs.mkdirSync(launchAgents, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(appDir, { recursive: true });

  fs.writeFileSync(
    runnerPath,
    buildShellRunner({ configPath, port, host, author }),
    "utf8",
  );
  fs.chmodSync(runnerPath, 0o755);

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${MAC_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(runnerPath)}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${escapeXml(webDir)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${escapeXml(path.join(logsDir, "llm-wiki-web.log"))}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(path.join(logsDir, "llm-wiki-web.err.log"))}</string>
</dict>
</plist>
`;

  fs.writeFileSync(plistPath, plist, "utf8");
  spawnSync("launchctl", ["unload", plistPath], { stdio: "ignore" });
  run("launchctl", ["load", plistPath]);

  console.log(`Installed macOS autostart: ${plistPath}`);
  console.log(`Created runner script: ${runnerPath}`);
  console.log(`llm-wiki web will start at http://${host}:${port}`);
}

function uninstallMac() {
  const plistPath = path.join(
    os.homedir(),
    "Library",
    "LaunchAgents",
    `${MAC_LABEL}.plist`,
  );
  spawnSync("launchctl", ["unload", plistPath], { stdio: "ignore" });
  if (fs.existsSync(plistPath)) {
    fs.unlinkSync(plistPath);
  }
  const runnerPath = path.join(
    os.homedir(),
    "Library",
    "Application Support",
    "llm-wiki",
    "llm-wiki-web.sh",
  );
  if (fs.existsSync(runnerPath)) {
    fs.unlinkSync(runnerPath);
  }
  console.log(`Removed macOS autostart: ${plistPath}`);
}

function installWindows({ configPath, port, host, author }) {
  const appDir = path.join(
    process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
    "llm-wiki",
  );
  const runnerPath = path.join(appDir, "llm-wiki-web.cmd");
  fs.mkdirSync(appDir, { recursive: true });
  fs.writeFileSync(
    runnerPath,
    buildWindowsRunner({ configPath, port, host, author }),
    "utf8",
  );

  run("schtasks", [
    "/Create",
    "/TN",
    WINDOWS_TASK_NAME,
    "/SC",
    "ONLOGON",
    "/TR",
    cmdQuote(runnerPath),
    "/F",
  ]);
  console.log(`Installed Windows autostart task: ${WINDOWS_TASK_NAME}`);
  console.log(`Created runner script: ${runnerPath}`);
  console.log(`llm-wiki web will start at http://${host}:${port}`);
}

function uninstallWindows() {
  spawnSync("schtasks", ["/Delete", "/TN", WINDOWS_TASK_NAME, "/F"], {
    stdio: "ignore",
  });
  const runnerPath = path.join(
    process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
    "llm-wiki",
    "llm-wiki-web.cmd",
  );
  if (fs.existsSync(runnerPath)) {
    fs.unlinkSync(runnerPath);
  }
  console.log(`Removed Windows autostart task: ${WINDOWS_TASK_NAME}`);
}

function buildStartArgs({ configPath, port, host, author }) {
  const args = [
    "npm",
    "start",
    "--",
    "--wikis-config",
    configPath,
    "--port",
    String(port),
    "--host",
    host,
  ];
  if (author) {
    args.push("--author", author);
  }
  return args;
}

function buildShellRunner({ configPath, port, host, author }) {
  const args = buildStartArgs({ configPath, port, host, author });
  return `#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
cd ${shellQuote(webDir)}
exec ${args.map(shellQuote).join(" ")}
`;
}

function buildWindowsRunner({ configPath, port, host, author }) {
  const args = buildStartArgs({ configPath, port, host, author });
  return `@echo off\r\ncd /d ${cmdQuote(webDir)}\r\n${args.map(cmdQuote).join(" ")}\r\n`;
}

function parseArgs(argv) {
  const parsed = { command: argv[0] ?? "help", options: { wikis: [] } };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--wiki":
      case "-w":
        parsed.options.wikis.push(argv[++i]);
        break;
      case "--wikis-config":
        parsed.options.wikisConfig = argv[++i];
        break;
      case "--port":
      case "-p":
        parsed.options.port = argv[++i];
        break;
      case "--host":
        parsed.options.host = argv[++i];
        break;
      case "--author":
        parsed.options.author = argv[++i];
        break;
      case "--help":
      case "-h":
        parsed.command = "help";
        break;
      default:
        fail(`error: unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function parsePort(value) {
  const port = Number.parseInt(value ?? String(DEFAULT_PORT), 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(`error: invalid port: ${value}`);
  }
  return port;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function cmdQuote(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fail(message) {
  console.error(message);
  printHelp();
  process.exit(1);
}

function printHelp() {
  console.log(`
Usage:
  npm run autostart:install -- --wiki <path> [--wiki <path> ...] [options]
  npm run autostart:uninstall

Options:
  -w, --wiki <path>           Wiki root (repeatable). Merged into wikis.json.
      --wikis-config <file>   Config file path (default: ~/Library/.../llm-wiki/wikis.json)
  -p, --port <n>              Port (default: 4875)
      --host <addr>           Bind address (default: 127.0.0.1)
      --author <name>         Audit author name

Installs a user-level startup service. Each --wiki is registered in wikis.json
so the web UI can switch between multiple wikis.
`);
}
