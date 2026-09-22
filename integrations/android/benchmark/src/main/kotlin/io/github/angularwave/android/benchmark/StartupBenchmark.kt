package io.github.angularwave.android.benchmark

import android.content.Intent
import android.os.SystemClock
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
                        .setClassName(PACKAGE_NAME, MAIN_ACTIVITY)
                        .putExtra(COLLECTION_BENCHMARK_EXTRA, true)
                )
            },
        ) {
            val update =
                requireNotNull(
                    device.wait(
                        Until.findObject(By.text(COLLECTION_UPDATE_TEXT)),
                        UI_TIMEOUT_MS,
                    )
                ) {
                    "Collection benchmark control did not become accessible"
                }
            update.click()
            device.waitForIdle()
            val allocatedBytes =
                update.contentDescription.substringAfter(ALLOCATED_BYTES_PREFIX).toLong()
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
                        .setClassName(PACKAGE_NAME, MAIN_ACTIVITY)
                        .putExtra(WEB_VIEW_BENCHMARK_EXTRA, true)
                )
            },
        ) {
            val run =
                requireNotNull(
                    device.wait(
                        Until.findObject(By.text(BRIDGE_RUN_TEXT)),
                        UI_TIMEOUT_MS,
                    )
                ) {
                    "WebView benchmark control did not become accessible"
                }
            check(waitUntil { run.isEnabled }) { "WebView benchmark control did not become ready" }
            run.click()
            check(
                waitUntil {
                    BRIDGE_RESULT_PATTERN.matcher(run.contentDescription?.toString().orEmpty())
                        .matches()
                }
            ) {
                "WebView benchmark result was not reported"
            }
            val description = run.contentDescription.toString()
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

    private fun waitUntil(predicate: () -> Boolean): Boolean {
        val deadline = SystemClock.uptimeMillis() + UI_TIMEOUT_MS
        do {
            if (predicate()) return true
            SystemClock.sleep(POLL_INTERVAL_MS)
        } while (SystemClock.uptimeMillis() < deadline)
        return predicate()
    }

    private companion object {
        const val PACKAGE_NAME = "io.github.angularwave.android.demo"
        const val MAIN_ACTIVITY = "$PACKAGE_NAME.main.MainActivity"
        const val COLLECTION_BENCHMARK_EXTRA = "collectionBenchmark"
        const val COLLECTION_UPDATE_TEXT = "Update 10,000 items"
        const val WEB_VIEW_BENCHMARK_EXTRA = "webViewBenchmark"
        const val BRIDGE_RUN_TEXT = "Run bridge benchmark"
        const val UI_TIMEOUT_MS = 10_000L
        const val POLL_INTERVAL_MS = 50L
        const val SWIPE_STEPS = 20
        const val SWIPE_START_NUMERATOR = 3
        const val SWIPE_POSITION_DENOMINATOR = 4
        const val ALLOCATED_BYTES_PREFIX = "allocatedBytes="
        const val MAX_UPDATE_ALLOCATED_BYTES = 64L * 1024 * 1024
        const val BRIDGE_LATENCY_PREFIX = "bridgeLatencyMs="
        const val WEB_VIEW_PSS_PREFIX = "appPssKb="
        const val BRIDGE_CALL_COUNT = 1_000
        const val MAX_BRIDGE_LATENCY_MS = 1_000.0
        const val MAX_WEB_VIEW_APP_PSS_KB = 128L * 1024
        val BRIDGE_RESULT_PATTERN: Pattern =
            Pattern.compile("^bridgeLatencyMs=[0-9]+(?:\\.[0-9]+)?; appPssKb=[0-9]+$")
    }
}
