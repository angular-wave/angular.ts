import * as benchmarksCommon from "./benchmarksCommon.js";
import { BenchmarkType } from "./benchmarksCommon.js";
let id = (x) => x;
let toKb = (x) => x / 1024;
export const benchStartupConsistentlyInteractive = {
    id: "31_startup-ci",
    label: "consistently interactive",
    description: "a pessimistic TTI - when the CPU and network are both definitely very idle. (no more CPU tasks over 50ms)",
    property: "interactive",
    fn: id,
    type: BenchmarkType.STARTUP,
};
export const benchStartupBootup = {
    id: "32_startup-bt",
    label: "script bootup time",
    description: "the total ms required to parse/compile/evaluate all the page's scripts",
    property: "bootup-time",
    fn: id,
    type: BenchmarkType.STARTUP,
};
export const benchStartupMainThreadWorkCost = {
    id: "33_startup-mainthreadcost",
    label: "main thread work cost",
    description: "total amount of time spent doing work on the main thread. includes style/layout/etc.",
    property: "mainthread-work-breakdown",
    fn: id,
    type: BenchmarkType.STARTUP,
};
export const benchStartupMainInteractive = {
    id: "34_startup-interactive",
    label: "interactive",
    description: "Time to Interactive is the amount of time it takes for the page to become fully interactive.",
    property: "interactive",
    fn: id,
    type: BenchmarkType.STARTUP,
};
export const subbenchmarks = [
    benchStartupConsistentlyInteractive,
    benchStartupBootup,
    benchStartupMainThreadWorkCost,
    benchStartupMainInteractive,
];
export class BenchmarkLighthouse {
    constructor() {
        this.type = BenchmarkType.STARTUP_MAIN;
        this.benchmarkInfo = benchmarksCommon.startupBenchmarkInfos[benchmarksCommon.Benchmark._30];
        this.subbenchmarks = subbenchmarks;
    }
}
export const benchLighthouse = new BenchmarkLighthouse();
export const benchmarks = [benchLighthouse];
//# sourceMappingURL=benchmarksLighthouse.js.map