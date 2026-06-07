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

function install() {
  const wiki = options.wiki ? path.resolve(options.wiki) : null;
  if (!wiki) {
    fail("error: --wiki <path> is required for install");
  }
  if (!fs.existsSync(wiki) || !fs.statSync(wiki).isDirectory()) {
    fail(`error: wiki root does not exist or is not a directory: ${wiki}`);
  }

  const port = parsePort(options.port);
  const host = options.host ?? DEFAULT_HOST;
  const author = options.author;

  if (process.platform === "darwin") {
    installMac({ wiki, port, host, author });
  } else if (process.platform === "win32") {
    installWindows({ wiki, port, host, author });
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

function installMac({ wiki, port, host, author }) {
  const launchAgents = path.join(os.homedir(), "Library", "LaunchAgents");
  const logsDir = path.join(os.homedir(), "Library", "Logs");
  const appDir = path.join(os.homedir(), "Library", "Application Support", "llm-wiki");
  const runnerPath = path.join(appDir, "llm-wiki-web.sh");
  const plistPath = path.join(launchAgents, `${MAC_LABEL}.plist`);
  fs.mkdirSync(launchAgents, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  fs.mkdirSync(appDir, { recursive: true });

  fs.writeFileSync(runnerPath, buildShellRunner({ wiki, port, host, author }), "utf8");
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

function installWindows({ wiki, port, host, author }) {
  const appDir = path.join(
    process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
    "llm-wiki",
  );
  const runnerPath = path.join(appDir, "llm-wiki-web.cmd");
  fs.mkdirSync(appDir, { recursive: true });
  fs.writeFileSync(runnerPath, buildWindowsRunner({ wiki, port, host, author }), "utf8");

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

function buildShellRunner({ wiki, port, host, author }) {
  const args = [
    "npm",
    "start",
    "--",
    "--wiki",
    wiki,
    "--port",
    String(port),
    "--host",
    host,
  ];
  if (author) {
    args.push("--author", author);
  }
  return `#!/bin/zsh
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
cd ${shellQuote(webDir)}
exec ${args.map(shellQuote).join(" ")}
`;
}

function buildWindowsRunner({ wiki, port, host, author }) {
  const args = [
    "npm",
    "start",
    "--",
    "--wiki",
    wiki,
    "--port",
    String(port),
    "--host",
    host,
  ];
  if (author) {
    args.push("--author", author);
  }
  return `@echo off\r\ncd /d ${cmdQuote(webDir)}\r\n${args.map(cmdQuote).join(" ")}\r\n`;
}

function parseArgs(argv) {
  const parsed = { command: argv[0] ?? "help", options: {} };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--wiki":
      case "-w":
        parsed.options.wiki = argv[++i];
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
  npm run autostart:install -- --wiki <wiki-root> [--port 4875] [--host 127.0.0.1] [--author name]
  npm run autostart:uninstall

Installs a user-level startup service for the local llm-wiki web viewer.
The service runs from this web directory and points at your Obsidian vault/wiki
via --wiki. It does not copy web files into the wiki.
`);
}
