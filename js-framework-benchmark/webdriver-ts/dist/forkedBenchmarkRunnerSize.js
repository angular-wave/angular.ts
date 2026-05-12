import { BenchmarkSize, benchmarks } from "./benchmarksSize.js";
import { config as defaultConfig } from "./common.js";
import { checkElementContainsText, checkElementExists, clickElement, startBrowser } from "./puppeteerAccess.js";
let config = defaultConfig;
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
async function runSizeBenchmark(framework, benchmarks, benchmarkOptions) {
    let warnings = [];
    let results = [];
    console.log("size benchmarking", framework);
    let browser = null;
    let page = null;
    try {
        browser = await startBrowser(benchmarkOptions);
        page = await browser.newPage();
        // if (config.LOG_DETAILS) {
        page.on("console", (msg) => {
            for (let i = 0; i < msg.args().length; ++i)
                console.log(`BROWSER: ${msg.args()[i]}`);
        });
        // }
        for (let i = 0; i < benchmarkOptions.batchSize; i++) {
            let enableCompressionResponse = await fetch(`http://${benchmarkOptions.host}:${benchmarkOptions.port}/enableCompression`);
            if (enableCompressionResponse.status !== 200)
                throw new Error("Could not enable compression");
            if (await enableCompressionResponse.text() !== "OK")
                throw new Error("Could not enable compression - OK missing");
            await page.goto(`http://${benchmarkOptions.host}:${benchmarkOptions.port}/${framework.uri}/index.html`, {
                waitUntil: "networkidle0",
            });
            await checkElementExists(page, "pierce/#run");
            await clickElement(page, "pierce/#run");
            await checkElementContainsText(page, "pierce/tbody>tr:nth-of-type(1)>td:nth-of-type(1)", (i * 1000 + 1).toFixed());
            let paintEvents = JSON.parse(await page.evaluate(`JSON.stringify(performance.getEntriesByType("paint"))`));
            console.log("paintEvents", paintEvents);
            let sizeInfoResponse = await fetch(`http://${benchmarkOptions.host}:${benchmarkOptions.port}/sizeInfo`);
            if (sizeInfoResponse.status !== 200)
                throw new Error("Could not enable compression");
            let sizeInfo = (await sizeInfoResponse.json());
            console.log("sizeInfo", sizeInfo);
            sizeInfo.fp = paintEvents.find((e) => e.name === "first-paint").startTime;
            // sizeInfo.fcp = paintEvents.find((e: any) => e.name === "first-contentful-paint").startTime;
            results = benchmarks.subbenchmarks.map((b) => ({
                benchmark: b,
                result: b.fn(sizeInfo)
            }));
        }
        return { error: undefined, warnings, result: results };
    }
    catch (error) {
        console.log("ERROR", error);
        return { error: convertError(error), warnings };
    }
    finally {
        let disableCompressionResponse = await fetch(`http://${benchmarkOptions.host}:${benchmarkOptions.port}/disableCompression`);
        if (disableCompressionResponse.status !== 200)
            console.log("ERROR - Could not disable compression");
        if (await disableCompressionResponse.text() !== "OK")
            console.log("ERROR - Could not disable compression - OK missing");
        try {
            if (browser) {
                await browser.close();
            }
        }
        catch (error) {
            console.log("ERROR cleaning up driver", error);
        }
    }
}
export async function executeBenchmark(framework, benchmarkId, benchmarkOptions) {
    let runBenchmarks = benchmarks.filter((b) => benchmarkId === b.benchmarkInfo.id && (b instanceof BenchmarkSize));
    if (runBenchmarks.length != 1)
        throw `Benchmark name ${benchmarkId} is not unique (size)`;
    let benchmark = runBenchmarks[0];
    let errorAndWarnings;
    errorAndWarnings = await runSizeBenchmark(framework, benchmark, benchmarkOptions);
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
        console.log("CATCH: Error in forkedBenchmarkRunnerSize");
        process.send({ error: convertError(error) });
        process.exit(0);
    });
});
//# sourceMappingURL=forkedBenchmarkRunnerSize.js.map