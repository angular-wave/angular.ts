import { Builder } from "selenium-webdriver";
import { CPUBenchmarkWebdriver, benchmarks } from "./benchmarksWebdriverAfterframe.js";
import { setUseShadowRoot, setUseRowShadowRoot, setShadowRootName, setButtonsInShadowRoot } from "./webdriverAccess.js";
import { config as defaultConfig } from "./common.js";
import { BenchmarkType } from "./benchmarksCommon.js";
import { getAfterframeDurations, initMeasurement } from "./benchmarksWebdriverAfterframe.js";
let config = defaultConfig;
async function runBenchmark(driver, benchmark, framework) {
    await benchmark.run(driver, framework);
    if (config.LOG_PROGRESS)
        console.log("after run", benchmark.benchmarkInfo.id, benchmark.benchmarkInfo.type, framework.name);
}
async function initBenchmark(driver, benchmark, framework) {
    await benchmark.init(driver, framework);
    if (config.LOG_PROGRESS)
        console.log("after initialized", benchmark.benchmarkInfo.id, benchmark.benchmarkInfo.type, framework.name);
    await initMeasurement(driver);
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
async function runCPUBenchmark(framework, benchmark, benchmarkOptions) {
    let error = undefined;
    let warnings = [];
    let results = [];
    console.log("benchmarking", framework, benchmark.benchmarkInfo.id);
    let driver = null;
    try {
        // let driver = buildDriver(benchmarkOptions);
        driver = await new Builder().forBrowser(benchmarkOptions.browser).build();
        console.log(`using afterframe measurement with ${benchmarkOptions.browser}`);
        await driver.manage().window().maximize();
        for (let i = 0; i < benchmarkOptions.batchSize; i++) {
            setUseShadowRoot(framework.useShadowRoot);
            setUseRowShadowRoot(framework.useRowShadowRoot);
            if (framework.shadowRootName) {
                setShadowRootName(framework.shadowRootName);
            }
            setButtonsInShadowRoot(framework.buttonsInShadowRoot);
            console.log("runCPUBenchmark: before loading page");
            // must be run with an IP adress otherwise Safari crashes with an error.
            // Use the HOST env variable to set the HOST to an IP adress for safari!
            await driver.get(`http://${benchmarkOptions.host}:${benchmarkOptions.port}/${framework.uri}/index.html`);
            // Needed for Firefox
            await driver.sleep(50);
            console.log("runCPUBenchmark: initBenchmark");
            await initBenchmark(driver, benchmark, framework);
            console.log("runCPUBenchmark: runBenchmark");
            await runBenchmark(driver, benchmark, framework);
            console.log("runCPUBenchmark: getAfterframeDurations");
            results.push(...getAfterframeDurations());
            console.log("runCPUBenchmark: loop end");
        }
        console.log("runCPUBenchmark: driver.quit");
        await driver.quit();
        return { error, warnings, result: results };
    }
    catch (error) {
        console.log("ERROR", error);
        try {
            if (driver) {
                await driver.close();
                await driver.quit();
            }
        }
        catch (error) {
            console.log("ERROR cleaning up driver", error);
        }
        return { error: convertError(error), warnings };
    }
}
export async function executeBenchmark(framework, benchmarkId, benchmarkOptions) {
    let runBenchmarks = benchmarks.filter((b) => benchmarkId === b.benchmarkInfo.id && b instanceof CPUBenchmarkWebdriver);
    if (runBenchmarks.length != 1)
        throw `Benchmark name ${benchmarkId} is not unique (webdriver)`;
    let benchmark = runBenchmarks[0];
    let errorAndWarnings = { error: "No benchmark executed" };
    if (benchmark.benchmarkInfo.type == BenchmarkType.CPU) {
        errorAndWarnings = await runCPUBenchmark(framework, benchmark, benchmarkOptions);
    }
    if (config.LOG_DEBUG)
        console.log("benchmark finished - got errors promise", errorAndWarnings);
    return errorAndWarnings;
}
process.on("message", (msg) => {
    config = msg.config;
    console.log("START BENCHMARK. Write results?", config.WRITE_RESULTS);
    let { framework, benchmarkId, benchmarkOptions, } = msg;
    executeBenchmark(framework, benchmarkId, benchmarkOptions)
        .then((result) => {
        process.send(result);
        process.exit(0);
    })
        .catch((error) => {
        console.log("CATCH: Error in forkedBenchmarkRunner");
        process.send({ error: convertError(error) });
        process.exit(0);
    });
});
//# sourceMappingURL=forkedBenchmarkRunnerWebdriverAfterframe.js.map