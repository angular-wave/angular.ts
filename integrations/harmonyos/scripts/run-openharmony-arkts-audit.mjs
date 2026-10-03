#!/usr/bin/env node

import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { classifyOpenHarmonyAudit } from "./openharmony-audit-output.mjs";

const harmonyRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredStageDirectories = new Set([".hvigor", "build", "oh_modules"]);
const packageNames = new Map([
  ["browser", "angular-native-harmony-browser"],
  ["core", "angular-native-harmony-core"],
  ["credentials", "angular-native-harmony-credentials"],
  ["maps", "angular-native-harmony-maps"],
  ["media", "angular-native-harmony-media"],
  ["native-elements-compiler", "angular-native-harmony-native-elements-compiler"],
  ["navigation", "angular-native-harmony-navigation"],
  ["paging", "angular-native-harmony-paging"],
]);

async function stageTypeScriptInterop(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await stageTypeScriptInterop(entryPath);
    } else if (entry.name.endsWith(".ts")) {
      const source = await readFile(entryPath, "utf8");
      await writeFile(entryPath, `// @keepTs\n// @ts-nocheck\n${source}`);
    }
  }
}

async function stageProject(stagingRoot) {
  for (const directory of ["entry", "packages", "samples"]) {
    await cp(join(harmonyRoot, directory), join(stagingRoot, directory), {
      filter: (source) => !ignoredStageDirectories.has(basename(source)),
      recursive: true,
    });
  }

  await mkdir(join(stagingRoot, "scripts"), { recursive: true });
  await cp(
    join(harmonyRoot, "scripts", "check-openharmony-arkts.mjs"),
    join(stagingRoot, "scripts", "check-openharmony-arkts.mjs"),
  );
  await writeFile(
    join(
      stagingRoot,
      "packages",
      "credentials",
      "src",
      "main",
      "ets",
      "OnlineAuthenticationKit.d.ts",
    ),
    `declare module "@kit.OnlineAuthenticationKit" {
  namespace fido2 {
    interface CredentialRequestOptions {}
    interface CredentialCreationOptions {}
    interface AuthenticationCredential {
      readonly authenticationResponseJson: string | object;
    }
    function getPlatformAuthenticators(context: object): Promise<Array<object>>;
    function authenticate(
      context: object,
      options: CredentialRequestOptions,
    ): Promise<AuthenticationCredential>;
    function register(
      context: object,
      options: CredentialCreationOptions,
    ): Promise<void>;
  }
  export { fido2 };
}
`,
  );
  await stageTypeScriptInterop(stagingRoot);

  const namespaceRoot = join(stagingRoot, "oh_modules", "@angular-wave");
  await mkdir(namespaceRoot, { recursive: true });
  for (const [directory, packageName] of packageNames) {
    await symlink(
      join(stagingRoot, "packages", directory),
      join(namespaceRoot, packageName),
      "dir",
    );
  }
}

const stagingRoot = await mkdtemp(join(tmpdir(), "angularts-openharmony-"));
let exitCode = 1;
try {
  await stageProject(stagingRoot);
  const result = spawnSync(
    process.execPath,
    [join(stagingRoot, "scripts", "check-openharmony-arkts.mjs")],
    {
      cwd: stagingRoot,
      env: process.env,
      encoding: "utf8",
    },
  );
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const audit = classifyOpenHarmonyAudit(output);
  process.stdout.write(audit.filtered);
  if (!audit.filtered.endsWith("\n")) process.stdout.write("\n");
  for (const warning of audit.unexpectedWarnings) {
    process.stderr.write(`Unexpected OpenHarmony warning: ${warning}\n`);
  }
  exitCode = result.status === 0 ||
      (audit.completed && audit.repositoryErrors === 0 && audit.sdkErrors > 0 &&
        audit.unexpectedWarnings.length === 0)
    ? 0
    : result.status ?? 1;
} finally {
  await rm(stagingRoot, { force: true, recursive: true });
}

process.exitCode = exitCode;
