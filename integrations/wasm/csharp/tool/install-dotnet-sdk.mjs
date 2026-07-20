import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const installDir = resolve(process.env.DOTNET_INSTALL_DIR || join(root, ".dotnet"));
const scriptDir = resolve(process.env.DOTNET_INSTALL_SCRIPT_DIR || join(root, ".dotnet-install"));
const channel = process.env.DOTNET_CHANNEL || "8.0";
const dotnet = join(installDir, "dotnet");
const installScript = join(scriptDir, "dotnet-install.sh");
const installUrl = "https://dot.net/v1/dotnet-install.sh";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });

  if (result.error?.code === "ENOENT") {
    console.error(`${command} is not installed.`);
    process.exit(127);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function download() {
  mkdirSync(scriptDir, { recursive: true });

  const curl = spawnSync("curl", [
    "--fail",
    "--location",
    "--silent",
    "--show-error",
    "--output",
    installScript,
    installUrl,
  ], { stdio: "inherit" });

  if (curl.status === 0) return;
  if (curl.error && curl.error.code !== "ENOENT") process.exit(curl.status ?? 1);

  run("wget", ["--quiet", "--output-document", installScript, installUrl]);
}

if (!existsSync(dotnet)) {
  download();
  chmodSync(installScript, 0o755);
  run("bash", [
    installScript,
    "--channel",
    channel,
    "--install-dir",
    installDir,
    "--no-path",
  ]);
}

run(dotnet, ["--info"], {
  env: {
    ...process.env,
    DOTNET_ROOT: installDir,
    PATH: `${installDir}:${process.env.PATH ?? ""}`,
  },
});

console.log(`Local .NET SDK is available at ${dotnet}.`);
