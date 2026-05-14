import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const cljsRoot = resolve(dirname(__filename), "..");
const integrationRoot = resolve(cljsRoot, "..");
const repoRoot = resolve(integrationRoot, "../..");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const version = process.env.CLOJURESCRIPT_PACKAGE_VERSION || packageJson.version;
const groupId = process.env.CLOJURESCRIPT_GROUP_ID || "org.angular.ts";
const artifactId = process.env.CLOJURESCRIPT_ARTIFACT_ID || "angular-ts-cljs";
const targetDir = resolve(cljsRoot, "target");
const classesDir = resolve(targetDir, "package/classes");
const jarPath = resolve(targetDir, `${artifactId}-${version}.jar`);
const pomPath = resolve(targetDir, `${artifactId}-${version}.pom`);

function assertFile(path, description) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${description}: ${path}`);
  }
}

assertFile(resolve(cljsRoot, "src/angular_ts/generated.cljs"), "generated ClojureScript facade");
assertFile(resolve(integrationRoot, "externs/angular-ts.externs.js"), "AngularTS Closure externs");
assertFile(resolve(repoRoot, "LICENSE"), "repository license");

rmSync(resolve(targetDir, "package"), { force: true, recursive: true });
mkdirSync(resolve(classesDir, "angular_ts/externs"), { recursive: true });
mkdirSync(resolve(classesDir, "META-INF"), { recursive: true });

cpSync(resolve(cljsRoot, "src"), resolve(classesDir), { recursive: true });
copyFileSync(
  resolve(integrationRoot, "externs/angular-ts.externs.js"),
  resolve(classesDir, "angular_ts/externs/angular-ts.externs.js"),
);
copyFileSync(resolve(repoRoot, "LICENSE"), resolve(classesDir, "META-INF/LICENSE"));
copyFileSync(resolve(cljsRoot, "README.md"), resolve(classesDir, "META-INF/README.md"));

const pom = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${groupId}</groupId>
  <artifactId>${artifactId}</artifactId>
  <version>${version}</version>
  <name>AngularTS ClojureScript Facade</name>
  <description>Generated ClojureScript facade and Closure externs for AngularTS.</description>
  <url>https://github.com/angular-wave/angular.ts</url>
  <licenses>
    <license>
      <name>MIT</name>
      <url>https://opensource.org/license/mit</url>
    </license>
  </licenses>
  <scm>
    <url>https://github.com/angular-wave/angular.ts</url>
    <connection>scm:git:https://github.com/angular-wave/angular.ts.git</connection>
    <developerConnection>scm:git:https://github.com/angular-wave/angular.ts.git</developerConnection>
  </scm>
</project>
`;

mkdirSync(targetDir, { recursive: true });
writeFileSync(pomPath, pom);
rmSync(jarPath, { force: true });
execFileSync("jar", ["cf", jarPath, "-C", classesDir, "."], { stdio: "inherit" });

console.log(`Created ${jarPath}`);
console.log(`Created ${pomPath}`);
