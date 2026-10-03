#!/usr/bin/env node

import { createHash } from "node:crypto";
import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

export function releaseArtifactRecord(artifact, version, content) {
  return {
    module: artifact.module,
    package: artifact.package,
    version,
    file: `${artifact.module}.${artifact.extension}`,
    bytes: content.byteLength,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

async function main() {
  const output = resolve(process.argv[2] ?? resolve(root, "release"));
  const artifacts = JSON.parse(
    await readFile(resolve(root, "harmony-artifacts.json"), "utf8"),
  );
  const repository = JSON.parse(await readFile(resolve(root, "../../package.json"), "utf8"));
  await mkdir(output, { recursive: true });
  const records = [];
  for (const artifact of artifacts) {
    const source = resolve(
      root,
      "packages",
      artifact.module,
      "build/default/outputs/default",
      `${artifact.module}.${artifact.extension}`,
    );
    const content = await readFile(source);
    const record = releaseArtifactRecord(artifact, repository.version, content);
    if (record.bytes > artifact.maximumBytes) {
      throw new Error(`${record.file} exceeds ${artifact.maximumBytes} bytes`);
    }
    await cp(source, resolve(output, record.file));
    records.push(record);
  }
  await writeFile(
    resolve(output, "manifest.json"),
    `${JSON.stringify({ version: repository.version, artifacts: records }, null, 2)}\n`,
  );
  await writeFile(
    resolve(output, "SHA256SUMS"),
    records.map(({ sha256, file }) => `${sha256}  ${file}\n`).join(""),
  );
  const manifestSize = (await stat(resolve(output, "manifest.json"))).size;
  if (manifestSize === 0) throw new Error("HarmonyOS release manifest is empty");
  console.log(`Staged ${records.length} HarmonyOS HAR files for ${repository.version}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
