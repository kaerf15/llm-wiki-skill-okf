/**
 * OKF (Open Knowledge Format) v0.1 bundle conventions.
 * @see https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
 */

/** OKF spec version this project targets. */
export const OKF_VERSION = "0.1";

/** Default knowledge folder (replaces legacy `wiki/`). User may rename. */
export const DEFAULT_KB_DIR = "wiki-okf";

/** Legacy Karpathy knowledge subfolder. */
export const LEGACY_WIKI_DIR = "wiki";

/** @deprecated Use DEFAULT_KB_DIR — kept for backward-compatible imports. */
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

/** Legacy Karpathy layout index (backward compatible). */
export const LEGACY_INDEX_PATH = "wiki/index.md";

/** Knowledge-base type profiles for scaffolding. */
export const KB_TYPES = {
  research: {
    label: "Research Wiki",
    description: "Karpathy-style research: concepts, entities, summaries",
    conceptDirs: ["concepts", "entities", "summaries"],
    defaultTypes: {
      concepts: "Concept",
      entities: "Entity",
      summaries: "Summary",
    },
  },
  catalog: {
    label: "Data Catalog",
    description: "Data assets: datasets, tables, metrics (OKF catalog pattern)",
    conceptDirs: ["datasets", "tables", "metrics"],
    defaultTypes: {
      datasets: "Dataset",
      tables: "Table",
      metrics: "Metric",
    },
  },
  operations: {
    label: "Operations",
    description: "Runbooks, playbooks, and operational references",
    conceptDirs: ["playbooks", "runbooks", "references"],
    defaultTypes: {
      playbooks: "Playbook",
      runbooks: "Runbook",
      references: "Reference",
    },
  },
  general: {
    label: "General",
    description: "Minimal OKF bundle — add concept folders as needed",
    conceptDirs: ["topics"],
    defaultTypes: {
      topics: "Topic",
    },
  },
} as const;

export type KbType = keyof typeof KB_TYPES;

export function isKbType(value: string): value is KbType {
  return value in KB_TYPES;
}
