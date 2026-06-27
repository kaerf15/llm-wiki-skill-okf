import fs from "node:fs";
import path from "node:path";
import {
  BUNDLE_EXCLUDE_DIRS,
  BUNDLE_META_FILES,
  OKF_RESERVED_FILENAMES,
  defaultPagePath,
  readIndexMeta,
  readOkfVersion,
  resolveKnowledgeRoot,
  validateWikiProject,
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
  defaultPagePath,
  readIndexMeta,
  readOkfVersion,
  resolveKnowledgeRoot,
  validateWikiProject,
} from "audit-shared";

export type { IndexMeta, WikiPathValidation } from "audit-shared";

/** Whether a relative path is inside a producer-extension directory. */
export function isExcludedRelPath(relPath: string): boolean {
  const parts = relPath.replace(/\\/g, "/").split("/");
  if (parts.some((p) => BUNDLE_EXCLUDE_DIRS.has(p))) return true;
  const base = parts[parts.length - 1] ?? "";
  return BUNDLE_META_FILES.has(base);
}

/** True when bundle declares OKF or uses OKF-native layout (no legacy wiki/ dir). */
export function isOkfBundle(knowledgeRoot: string): boolean {
  if (readOkfVersion(knowledgeRoot)) return true;
  const legacyWiki = path.join(knowledgeRoot, "wiki");
  if (fs.existsSync(legacyWiki) && fs.statSync(legacyWiki).isDirectory()) return false;
  return fs.existsSync(path.join(knowledgeRoot, "index.md"));
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
  return normalized === "index.md" || normalized.endsWith("/index.md");
}

/** Whether this file is a concept document requiring OKF frontmatter.type. */
export function isConceptDocument(relPath: string): boolean {
  const base = path.basename(relPath);
  if (OKF_RESERVED_FILENAMES.has(base) && isReservedIndex(relPath)) return false;
  if (BUNDLE_META_FILES.has(base)) return false;
  if (isExcludedRelPath(relPath)) return false;
  return base.endsWith(".md");
}
