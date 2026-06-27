/**
 * OKF (Open Knowledge Format) v0.1 bundle conventions.
 * @see https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
 */

/** OKF spec version this project targets. */
export const OKF_VERSION = "0.1";

/** Default knowledge subfolder under project root. User may rename. */
export const DEFAULT_KB_DIR = "wiki";

/** @deprecated Use DEFAULT_KB_DIR */
export const DEFAULT_BUNDLE_DIR = DEFAULT_KB_DIR;

/** Directories excluded from concept scanning (producer extensions). */
export const BUNDLE_EXCLUDE_DIRS = new Set([
  "audit",
  "raw",
  "log",
  "outputs",
  ".agents",
  ".git",
  "node_modules",
]);

/** Root-level meta files — not navigable concepts. */
export const BUNDLE_META_FILES = new Set(["AGENTS.md", "CLAUDE.md"]);

/** Reserved OKF filenames (not concept documents). */
export const OKF_RESERVED_FILENAMES = new Set(["index.md", "log.md"]);

/** Root index path for OKF bundles. */
export const OKF_INDEX_PATH = "index.md";

/** Concept directories under the knowledge root. */
export const CONCEPT_DIRS = ["concepts", "entities", "summaries"] as const;
