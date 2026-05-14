import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [, , generatedSourcesDir] = process.argv;

if (!generatedSourcesDir) {
  console.error("Usage: normalize-generated-jsinterop-java.mjs <generated-sources-dir>");
  process.exit(1);
}

function listJavaFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? listJavaFiles(path) : [path];
  }).filter((path) => path.endsWith(".java"));
}

for (const path of listJavaFiles(generatedSourcesDir)) {
  const source = readFileSync(path, "utf8");
  const normalized = source
    .replace(/^import org\.jspecify\.annotations\.Nullable;\n/gm, "")
    .replace(/^import elemental2\.promise\.Promise;\n/gm, "import org.angular.ts.Promise;\n")
    .replace(/@Nullable\s+/g, "")
    .replace(
      /^@JsOverlay\ndefault boolean isPromise\(\)\{\nreturn \(Object\)this instanceof Promise;\n\}\n/gm,
      "",
    );

  if (normalized !== source) {
    writeFileSync(path, normalized);
  }
}
