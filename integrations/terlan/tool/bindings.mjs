import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));

function run(compiler, args, cwd) {
  const result = spawnSync(compiler, args, {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${compiler} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`,
    );
  }
  return result.stdout;
}

export function generateBindings({ compiler, runtimeRoot, output }) {
  compiler = compiler.includes(path.sep) ? path.resolve(compiler) : compiler;
  runtimeRoot = path.resolve(runtimeRoot);
  output = path.resolve(output);
  const runtime = JSON.parse(
    readFileSync(path.join(runtimeRoot, "package.json"), "utf8"),
  );
  if (runtime.name !== "@angular-wave/angular.ts") {
    throw new Error(`expected Angular.ts runtime at ${runtimeRoot}`);
  }
  const version = run(compiler, ["--version"], runtimeRoot).match(
    /\b\d+\.\d+\.\d+(?:-[\w.-]+)?\b/,
  )?.[0];
  if (!version) throw new Error("compiler did not report its version");
  const inputs = [
    ["@types/namespace.d.ts", "terlan.angular"],
    ["@types/interface.d.ts", "terlan.angular.interfaces"],
  ].map(([input, namespace]) => ({
    path: input,
    sha256: createHash("sha256")
      .update(readFileSync(path.join(runtimeRoot, input)))
      .digest("hex"),
    kind: "typescript-declaration",
    namespace,
  }));
  const manifest = {
    schema: "terlan.std.js.input-manifest.v1",
    generator: {
      name: "terlc",
      version,
      profile: "typescript-declarations",
      oxc_parser: true,
    },
    target_profile: "js.browser",
    source_package: {
      name: runtime.name,
      version: runtime.version,
      resolution: inputs[0].path,
    },
    inputs,
  };
  const staging = mkdtempSync(path.join(tmpdir(), "angular-terlan-inputs-"));
  try {
    const inputManifest = path.join(staging, "inputs.json");
    writeFileSync(inputManifest, `${JSON.stringify(manifest, null, 2)}\n`);
    run(
      compiler,
      ["bind", "typescript", "--manifest", inputManifest, "--out", output],
      runtimeRoot,
    );
    return manifest;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { values } = parseArgs({
    options: {
      compiler: { type: "string", default: process.env.TERLC || "terlc" },
      "runtime-root": {
        type: "string",
        default: path.resolve(packageRoot, "../.."),
      },
      out: {
        type: "string",
        default: path.join(packageRoot, "build/bindings"),
      },
    },
  });
  generateBindings({
    compiler: values.compiler,
    runtimeRoot: values["runtime-root"],
    output: values.out,
  });
}
