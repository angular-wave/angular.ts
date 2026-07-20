import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const dotnet = process.env.DOTNET || "dotnet";
const project = join(root, "examples/todo/CsharpTodo.csproj");
const exampleDir = join(root, "examples/todo");
const outputDir = join(root, "examples/todo/bin/publish");
const frameworkDir = join(exampleDir, "_framework");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.error?.code === "ENOENT") {
    console.error(`${command} is not installed.`);
    process.exit(127);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function findFrameworkDir(dir) {
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = existsSync(current)
      ? readdirSync(current, { withFileTypes: true })
      : [];

    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      }
    }

    if (
      entries.some((entry) => entry.isFile() && entry.name === "dotnet.js") &&
      entries.some(
        (entry) => entry.isFile() && entry.name === "blazor.boot.json",
      )
    ) {
      return current;
    }
  }

  return undefined;
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

run(dotnet, [
  "publish",
  project,
  "-c",
  "Release",
  "--nologo",
  "-warnaserror",
  "-o",
  outputDir,
]);

const appBundleFrameworkDir = findFrameworkDir(join(exampleDir, "bin"));

if (!appBundleFrameworkDir) {
  console.error(
    `Unable to find _framework with dotnet.js and blazor.boot.json under ${relative(root, join(exampleDir, "bin"))} after publish.`,
  );
  process.exit(1);
}

rmSync(frameworkDir, { recursive: true, force: true });

cpSync(appBundleFrameworkDir, frameworkDir, {
  recursive: true,
  force: true,
});

console.log(
  `C# todo browser output copied from ${relative(root, appBundleFrameworkDir)}.`,
);
