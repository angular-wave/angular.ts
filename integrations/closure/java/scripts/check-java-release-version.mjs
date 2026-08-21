import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const javaDirectory = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = path.resolve(javaDirectory, "../../..");
const packageVersion = JSON.parse(
  readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
).version;
const maven = process.env.MAVEN || "mvn";

const checks = [
  ["bindings version", "pom.xml", "project.version", packageVersion],
  ["bindings SCM tag", "pom.xml", "project.scm.tag", `v${packageVersion}`],
  [
    "demo bindings version",
    "demo/pom.xml",
    "angular.ts.java.version",
    packageVersion,
  ],
  [
    "demo project version",
    "demo/pom.xml",
    "project.version",
    `${packageVersion}-SNAPSHOT`,
  ],
];

for (const [label, pom, expression, expected] of checks) {
  const actual = evaluate(path.join(javaDirectory, pom), expression);

  if (actual !== expected) {
    throw new Error(`${label} is ${actual}; expected ${expected}`);
  }
}

console.log(`Java release metadata matches ${packageVersion}.`);

function evaluate(pom, expression) {
  const output = execFileSync(
    maven,
    [
      "--quiet",
      "--no-transfer-progress",
      "--file",
      pom,
      "help:evaluate",
      `-Dexpression=${expression}`,
      "-DforceStdout",
      "-Dstyle.color=never",
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );

  return output.replaceAll(/\u001b\[[0-9;]*m/g, "").trim();
}
