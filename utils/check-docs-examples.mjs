import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const docsContentDir = path.join(root, "docs", "content");
const staticExamplesDir = path.join(root, "docs", "static", "examples");
const outDir = path.join(root, ".build", "docs-example-api-check");
const generatedFile = path.join(outDir, "member-access.ts");
const generatedConfig = path.join(outDir, "tsconfig.json");

const sourceLanguages = new Set(["ts", "typescript", "js", "javascript"]);

// This checker does not typecheck whole examples. Most snippets are fragments
// that omit imports, setup, or surrounding classes. Instead, it extracts member
// accesses on known AngularTS services and asks TypeScript whether those members
// exist on the public declaration files.
const memberAccessPattern =
  /(?:\bthis\.)?([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*(?=[(<;,\s])/g;

// Map the variable names commonly used in docs snippets to their public API
// types. Adding a new documented service usually means adding one entry here
// and one type import below.
const knownServices = new Map([
  ["angular", "Angular"],
  ["$animate", "AnimateService"],
  ["$cookie", "CookieService"],
  ["$eventBus", "PubSub"],
  ["eventBus", "PubSub"],
  ["$http", "HttpService"],
  ["$location", "Location"],
  ["$log", "LogService"],
  ["$rootScope", "Scope"],
  ["rootScope", "Scope"],
  ["$sce", "SceService"],
  ["$scope", "Scope"],
  ["scope", "Scope"],
  ["$state", "StateProvider"],
  ["$stateRegistry", "StateRegistryProvider"],
  ["$templateRequest", "TemplateRequestService"],
  ["$transitions", "TransitionService"],
]);

const imports = [
  '/// <reference path="../../@types/namespace.d.ts" />',
  'import type { Angular } from "../../@types/angular";',
  'import type { AnimateService } from "../../@types/animations/animate";',
  'import type { Scope } from "../../@types/core/scope/scope";',
  'import type { StateRegistryProvider } from "../../@types/router/state/state-registry";',
  'import type { StateProvider } from "../../@types/router/state/state-service";',
  'import type { TransitionService } from "../../@types/router/transition/interface";',
  'import type { CookieService } from "../../@types/services/cookie/cookie";',
  'import type { HttpService } from "../../@types/services/http/http";',
  'import type { Location } from "../../@types/services/location/location";',
  'import type { LogService } from "../../@types/services/log/log";',
  'import type { PubSub } from "../../@types/services/pubsub/pubsub";',
  'import type { SceService } from "../../@types/services/sce/sce";',
  'import type { TemplateRequestService } from "../../@types/services/template-request/template-request";',
  "",
];

function walkFiles(dir, predicate, result = []) {
  if (!fs.existsSync(dir)) return result;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkFiles(filePath, predicate, result);
    } else if (entry.isFile() && predicate(filePath)) {
      result.push(filePath);
    }
  }

  return result;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function collectMarkdownExamples(filePath, examples) {
  const text = fs.readFileSync(filePath, "utf8");

  // Markdown docs contain examples in three forms:
  // - fenced source blocks, such as ```ts
  // - Docsy/Hugo codecard shortcodes
  // - short inline API examples, such as `$scope.$watch(...)`
  const fencePattern = /^```([^\n`]*)\n([\s\S]*?)^```/gm;
  const codecardPattern =
    /{{<\s*codecard\b[^>]*>}}([\s\S]*?){{<\s*\/codecard\s*>}}/gm;
  const inlinePattern = /`([^`\n]*(?:\$[A-Za-z_][\w$]*|angular)\.[^`\n]+)`/g;
  let match;

  while ((match = fencePattern.exec(text))) {
    const language = match[1].trim().split(/\s+/)[0]?.toLowerCase();

    if (sourceLanguages.has(language)) {
      examples.push({
        code: match[2],
        source: `${path.relative(root, filePath)}:${lineNumberAt(text, match.index)}`,
      });
    }
  }

  while ((match = codecardPattern.exec(text))) {
    examples.push({
      code: match[1],
      source: `${path.relative(root, filePath)}:${lineNumberAt(text, match.index)}`,
    });
  }

  while ((match = inlinePattern.exec(text))) {
    examples.push({
      code: match[1],
      source: `${path.relative(root, filePath)}:${lineNumberAt(text, match.index)}`,
    });
  }
}

function collectStaticExample(filePath, examples) {
  examples.push({
    code: fs.readFileSync(filePath, "utf8"),
    source: path.relative(root, filePath),
  });
}

function collectMemberAccesses(examples) {
  const accesses = new Map();

  for (const example of examples) {
    let match;

    // The regexp is global, so reset it before scanning each independent
    // snippet. Without this, matches can be skipped after a previous example.
    memberAccessPattern.lastIndex = 0;

    while ((match = memberAccessPattern.exec(example.code))) {
      const [, base, member] = match;

      if (!knownServices.has(base)) continue;
      if (member === "$inject") continue;

      // Application scopes often include arbitrary user model fields. Only
      // validate framework members like $watch, $applyAsync, and $destroy.
      if (
        (base === "$scope" ||
          base === "$rootScope" ||
          base === "scope" ||
          base === "rootScope") &&
        !member.startsWith("$")
      ) {
        continue;
      }

      const key = `${base}.${member}`;

      if (!accesses.has(key)) {
        accesses.set(key, { base, member, sources: [] });
      }

      accesses.get(key).sources.push(example.source);
    }
  }

  return [...accesses.values()].sort((a, b) =>
    `${a.base}.${a.member}`.localeCompare(`${b.base}.${b.member}`),
  );
}

function writeTypecheck(accesses) {
  fs.rmSync(outDir, { force: true, recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  // The generated file declares each known docs variable as its public API type,
  // then emits one `void service.member` assertion per unique documented member.
  // TypeScript reports a normal property error if docs mention a member that is
  // missing from the exported declarations.
  const declarations = [...knownServices.entries()]
    .map(([name, type]) => `declare const ${name}: ${type};`)
    .join("\n");

  const assertions = accesses
    .map((access) => {
      // Keep source locations in generated comments so a TypeScript error can
      // be traced back to the docs/examples that introduced the invalid member.
      const sources = access.sources.slice(0, 5).join(", ");
      const suffix =
        access.sources.length > 5 ? `, +${access.sources.length - 5} more` : "";

      return `// ${sources}${suffix}\nvoid ${access.base}.${access.member};`;
    })
    .join("\n\n");

  fs.writeFileSync(
    generatedFile,
    `${imports.join("\n")}${declarations}\n\n${assertions}\n`,
  );

  fs.writeFileSync(
    generatedConfig,
    JSON.stringify(
      {
        extends: "../../tsconfig.base.json",
        compilerOptions: {
          noEmit: true,
          module: "ESNext",
          moduleResolution: "Bundler",
          target: "ES2023",
          noUnusedLocals: false,
          noUnusedParameters: false,
          types: [],
        },
        include: ["member-access.ts"],
      },
      null,
      2,
    ),
  );
}

const examples = [];

// Collect snippets from authored docs plus runnable static examples. The
// resulting snippets are only parsed for known service member access; they are
// not executed and they do not need to be complete programs.
for (const filePath of walkFiles(docsContentDir, (file) =>
  file.endsWith(".md"),
)) {
  collectMarkdownExamples(filePath, examples);
}
for (const filePath of walkFiles(staticExamplesDir, (file) =>
  /\.(?:js|ts)$/.test(file),
)) {
  collectStaticExample(filePath, examples);
}

const accesses = collectMemberAccesses(examples);
writeTypecheck(accesses);

// Use the repo's TypeScript compiler as the source of truth instead of keeping
// a separate hand-written allowlist of valid API members.
const tsc = path.join(root, "node_modules", ".bin", "tsc");
const result = spawnSync(
  tsc,
  ["--project", generatedConfig, "--pretty", "false"],
  {
    encoding: "utf8",
  },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(
  `Checked ${accesses.length} documented AngularTS API member references from ${examples.length} docs examples.`,
);
