/**
 * Resolve llm-wiki project layout → OKF knowledge root.
 * Project root has raw/, audit/; knowledge lives in <KB_DIR>/ (default wiki/).
 */
import fs from "node:fs";
import path from "node:path";
import { BUNDLE_EXCLUDE_DIRS, DEFAULT_KB_DIR, OKF_INDEX_PATH } from "./bundle.js";

export interface IndexMeta {
  okfVersion?: string;
  name?: string;
  description?: string;
}

export interface WikiPathValidation {
  projectRoot: string;
  knowledgeRoot: string;
  indexPath: string;
  valid: boolean;
  error?: string;
  meta: IndexMeta;
}

function hasKnowledgeIndex(dir: string): boolean {
  return fs.existsSync(path.join(dir, OKF_INDEX_PATH));
}

/** Parse root index.md frontmatter. */
export function readIndexMeta(knowledgeRoot: string): IndexMeta {
  const indexPath = path.join(knowledgeRoot, OKF_INDEX_PATH);
  if (!fs.existsSync(indexPath)) return {};
  const text = fs.readFileSync(indexPath, "utf-8");
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return {};
  const body = m[1]!;
  const pick = (key: string): string | undefined => {
    const line = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(body);
    if (!line) return undefined;
    let v = line[1]!.trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v || undefined;
  };
  return {
    okfVersion: pick("okf_version"),
    name: pick("name"),
    description: pick("description"),
  };
}

export function readOkfVersion(knowledgeRoot: string): string | null {
  return readIndexMeta(knowledgeRoot).okfVersion ?? null;
}

function isOkfKnowledgeRoot(dir: string): boolean {
  return hasKnowledgeIndex(dir) && !!readOkfVersion(dir);
}

/** True when dir is a llm-wiki project root (raw/, audit/) rather than the KB folder. */
function looksLikeProjectRoot(dir: string): boolean {
  if (readOkfVersion(dir)) return false;
  const hasRaw = fs.existsSync(path.join(dir, "raw"));
  const hasAudit = fs.existsSync(path.join(dir, "audit"));
  const hasConceptsAtRoot =
    fs.existsSync(path.join(dir, "concepts")) ||
    fs.existsSync(path.join(dir, "entities"));
  return hasRaw && hasAudit && !hasConceptsAtRoot;
}

/** Resolve OKF knowledge root under a project workspace. */
export function resolveKnowledgeRoot(projectRoot: string): string {
  const root = path.resolve(projectRoot);

  if (isOkfKnowledgeRoot(root) && !looksLikeProjectRoot(root)) {
    return root;
  }

  const defaultSub = path.join(root, DEFAULT_KB_DIR);
  if (isOkfKnowledgeRoot(defaultSub)) {
    return defaultSub;
  }

  try {
    for (const e of fs.readdirSync(root, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith(".")) continue;
      if (BUNDLE_EXCLUDE_DIRS.has(e.name) || e.name === DEFAULT_KB_DIR) continue;
      const sub = path.join(root, e.name);
      if (isOkfKnowledgeRoot(sub)) return sub;
    }
  } catch {
    /* unreadable */
  }

  return isOkfKnowledgeRoot(defaultSub) ? defaultSub : root;
}

export function defaultPagePath(_knowledgeRoot: string): string {
  return OKF_INDEX_PATH;
}

/** Validate wikis.json path → readable OKF knowledge with index.md. */
export function validateWikiProject(projectRoot: string): WikiPathValidation {
  const project = path.resolve(projectRoot);
  const knowledgeRoot = resolveKnowledgeRoot(project);
  const indexPath = path.join(knowledgeRoot, OKF_INDEX_PATH);
  const meta = readIndexMeta(knowledgeRoot);

  if (!fs.existsSync(project) || !fs.statSync(project).isDirectory()) {
    return {
      projectRoot: project,
      knowledgeRoot,
      indexPath,
      valid: false,
      error: `project path does not exist: ${project}`,
      meta,
    };
  }

  if (!fs.existsSync(indexPath)) {
    const hint = `expected ${DEFAULT_KB_DIR}/${OKF_INDEX_PATH} under project ${project}`;
    return {
      projectRoot: project,
      knowledgeRoot,
      indexPath,
      valid: false,
      error: `no index.md found — ${hint}`,
      meta,
    };
  }

  if (!meta.okfVersion) {
    return {
      projectRoot: project,
      knowledgeRoot,
      indexPath,
      valid: false,
      error: `index.md missing okf_version frontmatter at ${indexPath}`,
      meta,
    };
  }

  return { projectRoot: project, knowledgeRoot, indexPath, valid: true, meta };
}
