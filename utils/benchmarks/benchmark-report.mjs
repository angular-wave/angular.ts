import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const resultDir = path.join(rootDir, "utils", "benchmarks", "results");

export async function printAndSaveBenchmarkResult(config) {
  const previous = await readPreviousResult(config.id);

  printResult(config, previous?.result);

  await saveResult(config.id, config.result);
}

function printResult(config, previousResult) {
  const { result } = config;

  console.log(config.title);
  console.log(`Browser: ${result.userAgent}`);
  console.log(config.iterationsLabel(result));
  console.log(`Samples: ${result.samples}`);

  for (const group of config.groups) {
    const rows = result.results
      .filter(group.filter)
      .map((entry) => createResultRow(entry));

    if (!rows.length) {
      continue;
    }

    if (group.title) {
      console.log("");
      console.log(group.title);
    } else {
      console.log("");
    }

    console.table(rows);
  }

  if (!previousResult) {
    console.log(`Saved benchmark result: ${resultPath(config.id)}`);

    return;
  }

  console.log("");
  console.log("Changes since previous saved run");

  for (const group of config.groups) {
    const rows = result.results
      .filter(group.filter)
      .map((entry) => createChangeRow(entry, previousResult))
      .filter(Boolean);

    if (!rows.length) {
      continue;
    }

    if (group.title) {
      console.log("");
      console.log(group.title);
    }

    console.table(rows);
  }

  console.log(`Updated benchmark result: ${resultPath(config.id)}`);
}

function createResultRow(entry) {
  return {
    case: entry.name,
    "ops/sec": formatInteger(entry.opsPerSecond),
    "median ms": entry.medianMs.toFixed(2),
    "min ms": entry.minMs.toFixed(2),
  };
}

function createChangeRow(entry, previousResult) {
  const previous = findPreviousEntry(entry, previousResult);

  if (!previous) {
    return {
      case: entry.name,
      "ops/sec": formatInteger(entry.opsPerSecond),
      change: "new",
      "median ms": entry.medianMs.toFixed(2),
    };
  }

  return {
    case: entry.name,
    "ops/sec": formatInteger(entry.opsPerSecond),
    change: formatPercentChange(entry.opsPerSecond, previous.opsPerSecond),
    "prev ops/sec": formatInteger(previous.opsPerSecond),
    "median ms": entry.medianMs.toFixed(2),
    "prev median ms": previous.medianMs.toFixed(2),
  };
}

function findPreviousEntry(entry, previousResult) {
  return previousResult.results.find(
    (candidate) =>
      candidate.name === entry.name &&
      (candidate.kind || "") === (entry.kind || ""),
  );
}

function formatPercentChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || !previous) {
    return "n/a";
  }

  const percent = ((current - previous) / previous) * 100;
  const prefix = percent > 0 ? "+" : "";

  return `${prefix}${percent.toFixed(1)}%`;
}

function formatInteger(value) {
  if (!Number.isFinite(value)) {
    return "n/a";
  }

  return Math.round(value).toLocaleString();
}

async function readPreviousResult(id) {
  try {
    const content = await fs.readFile(resultPath(id), "utf8");

    return JSON.parse(content);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function saveResult(id, result) {
  await fs.mkdir(resultDir, { recursive: true });

  await fs.writeFile(
    resultPath(id),
    `${JSON.stringify(
      {
        savedAt: new Date().toISOString(),
        result,
      },
      null,
      2,
    )}\n`,
  );
}

function resultPath(id) {
  return path.join(resultDir, `${id}.json`);
}
