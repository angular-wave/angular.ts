package io.github.angularwave.android.benchmark

import android.content.Intent
import androidx.benchmark.macro.ExperimentalMetricApi
import androidx.benchmark.macro.FrameTimingMetric
import androidx.benchmark.macro.MacrobenchmarkScope
import androidx.benchmark.macro.MemoryUsageMetric
import androidx.benchmark.macro.StartupMode
import androidx.benchmark.macro.StartupTimingMetric
import androidx.benchmark.macro.junit4.MacrobenchmarkRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import androidx.test.uiautomator.By
import androidx.test.uiautomator.Until
import java.util.regex.Pattern
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Measures cold startup and initial frame performance for the demo application. */
@LargeTest
@RunWith(AndroidJUnit4::class)
class StartupBenchmark {
    /** Runs macrobenchmarks with the AndroidX test rule. */
    @get:Rule val benchmarkRule = MacrobenchmarkRule()

    /** Measures cold startup timing and the first rendered frames. */
    @Test
    fun coldStartupAndFirstFrames() {
        benchmarkRule.measureRepeated(
            packageName = PACKAGE_NAME,
            metrics = listOf(StartupTimingMetric(), FrameTimingMetric()),
            iterations = 5,
            startupMode = StartupMode.COLD,
            setupBlock = MacrobenchmarkScope::pressHome,
        ) {
            startActivityAndWait()
        }
    }

    /** Measures a keyed 10,000-item update and subsequent recycled scrolling. */
    @OptIn(ExperimentalMetricApi::class)
    @Test
    fun keyedCollectionUpdateAndScroll() {
        benchmarkRule.measureRepeated(
            packageName = PACKAGE_NAME,
            metrics = listOf(FrameTimingMetric(), MemoryUsageMetric(MemoryUsageMetric.Mode.Last)),
            iterations = 5,
            setupBlock = {
                pressHome()
                killProcess()
                startActivityAndWait(
                    Intent(Intent.ACTION_MAIN)
                        .setClassName(PACKAGE_NAME, COLLECTION_BENCHMARK_ACTIVITY)
                )
                check(
                    device.wait(
                        Until.hasObject(By.desc(COLLECTION_READY_DESCRIPTION)),
                        UI_TIMEOUT_MS,
                    )
                ) {
                    "Collection benchmark control did not become accessible; " +
                        "foreground package is ${device.currentPackageName}"
                }
            },
        ) {
            val update =
                requireNotNull(device.findObject(By.desc(COLLECTION_READY_DESCRIPTION))) {
                    "Collection benchmark control disappeared before measurement"
                }
            update.click()
            val result =
                requireNotNull(
                    device.wait(
                        Until.findObject(By.desc(COLLECTION_RESULT_PATTERN)),
                        UI_TIMEOUT_MS,
                    )
                ) {
                    "Collection benchmark result was not reported"
                }
            val allocatedBytes =
                result.contentDescription.substringAfter(ALLOCATED_BYTES_PREFIX).toLong()
            check(allocatedBytes <= MAX_UPDATE_ALLOCATED_BYTES) {
                "10,000-item keyed update allocated $allocatedBytes bytes; " +
                    "budget is $MAX_UPDATE_ALLOCATED_BYTES"
            }
            val centerX = device.displayWidth / 2
            device.swipe(
                centerX,
                device.displayHeight * SWIPE_START_NUMERATOR / SWIPE_POSITION_DENOMINATOR,
                centerX,
                device.displayHeight / SWIPE_POSITION_DENOMINATOR,
                SWIPE_STEPS,
            )
            device.waitForIdle()
        }
    }

    /** Measures JavaScript bridge latency and the WebView host process memory footprint. */
    @OptIn(ExperimentalMetricApi::class)
    @Test
    fun webViewBridgeRoundTrips() {
        benchmarkRule.measureRepeated(
            packageName = PACKAGE_NAME,
            metrics = listOf(FrameTimingMetric(), MemoryUsageMetric(MemoryUsageMetric.Mode.Last)),
            iterations = 5,
            setupBlock = {
                pressHome()
                killProcess()
                startActivityAndWait(
                    Intent(Intent.ACTION_MAIN)
                        .setClassName(PACKAGE_NAME, WEB_VIEW_BENCHMARK_ACTIVITY)
                )
                check(
                    device.wait(
                        Until.hasObject(By.desc(BRIDGE_READY_DESCRIPTION).enabled(true)),
                        UI_TIMEOUT_MS,
                    )
                ) {
                    "WebView benchmark control did not become accessible; " +
                        "foreground package is ${device.currentPackageName}"
                }
            },
        ) {
            val run =
                requireNotNull(device.findObject(By.desc(BRIDGE_READY_DESCRIPTION).enabled(true))) {
                    "WebView benchmark control disappeared before measurement"
                }
            run.click()
            val result =
                requireNotNull(
                    device.wait(
                        Until.findObject(By.desc(BRIDGE_RESULT_PATTERN)),
                        UI_TIMEOUT_MS,
                    )
                ) {
                    "WebView benchmark result was not reported"
                }
            val description = result.contentDescription
            val latencyMilliseconds =
                description.substringAfter(BRIDGE_LATENCY_PREFIX).substringBefore(';').toDouble()
            check(latencyMilliseconds <= MAX_BRIDGE_LATENCY_MS) {
                "$BRIDGE_CALL_COUNT bridge calls took $latencyMilliseconds ms; " +
                    "budget is $MAX_BRIDGE_LATENCY_MS ms"
            }
            val appPssKb = description.substringAfter(WEB_VIEW_PSS_PREFIX).toLong()
            check(appPssKb <= MAX_WEB_VIEW_APP_PSS_KB) {
                "WebView host process used $appPssKb KiB PSS; " +
                    "budget is $MAX_WEB_VIEW_APP_PSS_KB KiB"
            }
        }
    }

    private companion object {
        const val PACKAGE_NAME = "io.github.angularwave.android.demo"
        const val COLLECTION_BENCHMARK_ACTIVITY = "$PACKAGE_NAME.main.CollectionBenchmarkActivity"
        const val WEB_VIEW_BENCHMARK_ACTIVITY = "$PACKAGE_NAME.main.WebViewBenchmarkActivity"
        const val UI_TIMEOUT_MS = 30_000L
        const val SWIPE_STEPS = 20
        const val SWIPE_START_NUMERATOR = 3
        const val SWIPE_POSITION_DENOMINATOR = 4
        const val ALLOCATED_BYTES_PREFIX = "allocatedBytes="
        const val COLLECTION_READY_DESCRIPTION = "collectionBenchmark=ready"
        const val MAX_UPDATE_ALLOCATED_BYTES = 64L * 1024 * 1024
        const val BRIDGE_LATENCY_PREFIX = "bridgeLatencyMs="
        const val BRIDGE_READY_DESCRIPTION = "bridgeLatencyMs=ready"
        const val WEB_VIEW_PSS_PREFIX = "appPssKb="
        const val BRIDGE_CALL_COUNT = 1_000
        const val MAX_BRIDGE_LATENCY_MS = 1_000.0
        const val MAX_WEB_VIEW_APP_PSS_KB = 128L * 1024
        val BRIDGE_RESULT_PATTERN: Pattern =
            Pattern.compile("^bridgeLatencyMs=[0-9]+(?:\\.[0-9]+)?; appPssKb=[0-9]+$")
        val COLLECTION_RESULT_PATTERN: Pattern = Pattern.compile("^.+; allocatedBytes=[0-9]+$")
    }
}
