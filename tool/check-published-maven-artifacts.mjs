#!/usr/bin/env node

import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const GROUP = "io.github.angular-wave";
const GROUP_PATH = GROUP.replaceAll(".", "/");
const CENTRAL = "https://repo.maven.apache.org/maven2";
const SIGNING_FINGERPRINT = "305D365B22401CC5A42B22D07BEBA053B3890C4A";

export const artifactSpecs = {
  java: {
    artifact: "angular-ts-java",
    checksums: ["sha256", "sha512"],
    binary: [
      "org/angular/ts/Angular.class",
      "org/angular/ts/ng/Angular.class",
      "org/angular/ts/processor/AngularClosureProcessor.class",
      "org/angular/ts/Angular.java",
      "org/angular/ts/ng/NgModule.java",
      "org/angular/ts/annotation/AngularEntryPoint.java",
      "META-INF/externs/angular-ts.externs.js",
    ],
    sources: [
      "org/angular/ts/Angular.java",
      "org/angular/ts/ng/Angular.java",
      "org/angular/ts/ng/NgModule.java",
      "org/angular/ts/annotation/AngularEntryPoint.java",
      "org/angular/ts/processor/AngularClosureProcessor.java",
    ],
    javadoc: ["index.html"],
  },
  clojurescript: {
    artifact: "angular-ts-cljs",
    checksums: ["sha256", "sha512"],
    binary: [
      "angular_ts/core.cljs",
      "angular_ts/generated.cljs",
      "angular_ts/externs/angular.js",
    ],
    sources: ["angular_ts/core.cljs", "angular_ts/generated.cljs"],
    javadoc: ["README.md"],
  },
  scala: {
    artifact: "angular-ts-scala_sjs1_3",
    checksums: ["sha1"],
    binary: ["angular/ts/AngularTS$.sjsir"],
    sources: ["angular/ts/AngularTS.scala", "angular/ts/ModelController.scala"],
    javadoc: ["index.html"],
  },
};

export function parseArguments(argv) {
  const values = { artifacts: [], version: "", waitSeconds: 0 };

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    const value = argv[index + 1];

    if (argument === "--version" && value) {
      values.version = value;
      index++;
    } else if (argument === "--artifacts" && value) {
      values.artifacts = value.split(",").filter(Boolean);
      index++;
    } else if (argument === "--wait-seconds" && value) {
      values.waitSeconds = Number(value);
      index++;
    } else {
      throw new Error(`Unknown or incomplete argument '${argument}'.`);
    }
  }

  if (!/^\d+\.\d+\.\d+$/u.test(values.version)) {
    throw new Error("--version must be a semantic version such as 0.34.0.");
  }
  if (!values.artifacts.length) {
    throw new Error("--artifacts must select at least one artifact.");
  }
  for (const artifact of values.artifacts) {
    if (!(artifact in artifactSpecs)) {
      throw new Error(`Unknown Maven artifact '${artifact}'.`);
    }
  }
  if (!Number.isFinite(values.waitSeconds) || values.waitSeconds < 0) {
    throw new Error("--wait-seconds must be a non-negative number.");
  }

  return values;
}

export function validateChecksum(bytes, expected, algorithm, name) {
  const actual = createHash(algorithm).update(bytes).digest("hex");
  const normalized = expected.trim().split(/\s+/u)[0]?.toLowerCase();

  if (actual !== normalized) {
    throw new Error(`${name} has an invalid ${algorithm} checksum.`);
  }
}

export function validatePom(source, artifact, version) {
  const required = [
    `<groupId>${GROUP}</groupId>`,
    `<artifactId>${artifact}</artifactId>`,
    `<version>${version}</version>`,
  ];

  for (const value of required) {
    if (!source.includes(value)) {
      throw new Error(`${artifact}-${version}.pom is missing '${value}'.`);
    }
  }
}

export function validateEntries(entries, required, name) {
  const available = new Set(entries.split(/\r?\n/u).filter(Boolean));

  for (const entry of required) {
    if (!available.has(entry)) {
      throw new Error(`${name} is missing '${entry}'.`);
    }
  }
}

async function fetchPublished(url, deadline) {
  for (;;) {
    const response = await fetch(url);

    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (response.status !== 404 || Date.now() >= deadline) {
      throw new Error(`${url} returned HTTP ${response.status}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
  }

  return result.stdout;
}

async function validateFile(
  baseUrl,
  name,
  algorithms,
  directory,
  deadline,
  gpgHome,
) {
  const [bytes, signature, ...checksums] = await Promise.all([
    fetchPublished(`${baseUrl}/${name}`, deadline),
    fetchPublished(`${baseUrl}/${name}.asc`, deadline),
    ...algorithms.map((algorithm) =>
      fetchPublished(`${baseUrl}/${name}.${algorithm}`, deadline),
    ),
  ]);

  for (const [index, algorithm] of algorithms.entries()) {
    validateChecksum(bytes, checksums[index].toString("utf8"), algorithm, name);
  }

  const artifactPath = join(directory, name);
  const signaturePath = `${artifactPath}.asc`;
  writeFileSync(artifactPath, bytes);
  writeFileSync(signaturePath, signature);

  const status = run("gpg", [
    "--batch",
    "--homedir",
    gpgHome,
    "--status-fd=1",
    "--verify",
    signaturePath,
    artifactPath,
  ]);

  if (!status.includes(`VALIDSIG ${SIGNING_FINGERPRINT}`)) {
    throw new Error(`${name} was not signed by the AngularTS release key.`);
  }

  return { bytes, path: artifactPath };
}

async function validateArtifact(name, version, deadline, directory, gpgHome) {
  const spec = artifactSpecs[name];
  const baseName = `${spec.artifact}-${version}`;
  const baseUrl = `${CENTRAL}/${GROUP_PATH}/${spec.artifact}/${version}`;
  const files = [
    { file: `${baseName}.jar`, entries: spec.binary },
    { file: `${baseName}-sources.jar`, entries: spec.sources },
    { file: `${baseName}-javadoc.jar`, entries: spec.javadoc },
  ];

  const pom = await validateFile(
    baseUrl,
    `${baseName}.pom`,
    spec.checksums,
    directory,
    deadline,
    gpgHome,
  );
  validatePom(pom.bytes.toString("utf8"), spec.artifact, version);

  for (const item of files) {
    const artifact = await validateFile(
      baseUrl,
      item.file,
      spec.checksums,
      directory,
      deadline,
      gpgHome,
    );
    validateEntries(run("jar", ["tf", artifact.path]), item.entries, item.file);
  }

  console.log(
    `Validated ${GROUP}:${spec.artifact}:${version} from Maven Central.`,
  );
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const directory = mkdtempSync(join(tmpdir(), "angular-ts-maven-"));
  const gpgHome = join(directory, "gnupg");
  const deadline = Date.now() + options.waitSeconds * 1000;

  try {
    chmodSync(directory, 0o700);
    run("mkdir", [gpgHome]);
    chmodSync(gpgHome, 0o700);
    run("gpg", [
      "--batch",
      "--homedir",
      gpgHome,
      "--import",
      fileURLToPath(new URL("./maven-release-public-key.asc", import.meta.url)),
    ]);

    for (const artifact of options.artifacts) {
      await validateArtifact(
        artifact,
        options.version,
        deadline,
        directory,
        gpgHome,
      );
    }
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

if (pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
