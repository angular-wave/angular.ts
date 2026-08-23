import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { basename, join, relative } from "node:path";

const docsRoot = join("docs", "content");
const typedocRoot = join("docs", "static", "typedoc");
const publicTypeNames = new Set(
  [
    ...readFileSync(join("src", "namespace.ts"), "utf8").matchAll(
      /export type ([A-Za-z0-9_]+)/gu,
    ),
  ].map((match) => match[1]),
);

for (const file of walkFiles(typedocRoot, ".html")) {
  publicTypeNames.add(basename(file, ".html"));
}

const failures = [];

for (const file of walkFiles(docsRoot, ".md")) {
  let fenceMarker;

  for (const [index, line] of readFileSync(file, "utf8")
    .split(/\r?\n/gu)
    .entries()) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/u)?.[1];

    if (fence) {
      if (!fenceMarker) fenceMarker = fence[0];
      else if (fence[0] === fenceMarker) fenceMarker = undefined;
      continue;
    }

    if (fenceMarker) continue;

    for (const match of line.matchAll(/`([^`\n]+)`/gu)) {
      const typeName = match[1].match(
        /^(?:ng\.)?([A-Z][A-Za-z0-9_$]*)(?:<[^>]+>)?(?:\[\])?$/u,
      )?.[1];

      if (!typeName || !publicTypeNames.has(typeName)) continue;

      const start = match.index;
      const end = start + match[0].length;
      const linkTarget = line
        .slice(end)
        .match(/^\]\(([^)\s]+)(?:\s+["'][^"']+["'])?\)/u)?.[1];
      const linksMatchingTypeDoc =
        line[start - 1] === "[" &&
        linkTarget?.includes("/typedoc/") &&
        linkTarget.includes(`/${typeName}.html`);

      if (!linksMatchingTypeDoc) {
        failures.push(
          `${relative(".", file)}:${index + 1}: \`${typeName}\` must link to its generated TypeDoc page`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(
    "Documentation type references must link to their generated TypeDoc pages.",
  );
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Documentation TypeDoc links cover inline references to ${publicTypeNames.size} generated and public types.`,
);

function walkFiles(root, extension) {
  if (!existsSync(root)) return [];

  return readdirSync(root).flatMap((entry) => {
    const file = join(root, entry);

    return statSync(file).isDirectory()
      ? walkFiles(file, extension)
      : file.endsWith(extension)
        ? [file]
        : [];
  });
}
