#!/usr/bin/env node

import { access, readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const externalPattern = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu;

async function filesBelow(directory, current = directory) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(directory, path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function htmlReferences(html) {
  const references = [];
  const pattern = /\b(?:href|src)\s*=\s*(["'])(.*?)\1/giu;
  for (const match of html.matchAll(pattern)) references.push(match[2]);
  return references;
}

function htmlAnchors(html) {
  const anchors = new Set();
  const pattern = /\b(?:id|name)\s*=\s*(["'])(.*?)\1/giu;
  for (const match of html.matchAll(pattern)) anchors.add(match[2]);
  return anchors;
}

async function existingTarget(path) {
  const candidates = [path, `${path}.html`, resolve(path, "index.html")];
  for (const candidate of candidates) {
    try {
      const details = await stat(candidate);
      if (details.isDirectory()) {
        const index = resolve(candidate, "index.html");
        await access(index);
        return index;
      }
      if (details.isFile()) return candidate;
    } catch {}
  }
  return undefined;
}

function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

export async function checkLinks(directory) {
  const root = resolve(directory);
  const documents = (await filesBelow(root)).filter((path) => path.endsWith(".html"));
  const anchors = new Map();
  const sources = new Map();
  for (const document of documents) {
    const source = await readFile(document, "utf8");
    sources.set(document, source);
    anchors.set(document, htmlAnchors(source));
  }

  const errors = [];
  let references = 0;
  for (const document of documents) {
    for (const rawReference of htmlReferences(sources.get(document))) {
      const reference = rawReference.replaceAll("&amp;", "&").trim();
      if (!reference || externalPattern.test(reference)) continue;
      references += 1;
      const hashAt = reference.indexOf("#");
      const rawFragment = hashAt === -1 ? "" : reference.slice(hashAt + 1);
      const withoutFragment = hashAt === -1 ? reference : reference.slice(0, hashAt);
      const rawPath = withoutFragment.split("?", 1)[0];
      const path = decode(rawPath);
      const fragment = decode(rawFragment);
      const sourceName = relative(root, document).replaceAll(sep, "/");
      if (path === undefined || fragment === undefined) {
        errors.push(`${sourceName}: invalid URL encoding in ${rawReference}`);
        continue;
      }
      const candidate = path.length === 0
        ? document
        : path.startsWith("/")
          ? resolve(root, `.${path}`)
          : resolve(dirname(document), path);
      const relativeCandidate = relative(root, candidate);
      if (relativeCandidate === ".." || relativeCandidate.startsWith(`..${sep}`)) {
        errors.push(`${sourceName}: link escapes the site root: ${rawReference}`);
        continue;
      }
      const target = await existingTarget(candidate);
      if (target === undefined) {
        errors.push(`${sourceName}: missing target: ${rawReference}`);
        continue;
      }
      if (fragment && target.endsWith(".html") && !anchors.get(target)?.has(fragment)) {
        errors.push(`${sourceName}: missing fragment #${fragment}: ${rawReference}`);
      }
    }
  }
  return { documents: documents.length, references, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve(process.argv[2] ?? "public");
  const result = await checkLinks(directory);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(error);
    console.error(`${result.errors.length} broken local documentation links.`);
    process.exitCode = 1;
  } else {
    console.log(
      `Checked ${result.references} local links across ${result.documents} documentation pages.`,
    );
  }
}
