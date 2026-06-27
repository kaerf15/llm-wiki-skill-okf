/**
 * Resolve llm-wiki project layout → OKF knowledge root.
 * Project root has raw/, audit/; knowledge lives in <KB_DIR>/ or at project root.
 */
import fs from "node:fs";
import path from "node:path";
import {
  BUNDLE_EXCLUDE_DIRS,
  DEFAULT_KB_DIR,
  LEGACY_INDEX_PATH,
  LEGACY_WIKI_DIR,
  OKF_INDEX_PATH,
} from "./bundle.js";

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

function looksLikeProjectRoot(dir: string): boolean {
  if (readOkfVersion(dir)) return false;
  const hasRaw = fs.existsSync(path.join(dir, "raw"));
  const hasAudit = fs.existsSync(path.join(dir, "audit"));
  const hasConceptsAtRoot =
    fs.existsSync(path.join(dir, "concepts")) ||
    fs.existsSync(path.join(dir, "entities")) ||
    fs.existsSync(path.join(dir, "datasets"));
  return hasRaw && hasAudit && !hasConceptsAtRoot;
}

/** Resolve OKF/legacy knowledge root under a project workspace. */
export function resolveKnowledgeRoot(projectRoot: string): string {
  const root = path.resolve(projectRoot);

  if (hasKnowledgeIndex(root) && (readOkfVersion(root) || !looksLikeProjectRoot(root))) {
    return root;
  }
  if (fs.existsSync(path.join(root, LEGACY_INDEX_PATH))) return root;

  for (const name of [DEFAULT_KB_DIR, LEGACY_WIKI_DIR]) {
    const sub = path.join(root, name);
    if (hasKnowledgeIndex(sub)) return sub;
  }

  try {
    for (const e of fs.readdirSync(root, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name.startsWith(".")) continue;
      if (BUNDLE_EXCLUDE_DIRS.has(e.name)) continue;
      const sub = path.join(root, e.name);
      if (hasKnowledgeIndex(sub)) return sub;
    }
  } catch {
    /* unreadable */
  }

  return root;
}

export function defaultPagePath(knowledgeRoot: string): string {
  if (fs.existsSync(path.join(knowledgeRoot, OKF_INDEX_PATH))) return OKF_INDEX_PATH;
  if (fs.existsSync(path.join(knowledgeRoot, LEGACY_INDEX_PATH))) return LEGACY_INDEX_PATH;
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
    const hint =
      knowledgeRoot === project
        ? `expected ${OKF_INDEX_PATH} at project root or a KB subfolder (e.g. ${DEFAULT_KB_DIR}/index.md)`
        : `expected ${path.relative(project, indexPath)} under project ${project}`;
    return {
      projectRoot: project,
      knowledgeRoot,
      indexPath,
      valid: false,
      error: `no index.md found — ${hint}`,
      meta,
    };
  }

  return { projectRoot: project, knowledgeRoot, indexPath, valid: true, meta };
}
