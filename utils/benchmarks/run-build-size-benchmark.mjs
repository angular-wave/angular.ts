import { gzipSync } from "node:zlib";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import { rollup } from "rollup";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const resultPath = path.join(
  rootDir,
  "utils/benchmarks/results/build-size.json",
);
const buildDir = path.join(rootDir, ".build");
const runtimeEntry = path.join(buildDir, "runtime/index.js");

function customComposition(...registrars) {
  return [
    `export * from ${JSON.stringify(runtimeEntry)};`,
    ...registrars.map(
      (registrar) =>
        `export * from ${JSON.stringify(path.join(buildDir, `runtime/${registrar}.js`))};`,
    ),
  ].join("\n");
}

const entries = {
  core: customComposition(),
  "event-bus": customComposition("event-bus"),
  router: customComposition("router"),
  orchestration: customComposition("orchestration"),
  realtime: customComposition("realtime"),
  wasm: customComposition("wasm"),
  "service-worker": customComposition("service-worker"),
  "web-component": customComposition("web-component"),
  "html-canvas": customComposition("html-canvas"),
  "workflow-worker": customComposition("workflow-worker"),
  full: `export * from ${JSON.stringify(path.join(buildDir, "index.js"))};`,
};

const previous = await readPreviousResult();
const results = [];

for (const [name, source] of Object.entries(entries)) {
  const code = await buildComposition(name, source);
  const minifiedBytes = Buffer.byteLength(code);
  const gzipBytes = gzipSync(code, { level: 9 }).byteLength;

  results.push({
    name,
    format: "esm",
    minifiedBytes,
    gzipBytes,
  });
}

printResults(results, previous?.result?.results);

await fs.writeFile(
  resultPath,
  `${JSON.stringify(
    {
      savedAt: new Date().toISOString(),
      result: {
        minifier: "terser",
        propertyMangle: "underscore-prefixed",
        results,
      },
    },
    null,
    2,
  )}\n`,
);

async function buildComposition(name, source) {
  const entryId = `\0angular-ts-size:${name}`;
  const bundle = await rollup({
    input: entryId,
    external: ["ms"],
    plugins: [
      {
        name: "angular-ts-size-entry",
        resolveId(id) {
          return id === entryId ? entryId : null;
        },
        load(id) {
          return id === entryId ? source : null;
        },
      },
      nodeResolve(),
      terser({
        compress: {
          keep_fnames: false,
          passes: 3,
        },
        mangle: {
          properties: {
            keep_quoted: false,
            regex: /^_/,
          },
          toplevel: true,
        },
      }),
    ],
  });

  try {
    const generated = await bundle.generate({
      format: "es",
      inlineDynamicImports: true,
    });
    const chunks = generated.output.filter((output) => output.type === "chunk");

    if (chunks.length !== 1) {
      throw new Error(
        `Expected one generated chunk for ${name}, received ${chunks.length}.`,
      );
    }

    return chunks[0].code;
  } finally {
    await bundle.close();
  }
}

async function readPreviousResult() {
  try {
    return JSON.parse(await fs.readFile(resultPath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") return undefined;

    throw error;
  }
}

function printResults(current, previous = []) {
  console.log("AngularTS composition build sizes");
  console.table(
    current.map((entry) => {
      const old = previous.find((candidate) => candidate.name === entry.name);

      return {
        composition: entry.name,
        "minified bytes": entry.minifiedBytes,
        "gzip bytes": entry.gzipBytes,
        "gzip change": old
          ? formatChange(entry.gzipBytes, old.gzipBytes)
          : "baseline",
      };
    }),
  );
  console.log(`Updated benchmark result: ${resultPath}`);
}

function formatChange(current, previous) {
  if (!previous) return "n/a";

  const percent = ((current - previous) / previous) * 100;
  const prefix = percent > 0 ? "+" : "";

  return `${prefix}${percent.toFixed(1)}%`;
}
