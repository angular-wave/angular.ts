import { spawn } from "node:child_process";
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
const coverageThresholds = {
  branches: 70,
  functions: 78,
  lines: 80,
  statements: 80,
};
const coverageTestArgs = ["playwright", "test", "src"];

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
      "--reporter=html",
      "--reporter=text-summary",
      "--reporter=lcov",
      "--reporter=json-summary",
    ],
    env,
  );
  console.log(`[coverage] report written to ${reportDir}`);

  if (shouldCheckCoverage) {
    console.log("[coverage] checking thresholds");
    coverageExitCode = Math.max(
      coverageExitCode,
      await run(
        "npx",
        [
          "nyc",
          "check-coverage",
          "--temp-dir",
          tempDir,
          "--branches",
          String(coverageThresholds.branches),
          "--functions",
          String(coverageThresholds.functions),
          "--lines",
          String(coverageThresholds.lines),
          "--statements",
          String(coverageThresholds.statements),
        ],
        env,
      ),
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

  for (const metric of ["branches", "functions", "lines", "statements"]) {
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
