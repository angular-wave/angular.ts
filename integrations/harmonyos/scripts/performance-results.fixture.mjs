export function performanceReportFixture() {
  return {
    schemaVersion: 1,
    repeatIterations: 5,
    metrics: {
      coldStartMs: { median: 900 },
      firstNativeRevealMs: { p95: 90 },
      bridgeRoundTripMs: { p95: 30 },
      navigationMs: { p95: 250 },
      scrollFrameMs: { p95: 45 },
      memoryRssKb: { median: 65_536 },
    },
  };
}
