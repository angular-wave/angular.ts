#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "../../..");
const dartSrcRoot = resolve(repoRoot, "integrations/dart/lib/src");
const overridesPath = resolve(repoRoot, "integrations/dart/tool/generator-overrides.json");
const overrides = JSON.parse(readFileSync(overridesPath, "utf8"));
const dartFilesByName = new Map(
  dartFiles(dartSrcRoot)
    .filter((path) => !path.includes("/generated/"))
    .map((path) => [path, readFileSync(path, "utf8")])
);
const classBodies = new Map();
const missing = [];

for (const [path, source] of dartFilesByName) {
  for (const declaration of source.matchAll(/\bclass\s+([A-Za-z0-9_]+)[^{]*{/g)) {
    const className = declaration[1];
    const body = classBody(source, declaration.index + declaration[0].length - 1);

    if (body != null) {
      classBodies.set(className, { body, path });
    }
  }
}

for (const pattern of overrides.manual ?? []) {
  const [typeName, memberName] = pattern.split(".");
  const classInfo = classBodies.get(typeName);

  if (!classInfo) {
    missing.push(`${pattern}: no handwritten ${typeName} class`);
    continue;
  }

  if (memberName === "*") continue;

  const dartNames = [
    overrides.renames?.[pattern],
    memberName,
    reservedManualAlias(memberName)
  ].filter(Boolean);

  if (!dartNames.some((name) => hasMember(classInfo.body, name))) {
    missing.push(
      `${pattern}: no handwritten member in ${relative(repoRoot, classInfo.path)}`
    );
  }
}

if (missing.length > 0) {
  console.error("Manual Dart binding overrides without handwritten members:");

  for (const item of missing) {
    console.error(`- ${item}`);
  }

  process.exit(1);
}

console.log("Manual Dart binding overrides have handwritten members.");

function dartFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return dartFiles(path);
    return path.endsWith(".dart") ? [path] : [];
  });
}

function classBody(source, openBraceIndex) {
  let depth = 0;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(openBraceIndex + 1, index);
      }
    }
  }

  return null;
}

function hasMember(body, memberName) {
  const escaped = escapeRegExp(memberName);
  const method = new RegExp(`(?:^|\\n)\\s*(?:@[\\s\\S]*?\\n\\s*)*[^\\n;{}]*${escaped}(?:<[^\\n;{}]+>)?\\s*\\(`);
  const getter = new RegExp(`(?:^|\\n)\\s*(?:@[\\s\\S]*?\\n\\s*)*[^\\n;{}]+\\s+get\\s+${escaped}\\b`);
  const setter = new RegExp(`(?:^|\\n)\\s*(?:@[\\s\\S]*?\\n\\s*)*set\\s+${escaped}\\s*\\(`);

  return method.test(body) || getter.test(body) || setter.test(body);
}

function reservedManualAlias(memberName) {
  return {
    default: "defaultMember",
    factory: "factoryMember",
    get: "getMember",
    is: "isState",
    set: "setMember",
    type: "typeMember"
  }[memberName];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
