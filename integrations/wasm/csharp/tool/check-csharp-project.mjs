import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const projectUrl = new URL("../src/AngularTs.Wasm.csproj", import.meta.url);
const projectPath = projectUrl.pathname;
const project = readFileSync(projectUrl, "utf8");
const dotnet = process.env.DOTNET || "dotnet";

const required = [
  '<Project Sdk="Microsoft.NET.Sdk">',
  "<TargetFramework>net8.0</TargetFramework>",
  "<RootNamespace>AngularTs.Wasm</RootNamespace>",
  "<ImplicitUsings>disable</ImplicitUsings>",
  "<Nullable>enable</Nullable>",
  "<AllowUnsafeBlocks>true</AllowUnsafeBlocks>",
  "<AngularTsWasmRuntimeIdentifier",
  "browser-wasm",
  "<RuntimeIdentifier>$(AngularTsWasmRuntimeIdentifier)</RuntimeIdentifier>",
  "<SelfContained>true</SelfContained>",
];

const missing = required.filter((fragment) => !project.includes(fragment));

if (missing.length > 0) {
  console.error("C# Wasm project file is missing required fragments:");
  for (const fragment of missing) {
    console.error(`- ${fragment}`);
  }
  process.exit(1);
}

const dotnetInfo = spawnSync(dotnet, ["--info"], {
  encoding: "utf8",
  stdio: "ignore",
});

if (dotnetInfo.error?.code === "ENOENT") {
  console.log("C# Wasm project file check passed; dotnet SDK is not installed, compile validation skipped.");
  process.exit(0);
}

if (dotnetInfo.status !== 0) {
  console.error("dotnet --info failed; cannot validate C# facade compilation.");
  process.exit(dotnetInfo.status ?? 1);
}

const build = spawnSync(dotnet, ["build", projectPath, "--nologo"], {
  encoding: "utf8",
  stdio: "inherit",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

console.log("C# Wasm facade compile validation passed.");
