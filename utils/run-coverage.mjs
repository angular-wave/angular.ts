import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const tempDir = path.join(rootDir, ".coverage", "tmp");
const reportDir = path.join(rootDir, "coverage");
const baselinePath = path.join(rootDir, "utils", "coverage-baseline.json");
const shouldCheckCoverage = process.argv.includes("--check");
const shouldUpdateBaseline = process.argv.includes("--update-baseline");
const coverageTestArgs = ["playwright", "test", "src"];
const coverageMetrics = ["branches", "functions", "lines", "statements"];
const nycSourceArgs = [
  "--include",
  "src/**/*.js",
  "--include",
  "src/**/*.ts",
  "--extension",
  ".js",
  "--extension",
  ".ts",
];

console.log("[coverage] preparing output directories");
await rm(tempDir, { recursive: true, force: true });
await rm(reportDir, { recursive: true, force: true });
await mkdir(tempDir, { recursive: true });

const coveragePort = process.env.PW_COVERAGE_PORT ?? "4001";
const env = {
  ...process.env,
  PW_BASE_URL: `http://localhost:${coveragePort}`,
  PW_COVERAGE: "1",
  PORT: coveragePort,
};
console.log(
  "[coverage] running Playwright with Istanbul enabled for src/ tests only",
);
const testExitCode = await run("npx", coverageTestArgs, env);

if (testExitCode !== 0) {
  console.error(
    `[coverage] Playwright failed with exit code ${testExitCode}; skipping coverage report and threshold checks`,
  );
  process.exit(testExitCode);
}

const coverageFiles = (await readdir(tempDir)).filter((file) =>
  file.endsWith(".json"),
);

console.log(
  `[coverage] collected ${coverageFiles.length} raw coverage file(s)`,
);

let coverageExitCode = 0;
if (coverageFiles.length > 0) {
  console.log("[coverage] generating HTML, lcov and text-summary reports");
  coverageExitCode = await run(
    "npx",
    [
      "nyc",
      "report",
      "--temp-dir",
      tempDir,
      "--report-dir",
      reportDir,
      ...nycSourceArgs,
      "--reporter=html",
      "--reporter=text-summary",
      "--reporter=lcov",
      "--reporter=json-summary",
    ],
    env,
  );
  console.log(`[coverage] report written to ${reportDir}`);
  coverageExitCode = Math.max(coverageExitCode, await validateReport());

  if (shouldCheckCoverage) {
    console.log("[coverage] checking thresholds");
    coverageExitCode = Math.max(
      coverageExitCode,
      await checkTouchedFilesCoverage(),
    );
  }

  if (shouldCheckCoverage) {
    coverageExitCode = Math.max(coverageExitCode, await checkBaseline());
  }

  if (shouldUpdateBaseline) {
    await updateBaseline();
  }
} else {
  console.warn(
    "[coverage] no coverage data was collected; skipping report generation",
  );
  coverageExitCode = 1;
}

await assertReportExists(reportDir);
process.exit(Math.max(testExitCode, coverageExitCode));

async function assertReportExists(directory) {
  try {
    await access(path.join(directory, "index.html"));
  } catch {
    if (!shouldCheckCoverage && coverageExitCode === 0) {
      console.warn(
        `[coverage] expected report missing at ${directory}/index.html`,
      );
    }
  }
}

async function checkBaseline() {
  const current = await readSummary();
  const baseline = JSON.parse(await readFile(baselinePath, "utf-8"));
  const failures = [];

  for (const metric of coverageMetrics) {
    const currentPct = current.total[metric].pct;
    const baselinePct = baseline.total[metric].pct;

    if (currentPct < baselinePct) {
      failures.push(
        `${metric}: ${currentPct}% is below baseline ${baselinePct}%`,
      );
    }
  }

  if (failures.length) {
    console.error("[coverage] coverage decreased from baseline");
    failures.forEach((failure) => console.error(`[coverage] ${failure}`));

    return 1;
  }

  console.log("[coverage] coverage did not decrease from baseline");

  return 0;
}

async function validateReport() {
  const summary = await readSummary();
  const failures = invalidSummaryMetrics(summary);

  if (failures.length) {
    console.error("[coverage] generated coverage report has no usable data");
    failures.forEach((failure) => console.error(`[coverage] ${failure}`));

    return 1;
  }

  return 0;
}

async function checkTouchedFilesCoverage() {
  const touchedFiles = getTouchedSourceFiles();
  const touchedLines = getTouchedSourceLines();
  const coverage = await readLcov();
  const failures = [];

  for (const file of touchedFiles) {
    if (!isInstrumentableSource(file)) {
      continue;
    }

    const changedLines = touchedLines.get(file) ?? new Set();

    if (changedLines.size === 0) {
      continue;
    }

    const fileCoverage = coverage.get(file);

    if (!fileCoverage) {
      failures.push(`No coverage collected for touched source file: ${file}`);

      continue;
    }

    for (const line of changedLines) {
      const lineHits = fileCoverage.lines.get(line);

      if (lineHits !== undefined && lineHits === 0) {
        failures.push(`Touched line ${file}:${line} is not covered`);
      }

      const branchHits = fileCoverage.branches.get(line) ?? [];

      for (const branch of branchHits) {
        if (branch === 0) {
          failures.push(`Touched branch ${file}:${line} is not fully covered`);
        }
      }

      const functionHits = fileCoverage.functions.get(line) ?? [];

      for (const hits of functionHits) {
        if (hits === 0) {
          failures.push(`Touched function ${file}:${line} is not covered`);
        }
      }
    }
  }

  if (failures.length) {
    console.error("[coverage] touched source lines are not 100% covered");
    failures.forEach((failure) => console.error(`[coverage] ${failure}`));

    return 1;
  }

  console.log("[coverage] all touched source lines are 100% covered");

  return 0;
}

function getTouchedSourceFiles() {
  try {
    const output = execSync("git diff --name-only HEAD -- src", {
      cwd: rootDir,
      encoding: "utf-8",
    });
    const changed = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((file) => file.endsWith(".js") || file.endsWith(".ts"))
      .filter((file) => {
        const sourceFile = path.join(rootDir, file);
        return sourceFile.startsWith(path.join(rootDir, "src"));
      })
      .map((file) => path.join(rootDir, file));

    return changed;
  } catch (error) {
    console.error(
      `[coverage] failed to discover touched source files for strict check: ${String(
        error,
      )}`,
    );

    return [];
  }
}

function getTouchedSourceLines() {
  try {
    const output = execSync("git diff --unified=0 HEAD -- src", {
      cwd: rootDir,
      encoding: "utf-8",
    });

    return parseTouchedSourceLines(output);
  } catch (error) {
    console.error(
      `[coverage] failed to discover touched source lines for strict check: ${String(
        error,
      )}`,
    );

    return new Map();
  }
}

function parseTouchedSourceLines(diff) {
  const touched = new Map();
  let file;
  let nextLine;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) {
      const relative = line.slice("+++ b/".length);
      file = path.join(rootDir, relative);
      nextLine = undefined;

      continue;
    }

    if (line.startsWith("+++ /dev/null")) {
      file = undefined;
      nextLine = undefined;

      continue;
    }

    if (!file) {
      continue;
    }

    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);

    if (hunk) {
      nextLine = Number(hunk[1]);

      continue;
    }

    if (nextLine === undefined) {
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      if (!touched.has(file)) {
        touched.set(file, new Set());
      }

      touched.get(file).add(nextLine);
      nextLine += 1;

      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      continue;
    }

    if (line.length > 0) {
      nextLine += 1;
    }
  }

  return touched;
}

function isInstrumentableSource(file) {
  return (
    file.endsWith(".ts") &&
    !file.endsWith(".spec.ts") &&
    !file.endsWith(".test.ts")
  );
}

async function readLcov() {
  const lcov = await readFile(path.join(reportDir, "lcov.info"), "utf-8");
  const coverage = new Map();
  let current;
  let functionLines = new Map();

  for (const line of lcov.split("\n")) {
    if (line.startsWith("SF:")) {
      const sourceFile = line.slice("SF:".length);
      const file = path.isAbsolute(sourceFile)
        ? sourceFile
        : path.join(rootDir, sourceFile);
      current = {
        branches: new Map(),
        functions: new Map(),
        lines: new Map(),
      };
      functionLines = new Map();
      coverage.set(file, current);

      continue;
    }

    if (!current) {
      continue;
    }

    if (line.startsWith("FN:")) {
      const payload = line.slice("FN:".length);
      const comma = payload.indexOf(",");

      if (comma !== -1) {
        const functionLine = Number(payload.slice(0, comma));
        const name = payload.slice(comma + 1);

        functionLines.set(name, functionLine);
      }

      continue;
    }

    if (line.startsWith("FNDA:")) {
      const payload = line.slice("FNDA:".length);
      const comma = payload.indexOf(",");

      if (comma !== -1) {
        const hits = Number(payload.slice(0, comma));
        const name = payload.slice(comma + 1);
        const functionLine = functionLines.get(name);

        if (functionLine !== undefined) {
          appendCoverageValue(current.functions, functionLine, hits);
        }
      }

      continue;
    }

    if (line.startsWith("DA:")) {
      const [lineNumber, hits] = line
        .slice("DA:".length)
        .split(",", 2)
        .map(Number);

      current.lines.set(lineNumber, hits);

      continue;
    }

    if (line.startsWith("BRDA:")) {
      const [lineNumber, , , taken] = line.slice("BRDA:".length).split(",");

      appendCoverageValue(
        current.branches,
        Number(lineNumber),
        taken === "-" ? 0 : Number(taken),
      );

      continue;
    }

    if (line === "end_of_record") {
      current = undefined;
      functionLines = new Map();
    }
  }

  return coverage;
}

function appendCoverageValue(map, line, value) {
  if (!map.has(line)) {
    map.set(line, []);
  }

  map.get(line).push(value);
}

function invalidSummaryMetrics(summary) {
  const failures = [];

  for (const metric of coverageMetrics) {
    const values = summary?.total?.[metric];
    const pct = values?.pct;

    if (!values || !Number.isFinite(pct)) {
      failures.push(`${metric}: percentage is ${String(pct)}`);
      continue;
    }

    if (!Number.isFinite(values.total) || values.total <= 0) {
      failures.push(`${metric}: total is ${String(values.total)}`);
    }
  }

  return failures;
}

async function updateBaseline() {
  const current = await readSummary();
  const baseline = {
    total: {
      branches: current.total.branches,
      functions: current.total.functions,
      lines: current.total.lines,
      statements: current.total.statements,
    },
  };

  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`[coverage] baseline updated at ${baselinePath}`);
}

async function readSummary() {
  return JSON.parse(
    await readFile(path.join(reportDir, "coverage-summary.json"), "utf-8"),
  );
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited due to signal ${signal}`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}
