import * as chromeLauncher from "chrome-launcher";
import { config as defaultConfig } from "./common.js";
import { BenchmarkLighthouse, benchmarks } from "./benchmarksLighthouse.js";
import lighthouse from "lighthouse";
let config = defaultConfig;
function extractRawValue(results, id) {
    let audits = results.audits;
    if (!audits)
        return null;
    let audit_with_id = audits[id];
    if (audit_with_id === undefined)
        return null;
    if (audit_with_id.numericValue === undefined)
        return null;
    return audit_with_id.numericValue;
}
async function runLighthouse(framework, startupBenchmarks, benchmarkOptions) {
    const opts = {
        chromeFlags: [
            "--headless",
            "--no-sandbox",
            "--no-first-run",
            "--enable-automation",
            "--disable-infobars",
            "--disable-background-networking",
            "--disable-background-timer-throttling",
            "--disable-cache",
            "--disable-translate",
            "--disable-sync",
            "--disable-extensions",
            "--disable-default-apps",
            "--window-size=1200,800",
            "--remote-debugging-port=" + benchmarkOptions.remoteDebuggingPort.toFixed(),
        ],
        onlyCategories: ["performance"],
        port: benchmarkOptions.remoteDebuggingPort.toFixed(),
        logLevel: "info",
    };
    try {
        if (benchmarkOptions.chromeBinaryPath)
            opts.chromePath = benchmarkOptions.chromeBinaryPath;
        let chrome = await chromeLauncher.launch(opts);
        let results = null;
        try {
            results = await lighthouse(`http://${benchmarkOptions.host}:${benchmarkOptions.port}/${framework.uri}/index.html`, opts, null);
            await chrome.kill();
        }
        catch (error) {
            console.log("error running lighthouse", error);
            await chrome.kill();
            throw error;
        }
        if (config.LOG_DEBUG)
            console.log("lighthouse result", JSON.stringify(results));
        return startupBenchmarks.map((bench) => ({
            benchmark: bench,
            result: bench.fn(extractRawValue(results.lhr, bench.property)),
        }));
    }
    catch (error) {
        console.log("error running lighthouse", error);
        throw error;
    }
}
function convertError(error) {
    console.log("ERROR in run Benchmark: |", error, "| type:", typeof error, "instance of Error", error instanceof Error, "Message:", error.message);
    if (typeof error === "string") {
        console.log("Error is string");
        return error;
    }
    else if (error instanceof Error) {
        console.log("Error is instanceof Error");
        return error.message;
    }
    else {
        console.log("Error is unknown type");
        return error.toString();
    }
}
async function runStartupBenchmark(framework, benchmark, benchmarkOptions) {
    console.log("benchmarking startup", framework, benchmark.benchmarkInfo.id);
    let error = undefined;
    try {
        let result = await runLighthouse(framework, benchmark.subbenchmarks, benchmarkOptions);
        return { error, warnings: [], result };
    }
    catch (error) {
        return { error: convertError(error), warnings: [] };
    }
}
export async function executeBenchmark(framework, benchmarkId, benchmarkOptions) {
    let runBenchmarks = benchmarks.filter((b) => benchmarkId === b.benchmarkInfo.id && b instanceof BenchmarkLighthouse);
    if (runBenchmarks.length != 1)
        throw `Benchmark name ${benchmarkId} is not unique (lighthouse)`;
    let benchmark = runBenchmarks[0];
    let errorAndWarnings;
    errorAndWarnings = await runStartupBenchmark(framework, benchmark, benchmarkOptions);
    if (config.LOG_DEBUG)
        console.log("benchmark finished - got errors promise", errorAndWarnings);
    return errorAndWarnings;
}
process.on("message", (msg) => {
    config = msg.config;
    console.log("START BENCHMARK. Write results?", config.WRITE_RESULTS);
    // if (config.LOG_DEBUG) console.log("child process got message", msg);
    let { framework, benchmarkId, benchmarkOptions, } = msg;
    executeBenchmark(framework, benchmarkId, benchmarkOptions)
        .then((result) => {
        process.send(result);
        process.exit(0);
    })
        .catch((error) => {
        console.log("CATCH: Error in forkedBenchmarkRunnerLighthouse");
        process.send({ error: convertError(error) });
        process.exit(0);
    });
});
//# sourceMappingURL=forkedBenchmarkRunnerLighthouse.js.map