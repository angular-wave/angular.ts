import * as fs from "node:fs";
import * as path from "node:path";
import type { AngularTsCatalogEntry } from "./types";

const TOKEN_RE = /export const (_[A-Za-z0-9_]+)\s*=\s*(['"`])([^'"`]+)\2\s+as const/g;

export const builtInInjectables = loadBuiltInInjectables();

export function loadBuiltInInjectables(
  repoRoot = findRepoRoot(),
): AngularTsCatalogEntry[] {
  const source = fs.readFileSync(
    path.join(repoRoot, "src/injection-tokens.ts"),
    "utf8",
  );
  return createBuiltInInjectableCatalog(source);
}

export function createBuiltInInjectableCatalog(
  source: string,
): AngularTsCatalogEntry[] {
  const entries: AngularTsCatalogEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = TOKEN_RE.exec(source))) {
    const exportName = match[1];
    const tokenName = match[3];
    const sourceLocation = offsetToLocation(source, match.index);

    entries.push({
      kind: tokenName.endsWith("Provider") ? "provider" : "service",
      name: tokenName,
      normalizedName: tokenName,
      aliases: [exportName],
      description: "Built-in AngularTS injectable token generated from src/injection-tokens.ts.",
      source: {
        file: "src/injection-tokens.ts",
        line: sourceLocation.line,
        character: sourceLocation.character,
      },
    });
  }

  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function offsetToLocation(
  text: string,
  offset: number,
): { line: number; character: number } {
  const prefix = text.slice(0, offset);
  const lines = prefix.split(/\r?\n/);
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1]?.length ?? 0,
  };
}

function findRepoRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(__dirname, "../../../.."),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "src/injection-tokens.ts"))) {
      return candidate;
    }
  }

  return process.cwd();
}
