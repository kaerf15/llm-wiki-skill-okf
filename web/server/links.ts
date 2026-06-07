import fs from "node:fs";
import path from "node:path";

/** Standard markdown link: [text](href) */
export const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

export interface ParsedLink {
  text: string;
  href: string;
}

export interface ResolvedWikiLink {
  /** Path relative to wiki root, e.g. wiki/concepts/Foo.md */
  path: string;
  exists: boolean;
}

export function extractMarkdownLinks(text: string): ParsedLink[] {
  const out: ParsedLink[] = [];
  MD_LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MD_LINK_RE.exec(text))) {
    out.push({ text: m[1]!, href: m[2]!.trim() });
  }
  return out;
}

function isExternalHref(href: string): boolean {
  return /^(https?:|mailto:|#)/i.test(href);
}

function decodeHrefPath(pathPart: string): string {
  try {
    return decodeURIComponent(pathPart);
  } catch {
    return pathPart;
  }
}

/**
 * Resolve a markdown link target to a wiki page path.
 * Supports paths relative to wiki root (wiki/...) or relative to the source file.
 */
export function resolveWikiLink(
  wikiRoot: string,
  fromRelPath: string | undefined,
  href: string,
): ResolvedWikiLink | null {
  if (!href || isExternalHref(href)) return null;

  const pathPart = href.split("#", 1)[0] ?? href;
  if (!pathPart) return null;

  let candidate = decodeHrefPath(pathPart).replace(/\\/g, "/");
  if (!candidate.endsWith(".md")) candidate += ".md";

  let full: string;
  if (candidate.startsWith("wiki/") || candidate.startsWith("raw/")) {
    full = path.join(wikiRoot, candidate);
  } else if (fromRelPath) {
    full = path.resolve(path.dirname(path.join(wikiRoot, fromRelPath)), candidate);
  } else {
    full = path.join(wikiRoot, candidate);
  }

  const rel = path.relative(wikiRoot, full).split(path.sep).join("/");
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;

  const exists = fs.existsSync(full) && fs.statSync(full).isFile();
  const pagePath = rel.endsWith(".md") ? rel : `${rel}.md`;
  return { path: pagePath, exists };
}

export function resolveWikiLinkTarget(
  wikiRoot: string,
  fromRelPath: string | undefined,
  href: string,
): string | null {
  const r = resolveWikiLink(wikiRoot, fromRelPath, href);
  return r?.exists ? r.path : r?.path ?? null;
}

export interface BacklinkEntry {
  path: string;
  title: string | null;
  text: string;
}

export function findBacklinks(wikiRoot: string, targetPath: string): BacklinkEntry[] {
  const wikiDir = path.join(wikiRoot, "wiki");
  if (!fs.existsSync(wikiDir)) return [];

  const normalizedTarget = targetPath.replace(/\\/g, "/");
  const targetStem = normalizedTarget.replace(/\.md$/, "");
  const out: BacklinkEntry[] = [];

  for (const file of collectMdFiles(wikiDir)) {
    const relFromRoot = path.relative(wikiRoot, file).split(path.sep).join("/");
    if (relFromRoot === normalizedTarget) continue;

    const text = fs.readFileSync(file, "utf-8");
    for (const link of extractMarkdownLinks(text)) {
      if (isExternalHref(link.href)) continue;
      const resolved = resolveWikiLink(wikiRoot, relFromRoot, link.href);
      if (!resolved) continue;
      const resolvedStem = resolved.path.replace(/\.md$/, "");
      if (resolved.path === normalizedTarget || resolvedStem === targetStem) {
        out.push({
          path: relFromRoot,
          title: extractTitle(text),
          text: link.text || resolved.path,
        });
      }
    }
  }
  return out;
}

export function collectMdFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...collectMdFiles(full));
    else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
  }
  return out;
}

export function extractTitle(text: string): string | null {
  const fm = /^---\n([\s\S]*?)\n---/.exec(text);
  if (fm) {
    const t = /^title:\s*(.+)$/m.exec(fm[1]!);
    if (t) return t[1]!.trim().replace(/^["']|["']$/g, "");
  }
  const h1 = /^#\s+(.+?)\s*$/m.exec(text);
  return h1 ? h1[1]! : null;
}
