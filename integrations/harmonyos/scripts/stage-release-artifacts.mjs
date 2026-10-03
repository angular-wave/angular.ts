#!/usr/bin/env node

import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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

export function releaseDependencyManifest(records, packages, version) {
  return {
    schemaVersion: 1,
    version,
    packages: records.map((record) => ({
      module: record.module,
      package: record.package,
      version: record.version,
      file: record.file,
      dependencies: packages.get(record.module)?.dependencies ?? {},
    })),
  };
}

export function releaseSpdx(records, dependencyManifest, context) {
  const identifiers = new Map(records.map((record) => [
    record.package,
    `SPDXRef-Package-${record.module.replaceAll(/[^A-Za-z0-9.-]/gu, "-")}`,
  ]));
  const relationships = records.map((record) => ({
    spdxElementId: "SPDXRef-DOCUMENT",
    relationshipType: "DESCRIBES",
    relatedSpdxElement: identifiers.get(record.package),
  }));
  for (const package_ of dependencyManifest.packages) {
    for (const dependency of Object.keys(package_.dependencies)) {
      const dependencyIdentifier = identifiers.get(dependency);
      if (dependencyIdentifier !== undefined) {
        relationships.push({
          spdxElementId: identifiers.get(package_.package),
          relationshipType: "DEPENDS_ON",
          relatedSpdxElement: dependencyIdentifier,
        });
      }
    }
  }
  return {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: `AngularTS-Native-HarmonyOS-${dependencyManifest.version}`,
    documentNamespace: `https://github.com/angular-wave/angular.ts/releases/download/v${dependencyManifest.version}/harmonyos-${context.commit ?? "local"}.spdx.json`,
    creationInfo: {
      created: context.created,
      creators: ["Tool: AngularTS HarmonyOS release staging"],
    },
    packages: records.map((record) => ({
      SPDXID: identifiers.get(record.package),
      name: record.package,
      versionInfo: record.version,
      downloadLocation: "NOASSERTION",
      filesAnalyzed: false,
      licenseConcluded: "MIT",
      licenseDeclared: "MIT",
      copyrightText: "NOASSERTION",
      checksums: [{ algorithm: "SHA256", checksumValue: record.sha256 }],
    })),
    relationships,
  };
}

export function releaseProvenance(records, version, context) {
  const resolvedDependencies = context.repository && context.commit
    ? [{ uri: context.repository, digest: { gitCommit: context.commit } }]
    : [];
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: records.map((record) => ({
      name: record.file,
      digest: { sha256: record.sha256 },
    })),
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType: "https://angular-wave.github.io/angular.ts/buildtypes/harmonyos-har/v1",
        externalParameters: {
          version,
          packages: records.map((record) => record.package),
        },
        internalParameters: {},
        resolvedDependencies,
      },
      runDetails: {
        builder: { id: context.builder },
        metadata: { invocationId: context.invocationId },
      },
    },
  };
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function releaseContext(environment = process.env) {
  const commit = /^[0-9a-f]{40}$/u.test(environment.GITHUB_SHA ?? "")
    ? environment.GITHUB_SHA
    : undefined;
  const repository = environment.GITHUB_REPOSITORY
    ? `https://github.com/${environment.GITHUB_REPOSITORY}`
    : undefined;
  const runId = /^[1-9][0-9]*$/u.test(environment.GITHUB_RUN_ID ?? "")
    ? environment.GITHUB_RUN_ID
    : undefined;
  const epoch = environment.SOURCE_DATE_EPOCH;
  const created = epoch === undefined
    ? new Date().toISOString()
    : new Date(Number.parseInt(epoch, 10) * 1000).toISOString();
  return {
    commit,
    repository,
    created,
    builder: runId === undefined
      ? "https://github.com/angular-wave/angular.ts/tree/local"
      : `https://github.com/${environment.GITHUB_REPOSITORY}/actions/runs/${runId}`,
    invocationId: runId ?? "local",
  };
}

async function main() {
  const output = resolve(process.argv[2] ?? resolve(root, "release"));
  const artifacts = JSON.parse(
    await readFile(resolve(root, "harmony-artifacts.json"), "utf8"),
  );
  const repository = JSON.parse(await readFile(resolve(root, "../../package.json"), "utf8"));
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const records = [];
  const packages = new Map();
  for (const artifact of artifacts) {
    packages.set(artifact.module, JSON.parse(await readFile(
      resolve(root, "packages", artifact.module, "oh-package.json5"),
      "utf8",
    )));
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
  const context = releaseContext();
  const dependencies = releaseDependencyManifest(records, packages, repository.version);
  const metadata = {
    "dependencies.json": json(dependencies),
    "sbom.spdx.json": json(releaseSpdx(records, dependencies, context)),
    "provenance.intoto.json": json(releaseProvenance(records, repository.version, context)),
  };
  await writeFile(
    resolve(output, "manifest.json"),
    json({
      version: repository.version,
      artifacts: records,
      metadata: ["LICENSE", ...Object.keys(metadata)],
    }),
  );
  await cp(resolve(root, "../../LICENSE"), resolve(output, "LICENSE"));
  for (const [name, content] of Object.entries(metadata)) {
    await writeFile(resolve(output, name), content);
  }
  const checksummedFiles = [
    ...records.map((record) => record.file),
    "LICENSE",
    "dependencies.json",
    "manifest.json",
    "provenance.intoto.json",
    "sbom.spdx.json",
  ].sort();
  await writeFile(
    resolve(output, "SHA256SUMS"),
    (await Promise.all(checksummedFiles.map(async (file) => {
      const content = await readFile(resolve(output, file));
      return `${createHash("sha256").update(content).digest("hex")}  ${file}\n`;
    }))).join(""),
  );
  const manifestSize = (await stat(resolve(output, "manifest.json"))).size;
  if (manifestSize === 0) throw new Error("HarmonyOS release manifest is empty");
  console.log(`Staged ${records.length} HarmonyOS HAR files for ${repository.version}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
