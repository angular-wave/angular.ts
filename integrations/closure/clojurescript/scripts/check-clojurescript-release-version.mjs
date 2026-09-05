import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clojurescriptDirectory = fileURLToPath(new URL("../", import.meta.url));
const repositoryRoot = path.resolve(clojurescriptDirectory, "../../..");
const packageVersion = JSON.parse(
  readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
).version;
const maven = process.env.MAVEN || "mvn";

const checks = [
  ["facade version", "project.version", packageVersion],
  ["facade SCM tag", "project.scm.tag", `v${packageVersion}`],
];

for (const [label, expression, expected] of checks) {
  const actual = evaluate(expression);

  if (actual !== expected) {
    throw new Error(`${label} is ${actual}; expected ${expected}`);
  }
}

const readme = readFileSync(
  path.join(clojurescriptDirectory, "README.md"),
  "utf8",
);

if (
  !readme.includes(
    `[io.github.angular-wave/angular-ts-cljs "${packageVersion}"]`,
  )
) {
  throw new Error(
    `ClojureScript README must document dependency version ${packageVersion}.`,
  );
}

console.log(`ClojureScript release metadata matches ${packageVersion}.`);

function evaluate(expression) {
  const output = execFileSync(
    maven,
    [
      "--quiet",
      "--no-transfer-progress",
      "--file",
      path.join(clojurescriptDirectory, "pom.xml"),
      "help:evaluate",
      `-Dexpression=${expression}`,
      "-DforceStdout",
      "-Dstyle.color=never",
    ],
    { cwd: repositoryRoot, encoding: "utf8" },
  );

  return output.replaceAll(/\u001b\[[0-9;]*m/g, "").trim();
}
