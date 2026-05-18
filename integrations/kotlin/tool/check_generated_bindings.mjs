#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { generateBindings } from "./generate_kotlin_bindings.mjs";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const generatedPath = path.join(
  repoRoot,
  "integrations/kotlin/src/jsMain/kotlin/angular/ts/generated/NgFacades.kt",
);

const expected = generateBindings();
const current = fs.existsSync(generatedPath)
  ? fs.readFileSync(generatedPath, "utf8")
  : "";

if (current !== expected) {
  console.error(
    "Kotlin generated bindings are stale. Run `make -C integrations/kotlin generate`.",
  );
  process.exit(1);
}

console.log("Kotlin generated bindings are fresh.");
