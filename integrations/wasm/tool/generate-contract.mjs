#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TYPE_MAP = Object.freeze({
  string: {
    typescript: "string",
    rust: "String",
    go: "string",
    c: "ng_wasm_string_t",
    cpp: "std::string",
    zig: "[]const u8",
    assemblyscript: "string",
    csharp: "string",
  },
  boolean: {
    typescript: "boolean",
    rust: "bool",
    go: "bool",
    c: "bool",
    cpp: "bool",
    zig: "bool",
    assemblyscript: "bool",
    csharp: "bool",
  },
  i32: {
    typescript: "number",
    rust: "i32",
    go: "int32",
    c: "int32_t",
    cpp: "std::int32_t",
    zig: "i32",
    assemblyscript: "i32",
    csharp: "int",
  },
  u32: {
    typescript: "number",
    rust: "u32",
    go: "uint32",
    c: "uint32_t",
    cpp: "std::uint32_t",
    zig: "u32",
    assemblyscript: "u32",
    csharp: "uint",
  },
  i64: {
    typescript: "bigint",
    rust: "i64",
    go: "int64",
    c: "int64_t",
    cpp: "std::int64_t",
    zig: "i64",
    assemblyscript: "i64",
    csharp: "long",
  },
  u64: {
    typescript: "bigint",
    rust: "u64",
    go: "uint64",
    c: "uint64_t",
    cpp: "std::uint64_t",
    zig: "u64",
    assemblyscript: "u64",
    csharp: "ulong",
  },
  f32: {
    typescript: "number",
    rust: "f32",
    go: "float32",
    c: "float",
    cpp: "float",
    zig: "f32",
    assemblyscript: "f32",
    csharp: "float",
  },
  f64: {
    typescript: "number",
    rust: "f64",
    go: "float64",
    c: "double",
    cpp: "double",
    zig: "f64",
    assemblyscript: "f64",
    csharp: "double",
  },
  bytes: {
    typescript: "Uint8Array",
    rust: "Vec<u8>",
    go: "[]byte",
    c: "ng_wasm_bytes_t",
    cpp: "std::vector<std::uint8_t>",
    zig: "[]const u8",
    assemblyscript: "Uint8Array",
    csharp: "byte[]",
  },
  json: {
    typescript: "unknown",
    rust: "serde_json::Value",
    go: "any",
    c: "ng_wasm_json_t",
    cpp: "std::string",
    zig: "std.json.Value",
    assemblyscript: "string",
    csharp: "System.Text.Json.JsonElement",
  },
});

export function parseWasmContract(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Wasm contract must be an object");
  }
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value.name ?? "")) {
    throw new Error("Wasm contract name must be an identifier");
  }
  if (!Array.isArray(value.fields) || value.fields.length === 0) {
    throw new Error("Wasm contract fields must be a non-empty array");
  }

  const paths = new Set();
  const fields = value.fields.map((field) => {
    if (!field || typeof field !== "object" || Array.isArray(field)) {
      throw new Error("Wasm contract field must be an object");
    }
    if (!isSafePath(field.path)) {
      throw new Error(`Unsafe Wasm contract path '${String(field.path)}'`);
    }
    if (paths.has(field.path)) {
      throw new Error(`Duplicate Wasm contract path '${field.path}'`);
    }
    if (!Object.hasOwn(TYPE_MAP, field.type)) {
      throw new Error(`Unsupported Wasm contract type '${String(field.type)}'`);
    }

    paths.add(field.path);

    return Object.freeze({
      path: field.path,
      type: field.type,
      optional: field.optional === true,
      symbol: pathSymbol(field.path),
    });
  });

  return Object.freeze({ name: value.name, fields: Object.freeze(fields) });
}

export function generateWasmContractFiles(contractValue) {
  const contract = parseWasmContract(contractValue);
  const base = kebab(contract.name);

  return new Map([
    [`${base}.contract.ts`, renderTypeScript(contract)],
    [`${base}_contract.rs`, renderRust(contract)],
    [`${base}_contract.go`, renderGo(contract)],
    [`${base}_contract.h`, renderC(contract)],
    [`${base}_contract.hpp`, renderCpp(contract)],
    [`${base}_contract.zig`, renderZig(contract)],
    [`${base}.contract.as.ts`, renderAssemblyScript(contract)],
    [`${contract.name}Contract.cs`, renderCSharp(contract)],
  ]);
}

export async function writeWasmContractFiles(
  manifestPath,
  outputDirectory,
  { check = false } = {},
) {
  const contract = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = generateWasmContractFiles(contract);

  await mkdir(outputDirectory, { recursive: true });

  for (const [name, content] of files) {
    const target = path.join(outputDirectory, name);

    if (check) {
      let existing;

      try {
        existing = await readFile(target, "utf8");
      } catch {
        throw new Error(`Missing generated Wasm contract '${target}'`);
      }
      if (existing !== content) {
        throw new Error(`Stale generated Wasm contract '${target}'`);
      }
    } else {
      await writeFile(target, content);
    }
  }
}

function renderTypeScript(contract) {
  const fields = contract.fields
    .map(
      (field) =>
        `  readonly ${JSON.stringify(field.path)}${field.optional ? "?" : ""}: ${TYPE_MAP[field.type].typescript};`,
    )
    .join("\n");
  const paths = contract.fields
    .map((field) => `  ${field.symbol}: ${JSON.stringify(field.path)},`)
    .join("\n");

  return banner("TypeScript", contract) +
    `export interface ${contract.name}Values {\n${fields}\n}\n\n` +
    `export const ${contract.name}Paths = Object.freeze({\n${paths}\n} as const);\n`;
}

function renderRust(contract) {
  const imports = [];
  if (contract.fields.some((field) => field.type === "bytes")) imports.push("BinaryField");
  if (contract.fields.some((field) => field.type !== "bytes")) imports.push("Field");
  const lines = contract.fields.map((field) => {
    if (field.type === "bytes") {
      const constructor = field.optional ? "optional" : "new";
      return `pub const ${constant(field.path)}: BinaryField = BinaryField::${constructor}(${JSON.stringify(field.path)});`;
    }

    const valueType = `${field.optional ? "Option<" : ""}${TYPE_MAP[field.type].rust}${field.optional ? ">" : ""}`;
    return `pub const ${constant(field.path)}: Field<${valueType}> = Field::new(${JSON.stringify(field.path)});`;
  });

  return banner("Rust", contract, "//") +
    `use angular_ts::{${imports.join(", ")}};\n\n${lines.join("\n")}\n`;
}

function renderGo(contract) {
  const constants = contract.fields
    .map((field) => `\t${contract.name}Path${field.symbol} = ${JSON.stringify(field.path)}`)
    .join("\n");
  const aliases = contract.fields
    .map((field) => `type ${contract.name}${field.symbol}Value = ${TYPE_MAP[field.type].go}`)
    .join("\n");

  return banner("Go", contract, "//") +
    `package contracts\n\nconst (\n${constants}\n)\n\n${aliases}\n`;
}

function renderC(contract) {
  const guard = `${constant(contract.name)}_CONTRACT_H`;
  const lines = contract.fields.map((field) => {
    const type = field.type === "bytes" ? "binary" : field.type;
    const initializer = `${field.optional ? "OPTIONAL_" : ""}${constant(type)}_FIELD`;
    return `static const ng_${type}_field_t ${constant(contract.name)}_${constant(field.path)} = NG_${initializer}(${JSON.stringify(field.path)});`;
  });

  return banner("C", contract, "//") +
    `#ifndef ${guard}\n#define ${guard}\n\n#include "angular_ts_wasm.h"\n\n${lines.join("\n")}\n\n#endif\n`;
}

function renderCpp(contract) {
  const lines = contract.fields.flatMap((field) => [
    `inline constexpr std::string_view ${field.symbol}Path = ${JSON.stringify(field.path)};`,
    `using ${field.symbol}Value = ${TYPE_MAP[field.type].cpp};`,
  ]);

  return banner("C++", contract, "//") +
    `#pragma once\n\n#include <cstdint>\n#include <string>\n#include <string_view>\n#include <vector>\n\nnamespace angular_ts::contracts::${contract.name} {\n${indent(lines.join("\n"))}\n}\n`;
}

function renderZig(contract) {
  const usesJson = contract.fields.some((field) => field.type === "json");
  const imports = ["const angular = @import(\"angular-ts\");"];
  if (usesJson) imports.push("const std = @import(\"std\");");

  const lines = contract.fields.map((field) => {
    if (field.type === "bytes") {
      const constructor = field.optional ? "optional" : "init";
      return `pub const ${camel(field.symbol)} = angular.BinaryField.${constructor}(${JSON.stringify(field.path)});`;
    }

    const valueType = `${field.optional ? "?" : ""}${TYPE_MAP[field.type].zig}`;
    return `pub const ${camel(field.symbol)} = angular.Field(${valueType}).init(${JSON.stringify(field.path)});`;
  });

  return banner("Zig", contract, "//") +
    `${imports.join("\n")}\n\n${lines.join("\n")}\n`;
}

function renderAssemblyScript(contract) {
  const lines = contract.fields.flatMap((field) => [
    `  static readonly ${field.symbol}Path: string = ${JSON.stringify(field.path)};`,
    `  declare ${field.symbol}Value: ${TYPE_MAP[field.type].assemblyscript};`,
  ]);

  return banner("AssemblyScript", contract, "//") +
    `export class ${contract.name}Contract {\n${lines.join("\n")}\n}\n`;
}

function renderCSharp(contract) {
  const lines = contract.fields
    .map(
      (field) =>
        `    public static readonly Field<${TYPE_MAP[field.type].csharp}> ${field.symbol} = new(${JSON.stringify(field.path)});`,
    )
    .join("\n");

  return banner("C#", contract, "//") +
    `namespace AngularTs.Contracts;\n\npublic readonly record struct Field<T>(string Path);\n\npublic static class ${contract.name}Contract\n{\n${lines}\n}\n`;
}

function banner(language, contract, marker = "//") {
  return `${marker} Generated from the ${contract.name} AngularTS Wasm contract for ${language}. Do not edit.\n`;
}

function isSafePath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 16384 &&
    value.split(".").every((part) =>
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part) &&
      !["__proto__", "constructor", "prototype"].includes(part),
    )
  );
}

function pathSymbol(value) {
  return value
    .split(".")
    .flatMap((part) => part.split(/[^A-Za-z0-9]+/u))
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function constant(value) {
  return value.replace(/([a-z0-9])([A-Z])/gu, "$1_$2").replace(/[^A-Za-z0-9]+/gu, "_").toUpperCase();
}

function camel(value) {
  return value[0].toLowerCase() + value.slice(1);
}

function kebab(value) {
  return value.replace(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
}

function indent(value) {
  return value.split("\n").map((line) => `  ${line}`).join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  const manifestPath = args[0];
  const outputFlag = args.indexOf("--out");
  const outputDirectory = outputFlag >= 0 ? args[outputFlag + 1] : undefined;

  if (!manifestPath || !outputDirectory) {
    throw new Error("Usage: generate-contract.mjs <manifest> --out <directory> [--check]");
  }

  await writeWasmContractFiles(manifestPath, outputDirectory, {
    check: args.includes("--check"),
  });
}

if (import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
