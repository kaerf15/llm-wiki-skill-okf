import fs from "node:fs";
import path from "node:path";
import {
  BUNDLE_EXCLUDE_DIRS,
  BUNDLE_META_FILES,
  LEGACY_INDEX_PATH,
  OKF_INDEX_PATH,
  OKF_RESERVED_FILENAMES,
  OKF_VERSION,
} from "audit-shared";

export {
  BUNDLE_EXCLUDE_DIRS,
  BUNDLE_META_FILES,
  DEFAULT_BUNDLE_DIR,
  KB_TYPES,
  LEGACY_INDEX_PATH,
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
export function readOkfVersion(wikiRoot: string): string | null {
  const indexPath = path.join(wikiRoot, OKF_INDEX_PATH);
  if (!fs.existsSync(indexPath)) return null;
  const text = fs.readFileSync(indexPath, "utf-8");
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) return null;
  const versionLine = /^okf_version:\s*["']?([^"'\n]+)["']?\s*$/m.exec(m[1]!);
  return versionLine ? versionLine[1]!.trim() : null;
}

/** True when bundle declares OKF or uses OKF-native layout (no legacy wiki/ dir). */
export function isOkfBundle(wikiRoot: string): boolean {
  if (readOkfVersion(wikiRoot)) return true;
  const legacyWiki = path.join(wikiRoot, "wiki");
  if (fs.existsSync(legacyWiki) && fs.statSync(legacyWiki).isDirectory()) return false;
  return fs.existsSync(path.join(wikiRoot, OKF_INDEX_PATH));
}

/** Default landing page for a bundle. */
export function defaultPagePath(wikiRoot: string): string {
  if (fs.existsSync(path.join(wikiRoot, OKF_INDEX_PATH))) return OKF_INDEX_PATH;
  if (fs.existsSync(path.join(wikiRoot, LEGACY_INDEX_PATH))) return LEGACY_INDEX_PATH;
  return OKF_INDEX_PATH;
}

/** Collect all navigable markdown files in the bundle. */
export function collectConceptFiles(wikiRoot: string): string[] {
  const out: string[] = [];
  walkConcepts(wikiRoot, wikiRoot, out);
  return out;
}

function walkConcepts(wikiRoot: string, dir: string, out: string[]): void {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    const rel = path.relative(wikiRoot, full).split(path.sep).join("/");
    if (e.isDirectory()) {
      if (BUNDLE_EXCLUDE_DIRS.has(e.name)) continue;
      walkConcepts(wikiRoot, full, out);
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
