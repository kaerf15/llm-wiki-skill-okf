import fs from "node:fs";
import path from "node:path";
import {
  BUNDLE_EXCLUDE_DIRS,
  BUNDLE_META_FILES,
  DEFAULT_KB_DIR,
  LEGACY_INDEX_PATH,
  LEGACY_WIKI_DIR,
  OKF_INDEX_PATH,
  OKF_RESERVED_FILENAMES,
  OKF_VERSION,
} from "audit-shared";

export {
  BUNDLE_EXCLUDE_DIRS,
  BUNDLE_META_FILES,
  DEFAULT_BUNDLE_DIR,
  DEFAULT_KB_DIR,
  KB_TYPES,
  LEGACY_INDEX_PATH,
  LEGACY_WIKI_DIR,
  OKF_INDEX_PATH,
  OKF_VERSION,
} from "audit-shared";

/** Whether a relative path is inside a producer-extension directory. */
export function isExcludedRelPath(relPath: string): boolean {
  const parts = relPath.replace(/\\/g, "/").split("/");
  if (parts.some((p) => BUNDLE_EXCLUDE_DIRS.has(p))) return true;
  const base = parts[parts.length - 1] ?? "";
  return BUNDLE_META_FILES.has(base);
}

/** Read okf_version from root index.md frontmatter, if present. */
export function readOkfVersion(knowledgeRoot: string): string | null {
  return readIndexMeta(knowledgeRoot).okfVersion ?? null;
}

/** Parse root index.md frontmatter (OKF + agent discovery fields). */
export function readIndexMeta(knowledgeRoot: string): {
  okfVersion?: string;
  name?: string;
  description?: string;
} {
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

function hasKnowledgeIndex(dir: string): boolean {
  return fs.existsSync(path.join(dir, OKF_INDEX_PATH));
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
    /* unreadable path */
  }

  return root;
}

/** True when dir looks like llm-wiki project root (raw/ + audit/, concepts not at root). */
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

/** True when bundle declares OKF or uses OKF-native layout (no legacy wiki/ dir). */
export function isOkfBundle(knowledgeRoot: string): boolean {
  if (readOkfVersion(knowledgeRoot)) return true;
  const legacyWiki = path.join(knowledgeRoot, LEGACY_WIKI_DIR);
  if (fs.existsSync(legacyWiki) && fs.statSync(legacyWiki).isDirectory()) return false;
  return fs.existsSync(path.join(knowledgeRoot, OKF_INDEX_PATH));
}

/** Default landing page for a knowledge root. */
export function defaultPagePath(knowledgeRoot: string): string {
  if (fs.existsSync(path.join(knowledgeRoot, OKF_INDEX_PATH))) return OKF_INDEX_PATH;
  if (fs.existsSync(path.join(knowledgeRoot, LEGACY_INDEX_PATH))) return LEGACY_INDEX_PATH;
  return OKF_INDEX_PATH;
}

/** Collect all navigable markdown files in the knowledge root. */
export function collectConceptFiles(knowledgeRoot: string): string[] {
  const out: string[] = [];
  walkConcepts(knowledgeRoot, knowledgeRoot, out);
  return out;
}

function walkConcepts(knowledgeRoot: string, dir: string, out: string[]): void {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    const rel = path.relative(knowledgeRoot, full).split(path.sep).join("/");
    if (e.isDirectory()) {
      if (BUNDLE_EXCLUDE_DIRS.has(e.name)) continue;
      walkConcepts(knowledgeRoot, full, out);
    } else if (e.isFile() && e.name.endsWith(".md")) {
      if (BUNDLE_META_FILES.has(e.name)) continue;
      if (rel.startsWith("audit/") || rel.startsWith("raw/") || rel.startsWith("outputs/")) continue;
      out.push(full);
    }
  }
}

/** Whether this file is an OKF reserved index (no concept frontmatter required). */
export function isReservedIndex(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  return normalized === OKF_INDEX_PATH || normalized.endsWith("/index.md");
}

/** Whether this file is a concept document requiring OKF frontmatter.type. */
export function isConceptDocument(relPath: string): boolean {
  const base = path.basename(relPath);
  if (OKF_RESERVED_FILENAMES.has(base) && isReservedIndex(relPath)) return false;
  if (BUNDLE_META_FILES.has(base)) return false;
  if (isExcludedRelPath(relPath)) return false;
  return base.endsWith(".md");
}
