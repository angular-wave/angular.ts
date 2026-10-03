#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const harmonyRoot = resolve(root, "integrations/harmonyos");
const proof = await readFile(
  resolve(harmonyRoot, "entry/src/main/resources/rawfile/proof.html"),
  "utf8",
);

for (const name of ["angular-ts.esm.js", "runtime/native.js"]) {
  await access(resolve(root, "dist", name));
  if (!proof.includes(`./dist/${name}`)) {
    throw new Error(`HarmonyOS proof must import packaged ./dist/${name}`);
  }
}

if (/from\s+["']\/dist\//u.test(proof) || proof.includes("127.0.0.1")) {
  throw new Error("HarmonyOS proof must not depend on a development server");
}

console.log("HarmonyOS proof uses packaged AngularTS assets.");
