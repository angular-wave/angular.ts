import * as fs from "node:fs";
import * as path from "node:path";
import type { AngularTsCatalogEntry } from "./types";

const BUILT_IN_FILTERS_RE =
  /\/\*\*([\s\S]*?)\*\/\s*export const ngBuiltInFilters\s*=\s*\{([\s\S]*?)\}\s*satisfies\s+FilterGroup/;
const FILTER_PROPERTY_RE = /^\s*([A-Za-z_$][\w$]*)\s*:/gm;

const FILTER_METADATA: Record<string, { description: string; signature: string }> = {
  async: {
    description: "Unwraps an async value for template display.",
    signature: "input | async",
  },
  date: {
    description: "Formats a date-like value with Intl.DateTimeFormat.",
    signature: "input | date:locales:options",
  },
  entries: {
    description: "Returns object entries for iteration.",
    signature: "input | entries",
  },
  filter: {
    description: "Filters an array-like collection with a predicate.",
    signature: "input | filter:predicate:comparator",
  },
  json: {
    description: "Formats a value as JSON.",
    signature: "input | json:spacing",
  },
  keys: {
    description: "Returns object keys for iteration.",
    signature: "input | keys",
  },
  limitTo: {
    description: "Limits an array-like value, string, or number.",
    signature: "input | limitTo:limit:begin",
  },
  currency: {
    description: "Formats a number-like value as currency.",
    signature: "input | currency:locales:options",
  },
  number: {
    description: "Formats a number-like value.",
    signature: "input | number:locales:options",
  },
  orderBy: {
    description: "Sorts an array-like collection by one or more predicates.",
    signature: "input | orderBy:sortPredicate:reverseOrder:compareFn",
  },
  percent: {
    description: "Formats a number-like value as a percentage.",
    signature: "input | percent:locales:options",
  },
  relativeTime: {
    description: "Formats a date-like value as relative time.",
    signature: "input | relativeTime:unit:locales:options",
  },
  values: {
    description: "Returns object values for iteration.",
    signature: "input | values",
  },
};

export const builtInFilters = loadBuiltInFilters();

export function loadBuiltInFilters(repoRoot = findRepoRoot()): AngularTsCatalogEntry[] {
  const ngSource = fs.readFileSync(path.join(repoRoot, "src/ng.ts"), "utf8");
  return createBuiltInFilterCatalog(ngSource);
}

export function createBuiltInFilterCatalog(
  ngSource: string,
): AngularTsCatalogEntry[] {
  const match = BUILT_IN_FILTERS_RE.exec(ngSource);
  if (!match) return [];

  const description = normalizeJSDoc(match[1]) || "Built-in AngularTS filter.";
  const body = match[2];
  const bodyStart = match.index + match[0].indexOf(body);
  const filters: AngularTsCatalogEntry[] = [];
  let propertyMatch: RegExpExecArray | null;

  while ((propertyMatch = FILTER_PROPERTY_RE.exec(body))) {
    const name = propertyMatch[1];
    const metadata = FILTER_METADATA[name];
    const sourceLocation = offsetToLocation(
      ngSource,
      bodyStart + propertyMatch.index,
    );

    filters.push({
      kind: "filter",
      name,
      normalizedName: name,
      aliases: [],
      description: metadata
        ? `${metadata.description} (ngBuiltInFilters)`
        : `${description} (ngBuiltInFilters)`,
      expressionKind: "filter",
      signature: metadata?.signature ?? `input | ${name}`,
      source: {
        file: "src/ng.ts",
        line: sourceLocation.line,
        character: sourceLocation.character,
      },
    });
  }

  return filters.sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeJSDoc(comment: string): string {
  return comment
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean)
    .join(" ");
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
    if (fs.existsSync(path.join(candidate, "src/ng.ts"))) return candidate;
  }

  return process.cwd();
}
