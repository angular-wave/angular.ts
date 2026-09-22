package io.github.angularwave.android.navigation.elements

import android.content.ComponentCallbacks2
import android.os.StrictMode
import android.os.strictmode.Violation
import android.widget.FrameLayout
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.android.material.button.MaterialButton
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.Executor
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeProductionQualityInstrumentedTest {
    @Suppress("DEPRECATION")
    @Test
    fun mountedNativeStateSurvivesCriticalMemoryPressure() {
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val host = FrameLayout(activity)
                activity.setContentView(host)
                val events = mutableListOf<String>()
                val button =
                    AndroidNativeElements.registry.create(
                        NativeElementCatalog.Wire.BUTTON,
                        NativeElementContext(
                            activity,
                            host,
                            activity,
                            activity,
                            events = { event, _ -> events += event },
                        ),
                        JSONObjectProperties(
                            JSONObject().put(NativeElementCatalog.Wire.TEXT, "Before pressure")
                        ),
                    ) as MaterialButton
                host.addView(button)

                activity.application.onTrimMemory(ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL)
                activity.onTrimMemory(ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL)
                AndroidNativeElements.registry.update(
                    button,
                    JSONObjectProperties(
                        JSONObject().put(NativeElementCatalog.Wire.TEXT, "After pressure")
                    ),
                )
                button.performClick()

                assertSame(button, host.getChildAt(0))
                assertEquals("After pressure", button.text.toString())
                assertEquals(listOf(NativeElementCatalog.Wire.CLICK), events)
                AndroidNativeElements.registry.dispose(button)
            }
        }
    }

    @Test
    fun nativeLifecycleHasNoAngularNativeStrictModeViolations() {
        val violations = ConcurrentLinkedQueue<Violation>()
        val directExecutor = Executor(Runnable::run)
        val previousVmPolicy = StrictMode.getVmPolicy()
        StrictMode.setVmPolicy(
            StrictMode.VmPolicy.Builder(previousVmPolicy)
                .detectAll()
                .penaltyListener(directExecutor) { violation ->
                    recordAngularNativeViolation(violations, violation)
                }
                .build()
        )

        try {
            repeat(3) {
                ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
                    scenario.onActivity { activity ->
                        val previousThreadPolicy = StrictMode.getThreadPolicy()
                        StrictMode.setThreadPolicy(
                            StrictMode.ThreadPolicy.Builder(previousThreadPolicy)
                                .detectAll()
                                .penaltyListener(directExecutor) { violation ->
                                    recordAngularNativeViolation(violations, violation)
                                }
                                .build()
                        )
                        try {
                            val host = FrameLayout(activity)
                            activity.setContentView(host)
                            val view =
                                AndroidNativeElements.registry.create(
                                    NativeElementCatalog.Wire.BUTTON,
                                    NativeElementContext(
                                        activity,
                                        host,
                                        activity,
                                        activity,
                                        events = { _, _ -> },
                                    ),
                                    JSONObjectProperties(
                                        JSONObject()
                                            .put(NativeElementCatalog.Wire.TEXT, "Strict mode")
                                    ),
                                )
                            host.addView(view)
                            AndroidNativeElements.registry.update(
                                view,
                                JSONObjectProperties(
                                    JSONObject().put(NativeElementCatalog.Wire.TEXT, "Updated")
                                ),
                            )
                            AndroidNativeElements.registry.dispose(view)
                            host.removeView(view)
                        } finally {
                            StrictMode.setThreadPolicy(previousThreadPolicy)
                        }
                    }
                }
            }

            Runtime.getRuntime().gc()
            System.runFinalization()
            InstrumentationRegistry.getInstrumentation().waitForIdleSync()
        } finally {
            StrictMode.setVmPolicy(previousVmPolicy)
        }

        assertTrue(
            violations.joinToString(separator = "\n") { it.stackTraceToString() },
            violations.isEmpty(),
        )
    }

    private fun recordAngularNativeViolation(
        violations: ConcurrentLinkedQueue<Violation>,
        violation: Violation,
    ) {
        if (
            violation.stackTrace.any { frame ->
                frame.className.startsWith("io.github.angularwave.android")
            }
        ) {
            violations += violation
        }
    }
}
