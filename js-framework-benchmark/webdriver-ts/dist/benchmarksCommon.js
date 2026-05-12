export var BenchmarkType;
(function (BenchmarkType) {
    BenchmarkType[BenchmarkType["CPU"] = 0] = "CPU";
    BenchmarkType[BenchmarkType["MEM"] = 1] = "MEM";
    BenchmarkType[BenchmarkType["STARTUP_MAIN"] = 2] = "STARTUP_MAIN";
    BenchmarkType[BenchmarkType["STARTUP"] = 3] = "STARTUP";
    BenchmarkType[BenchmarkType["SIZE_MAIN"] = 4] = "SIZE_MAIN";
    BenchmarkType[BenchmarkType["SIZE"] = 5] = "SIZE";
})(BenchmarkType || (BenchmarkType = {}));
export function fileName(framework, benchmark) {
    return `${framework.fullNameWithKeyedAndVersion}_${benchmark.id}.json`;
}
export var Benchmark;
(function (Benchmark) {
    Benchmark["_01"] = "01_run1k";
    Benchmark["_02"] = "02_replace1k";
    Benchmark["_03"] = "03_update10th1k_x16";
    Benchmark["_04"] = "04_select1k";
    Benchmark["_05"] = "05_swap1k";
    Benchmark["_06"] = "06_remove-one-1k";
    Benchmark["_07"] = "07_create10k";
    Benchmark["_08"] = "08_create1k-after1k_x2";
    Benchmark["_09"] = "09_clear1k_x8";
    Benchmark["_21"] = "21_ready-memory";
    Benchmark["_22"] = "22_run-memory";
    Benchmark["_23"] = "23_update5-memory";
    Benchmark["_24"] = "24_run5-memory";
    Benchmark["_25"] = "25_run-clear-memory";
    Benchmark["_26"] = "26_run-10k-memory";
    Benchmark["_30"] = "30_startup";
    Benchmark["_40"] = "40_sizes";
})(Benchmark || (Benchmark = {}));
const throttlingFactors = {
    [Benchmark._03]: 4,
    [Benchmark._04]: 4,
    [Benchmark._05]: 4,
    [Benchmark._06]: 2,
    [Benchmark._09]: 4,
};
export function slowDownNote(throttleCPU) {
    return throttleCPU ? ` ${throttleCPU} x CPU slowdown.` : "";
}
export function warmupNote(b) {
    return 'warmupCount' in b ? ` (${b.warmupCount} warmup runs).` : "";
}
export function slowDownFactor(benchmarkId, allowThrottling) {
    if (!allowThrottling)
        return undefined;
    return throttlingFactors[benchmarkId];
}
export const cpuBenchmarkInfosArray = [
    {
        id: Benchmark._01,
        label: "create rows",
        warmupCount: 5,
        description: "creating 1,000 rows.",
        type: BenchmarkType.CPU,
        allowBatching: true,
        layoutEventRequired: true,
        additionalNumberOfRuns: 0,
    },
    {
        id: Benchmark._02,
        label: "replace all rows",
        warmupCount: 5,
        description: "updating all 1,000 rows.",
        type: BenchmarkType.CPU,
        allowBatching: true,
        layoutEventRequired: true,
        additionalNumberOfRuns: 0,
    },
    {
        id: Benchmark._03,
        label: "partial update",
        warmupCount: 3,
        description: "updating every 10th row for 1,000 row.",
        type: BenchmarkType.CPU,
        allowBatching: true,
        layoutEventRequired: true,
        additionalNumberOfRuns: 0,
    },
    {
        id: Benchmark._04,
        label: "select row",
        warmupCount: 5,
        description: "highlighting a selected row.",
        type: BenchmarkType.CPU,
        allowBatching: true,
        layoutEventRequired: false,
        additionalNumberOfRuns: 10,
    },
    {
        id: Benchmark._05,
        label: "swap rows",
        warmupCount: 5,
        description: "swap 2 rows for table with 1,000 rows.",
        type: BenchmarkType.CPU,
        allowBatching: true,
        layoutEventRequired: true,
        additionalNumberOfRuns: 0,
    },
    {
        id: Benchmark._06,
        label: "remove row",
        warmupCount: 5,
        description: "removing one row.",
        type: BenchmarkType.CPU,
        allowBatching: true,
        layoutEventRequired: true,
        additionalNumberOfRuns: 0,
    },
    {
        id: Benchmark._07,
        label: "create many rows",
        warmupCount: 5,
        description: "creating 10,000 rows.",
        type: BenchmarkType.CPU,
        allowBatching: true,
        layoutEventRequired: true,
        additionalNumberOfRuns: 0,
    },
    {
        id: Benchmark._08,
        label: "append rows to large table",
        warmupCount: 5,
        description: "appending 1,000 to a table of 1,000 rows.",
        type: BenchmarkType.CPU,
        allowBatching: true,
        layoutEventRequired: true,
        additionalNumberOfRuns: 0,
    },
    {
        id: Benchmark._09,
        label: "clear rows",
        warmupCount: 5,
        description: "clearing a table with 1,000 rows.",
        type: BenchmarkType.CPU,
        allowBatching: true,
        layoutEventRequired: true,
        additionalNumberOfRuns: 0,
    },
];
export const memBenchmarkInfosArray = [
    {
        id: Benchmark._21,
        label: "ready memory",
        description: "Memory usage after page load.",
        type: BenchmarkType.MEM,
    },
    {
        id: Benchmark._22,
        label: "run memory",
        description: "Memory usage after adding 1,000 rows.",
        type: BenchmarkType.MEM,
    },
    // {
    //   id: Benchmark._23,
    //   label: "update every 10th row for 1k rows (5 cycles)",
    //   description: "Memory usage after clicking update every 10th row 5 times",
    //   type: BenchmarkType.MEM,
    // },
    // {
    //   id: Benchmark._24,
    //   label: "replace 1k rows (5 cycles)",
    //   description: "Memory usage after clicking create 1000 rows 5 times",
    //   type: BenchmarkType.MEM,
    // },
    {
        id: Benchmark._25,
        label: "creating/clearing 1k rows (5 cycles)",
        description: "Memory usage after creating and clearing 1000 rows 5 times",
        type: BenchmarkType.MEM,
    },
    // {
    //   id: Benchmark._26,
    //   label: "run memory 10k",
    //   description: "Memory usage after adding 10,000 rows.",
    //   type: BenchmarkType.MEM,
    // },
];
export const startupBenchmarkInfosArray = [
    {
        id: Benchmark._30,
        type: BenchmarkType.STARTUP_MAIN,
        label: "",
        description: "",
    }
];
export const sizesBenchmarkInfosArray = [
    {
        id: Benchmark._40,
        type: BenchmarkType.SIZE_MAIN,
        label: "",
        description: "",
    },
];
export const cpuBenchmarkInfos = {};
for (let bi of cpuBenchmarkInfosArray) {
    cpuBenchmarkInfos[bi.id] = bi;
}
export const memBenchmarkInfos = {};
for (let bi of memBenchmarkInfosArray) {
    memBenchmarkInfos[bi.id] = bi;
}
export const startupBenchmarkInfos = {};
for (let bi of startupBenchmarkInfosArray) {
    startupBenchmarkInfos[bi.id] = bi;
}
export const sizeBenchmarkInfos = {};
for (let bi of sizesBenchmarkInfosArray) {
    sizeBenchmarkInfos[bi.id] = bi;
}
export const benchmarkInfos = [...cpuBenchmarkInfosArray, ...memBenchmarkInfosArray, ...sizesBenchmarkInfosArray];
//# sourceMappingURL=benchmarksCommon.js.map