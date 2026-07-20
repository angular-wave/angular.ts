import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const namespaceSource = readFileSync("src/namespace.ts", "utf8");
const namespaceExports = [
  ...namespaceSource.matchAll(/export type ([A-Za-z0-9_]+)/g),
].map((match) => match[1]);

function walkFiles(root) {
  if (!existsSync(root)) return [];

  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);

    return statSync(path).isDirectory()
      ? walkFiles(path)
      : path.endsWith(".html")
        ? [path]
        : [];
  });
}

const typedocPages = new Set(
  walkFiles("docs/static/typedoc").map((path) =>
    path
      .split("/")
      .pop()
      .replace(/\.html$/, ""),
  ),
);
const missingPages = namespaceExports.filter((name) => !typedocPages.has(name));

if (typedocPages.size === 0) {
  console.error("Public type documentation check failed:");
  console.error("- docs/static/typedoc has no generated TypeDoc pages.");
  process.exit(1);
}

if (missingPages.length > 0) {
  console.error("Public type documentation check failed:");
  console.error(
    `- Public namespace exports missing TypeDoc pages: ${missingPages
      .map((name) => `ng.${name}`)
      .join(", ")}`,
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      namespaceExports: namespaceExports.length,
      typedocPages: typedocPages.size,
      directTypedocPageMatches: namespaceExports.length,
      missingDirectTypedocPages: 0,
      status: "documentation-complete",
    },
    null,
    2,
  ),
);
