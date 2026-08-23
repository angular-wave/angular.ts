import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "docs/content/docs");
const staticRoot = path.join(root, "docs/static");
const errors = [];
let checkedLinks = 0;

function walk(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(entryPath, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [entryPath] : [];
  });
}

function pageUrl(file) {
  const relative = path.relative(contentRoot, file).replaceAll(path.sep, "/");
  if (relative === "_index.md") return "/docs/";
  if (relative.endsWith("/_index.md")) {
    return `/docs/${relative.slice(0, -"_index.md".length)}`;
  }
  return `/docs/${relative.slice(0, -3)}/`;
}

function contentCandidates(urlPath) {
  const relative = decodeURIComponent(urlPath.slice("/docs/".length)).replace(
    /\/$/,
    "",
  );
  if (!relative) return [path.join(contentRoot, "_index.md")];
  return [
    path.join(contentRoot, `${relative}.md`),
    path.join(contentRoot, relative, "_index.md"),
  ];
}

function targetCandidates(urlPath) {
  if (urlPath === "/docs" || urlPath.startsWith("/docs/")) {
    return contentCandidates(urlPath === "/docs" ? "/docs/" : urlPath);
  }
  const relative = decodeURIComponent(urlPath.replace(/^\//, ""));
  return [
    path.join(staticRoot, relative),
    path.join(staticRoot, relative, "index.html"),
  ];
}

function markdownAnchors(file) {
  const source = readFileSync(file, "utf8");
  const counts = new Map();
  const anchors = new Set();
  for (const match of source.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const base = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/[`*_~]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

function hasFragment(file, fragment) {
  const decoded = decodeURIComponent(fragment);
  if (file.endsWith(".md")) return markdownAnchors(file).has(decoded);
  if (!file.endsWith(".html")) return true;
  const html = readFileSync(file, "utf8");
  const escaped = decoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:id|name)=["']${escaped}["']`).test(html);
}

for (const file of walk(contentRoot, ".md")) {
  const source = readFileSync(file, "utf8");
  const sourceUrl = pageUrl(file);
  for (const match of source.matchAll(
    /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
  )) {
    const href = match[1].replace(/^<|>$/g, "");
    if (
      /^(?:https?:|mailto:|tel:|javascript:)/.test(href) ||
      href.includes("{{")
    ) {
      continue;
    }

    checkedLinks += 1;
    const resolved = new URL(href, `https://docs.invalid${sourceUrl}`);
    const candidates = targetCandidates(resolved.pathname);
    const target = candidates.find((candidate) => existsSync(candidate));

    if (!target) {
      errors.push(
        `${path.relative(root, file)}: missing target ${resolved.pathname} from ${href}`,
      );
      continue;
    }

    if (resolved.hash && !hasFragment(target, resolved.hash.slice(1))) {
      errors.push(
        `${path.relative(root, file)}: missing fragment ${resolved.hash} in ${path.relative(root, target)}`,
      );
    }
  }
}

if (errors.length) {
  console.error("Documentation link validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `${checkedLinks} internal documentation links and fragments resolve to tracked content.`,
  );
}
