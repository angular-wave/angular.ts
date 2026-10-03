const ansiPattern = /\u001b\[[0-9;]*[mK]/gu;
const summaryPattern = /OpenHarmony API 23 checked [^\n]+/u;
const warningBudgets = new Map([
  ["Function may throw exceptions. Special handling is required.", 33],
  ["Usage of 'ESObject' type is restricted (arkts-limited-esobj)", 12],
  ["To use this API, you need to apply for the permissions: ohos.permission.INTERNET", 2],
  ["To use this API, you need to apply for the permissions: ohos.permission.GET_NETWORK_INFO", 2],
  ["To use this API, you need to apply for the permissions: ohos.permission.ACCESS_BIOMETRIC", 2],
  ["To use this API, you need to apply for the permissions: ohos.permission.VIBRATE", 1],
  ["To use this API, you need to apply for the permissions: ohos.permission.READ_PASTEBOARD", 1],
  ["To use this API, you need to apply for the permissions: ohos.permission.APPROXIMATELY_LOCATION", 1],
]);

export function classifyOpenHarmonyAudit(output) {
  const plain = output.replace(ansiPattern, "");
  const errors = [...plain.matchAll(/ArkTS:ERROR File: ([^\n:]+(?:\/[^\n:]+)*):\d+:\d+/gu)]
    .map((match) => match[1]);
  const sdkErrors = errors.filter((file) => file.includes("/ets/ets/api/")).length;
  const repositoryErrors = errors.length - sdkErrors;
  const warnings = [...plain.matchAll(/ArkTS:WARN File: [^\n]+\n\s*([^\n]+)/gu)]
    .map((match) => match[1].trim());
  const warningCounts = new Map();
  for (const warning of warnings) {
    warningCounts.set(warning, (warningCounts.get(warning) ?? 0) + 1);
  }
  const unexpectedWarnings = [];
  for (const [warning, count] of warningCounts) {
    const budget = warningBudgets.get(warning) ?? 0;
    if (count > budget) unexpectedWarnings.push(`${warning}: ${count} exceeds ${budget}`);
  }
  const filtered = output
    .split("\n\n")
    .filter((block) => !(block.includes("ArkTS:ERROR File:") && block.includes("/ets/ets/api/")))
    .join("\n\n")
    .replace(
      summaryPattern,
      `OpenHarmony API 23 repository audit: ${repositoryErrors} errors; ${warnings.length} reviewed warnings; ${sdkErrors} SDK declaration errors ignored`,
    );

  return {
    completed: summaryPattern.test(plain),
    filtered,
    repositoryErrors,
    sdkErrors,
    unexpectedWarnings,
    warnings: warnings.length,
  };
}
