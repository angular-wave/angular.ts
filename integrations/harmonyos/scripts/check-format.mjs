#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];
await visit(root);
if (failures.length > 0) {
  console.error(`HarmonyOS formatting errors:\n${failures.map((value) => `- ${value}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log("HarmonyOS source formatting checks passed.");
}

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (["build", "oh_modules", ".harmony", ".hvigor"].includes(entry.name)) continue;
    if (entry.name === "oh-package-lock.json5") continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await visit(path);
    else if ([".ts", ".ets", ".mjs", ".json", ".json5", ".md"].includes(extname(entry.name))) {
      const source = await readFile(path, "utf8");
      if (!source.endsWith("\n")) failures.push(`${path.slice(root.length + 1)} has no final newline`);
      if (/\r/u.test(source)) failures.push(`${path.slice(root.length + 1)} contains CRLF`);
      if (/[ \t]+$/mu.test(source)) failures.push(`${path.slice(root.length + 1)} has trailing whitespace`);
    }
  }
}
