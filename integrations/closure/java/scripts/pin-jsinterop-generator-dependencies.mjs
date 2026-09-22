import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const pinnedModules = new Set(["j2cl", "jsinterop_base"]);

export function pinJsInteropGeneratorDependencies(source) {
  const lines = source.match(/.*(?:\n|$)/gu) ?? [];
  const output = [];
  const removed = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== "archive_override(") {
      output.push(lines[index]);
      continue;
    }

    const block = [lines[index]];
    let depth = 1;
    while (depth > 0 && index + 1 < lines.length) {
      index += 1;
      const line = lines[index];
      block.push(line);
      depth += (line.match(/\(/gu) ?? []).length;
      depth -= (line.match(/\)/gu) ?? []).length;
    }

    const moduleName = /module_name\s*=\s*"([^"]+)"/u.exec(block.join(""))?.[1];
    if (!moduleName || !pinnedModules.has(moduleName)) {
      output.push(...block);
      continue;
    }

    removed.add(moduleName);
    if (output.at(-1)?.startsWith("# Use head ")) output.pop();
    if (output.at(-1)?.trim() === "") output.pop();
  }

  const missing = [...pinnedModules].filter((moduleName) => !removed.has(moduleName));
  if (missing.length > 0) {
    throw new Error(`Missing unpinned jsinterop-generator overrides: ${missing.join(", ")}`);
  }

  return output.join("");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: pin-jsinterop-generator-dependencies.mjs MODULE.bazel");
  writeFileSync(path, pinJsInteropGeneratorDependencies(readFileSync(path, "utf8")));
}
