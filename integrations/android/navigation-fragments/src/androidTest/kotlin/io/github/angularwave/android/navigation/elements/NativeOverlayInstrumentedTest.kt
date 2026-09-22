package io.github.angularwave.android.navigation.elements

import android.view.View
import android.widget.FrameLayout
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeOverlayInstrumentedTest {
    @Test
    fun androidBackCancelsDialogAndReturnsFocus() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(instrumentation)
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            val events = mutableListOf<String>()
            val dismissed = CountDownLatch(1)
            lateinit var trigger: View
            scenario.onActivity { activity ->
                val host = FrameLayout(activity)
                activity.setContentView(host)
                trigger =
                    create(activity, host, NativeElementCatalog.Wire.DIALOG, events) { event ->
                        if (event == NativeElementCatalog.Wire.DISMISS) dismissed.countDown()
                    }
                host.addView(trigger)
                trigger.isFocusableInTouchMode = true
                trigger.requestFocus()
                trigger.performClick()
            }
            instrumentation.waitForIdleSync()
            device.pressBack()
            assertTrue(
                "dialog did not dismiss after Android back",
                dismissed.await(5, TimeUnit.SECONDS),
            )

            scenario.onActivity {
                assertEquals(listOf("show", "cancel", "dismiss"), events)
                assertTrue(trigger.hasFocus())
                AndroidNativeElements.registry.dispose(trigger)
            }
        }
    }

    @Test
    fun aNewOverlayDismissesTheCurrentDestinationOverlay() {
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            scenario.onActivity { activity ->
                val host = FrameLayout(activity)
                activity.setContentView(host)
                val dialogEvents = mutableListOf<String>()
                val sheetEvents = mutableListOf<String>()
                val dialog = create(activity, host, NativeElementCatalog.Wire.DIALOG, dialogEvents)
                val sheet =
                    create(activity, host, NativeElementCatalog.Wire.BOTTOM_SHEET, sheetEvents)
                host.addView(dialog)
                host.addView(sheet)

                dialog.performClick()
                sheet.performClick()

                assertEquals(listOf("show", "dismiss"), dialogEvents)
                assertEquals(listOf("show"), sheetEvents)
                AndroidNativeElements.registry.dispose(dialog)
                AndroidNativeElements.registry.dispose(sheet)
            }
        }
    }

    @Test
    fun outsideTapCancelsDialogAndReturnsFocus() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(instrumentation)
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            val events = mutableListOf<String>()
            val dismissed = CountDownLatch(1)
            lateinit var trigger: View
            var width = 0
            var height = 0
            scenario.onActivity { activity ->
                val host = FrameLayout(activity)
                activity.setContentView(host)
                width = activity.resources.displayMetrics.widthPixels
                height = activity.resources.displayMetrics.heightPixels
                trigger =
                    create(activity, host, NativeElementCatalog.Wire.DIALOG, events) { event ->
                        if (event == NativeElementCatalog.Wire.DISMISS) dismissed.countDown()
                    }
                host.addView(trigger)
                trigger.isFocusableInTouchMode = true
                trigger.requestFocus()
                trigger.performClick()
            }
            instrumentation.waitForIdleSync()
            tap(device, width / 2f, height * 0.15f)
            assertTrue("outside tap did not dismiss dialog", dismissed.await(5, TimeUnit.SECONDS))

            scenario.onActivity {
                assertEquals(listOf("show", "cancel", "dismiss"), events)
                assertTrue(trigger.hasFocus())
                AndroidNativeElements.registry.dispose(trigger)
            }
        }
    }

    @Test
    fun downwardSwipeCancelsBottomSheetAndReturnsFocus() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val device = UiDevice.getInstance(instrumentation)
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            val events = mutableListOf<String>()
            val dismissed = CountDownLatch(1)
            lateinit var trigger: View
            var width = 0
            var height = 0
            scenario.onActivity { activity ->
                val host = FrameLayout(activity)
                activity.setContentView(host)
                width = activity.resources.displayMetrics.widthPixels
                height = activity.resources.displayMetrics.heightPixels
                trigger =
                    create(activity, host, NativeElementCatalog.Wire.BOTTOM_SHEET, events) { event
                        ->
                        if (event == NativeElementCatalog.Wire.DISMISS) dismissed.countDown()
                    }
                host.addView(trigger)
                trigger.isFocusableInTouchMode = true
                trigger.requestFocus()
                trigger.performClick()
            }
            instrumentation.waitForIdleSync()
            swipe(
                device,
                width / 2f,
                height * 0.86f,
                height - 1f,
            )
            assertTrue(
                "downward swipe did not dismiss bottom sheet",
                dismissed.await(5, TimeUnit.SECONDS),
            )

            scenario.onActivity {
                assertEquals(listOf("show", "cancel", "dismiss"), events)
                assertTrue(trigger.hasFocus())
                AndroidNativeElements.registry.dispose(trigger)
            }
        }
    }

    @Test
    fun tooltipSupportsProgrammaticShowAndDismiss() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        ActivityScenario.launch(NativeElementTestActivity::class.java).use { scenario ->
            val events = mutableListOf<String>()
            lateinit var tooltip: View
            scenario.onActivity { activity ->
                val host = FrameLayout(activity)
                activity.setContentView(host)
                tooltip = create(activity, host, NativeElementCatalog.Wire.TOOLTIP, events)
                host.addView(tooltip)
            }
            instrumentation.waitForIdleSync()
            scenario.onActivity {
                invoke(tooltip, NativeElementCatalog.Wire.SHOW)
                invoke(tooltip, NativeElementCatalog.Wire.DISMISS)
                assertEquals(listOf("show", "dismiss"), events)
                assertTrue(tooltip.hasFocus())
                AndroidNativeElements.registry.dispose(tooltip)
            }
        }
    }

    private fun create(
        activity: NativeElementTestActivity,
        host: FrameLayout,
        name: String,
        events: MutableList<String>,
        onEvent: (String) -> Unit = {},
    ): View {
        val values =
            when (name) {
                NativeElementCatalog.Wire.DIALOG,
                NativeElementCatalog.Wire.BOTTOM_SHEET ->
                    JSONObject()
                        .put(NativeElementCatalog.Wire.TITLE, "Confirm")
                        .put(NativeElementCatalog.Wire.MESSAGE, "Continue?")
                NativeElementCatalog.Wire.TOOLTIP ->
                    JSONObject()
                        .put(NativeElementCatalog.Wire.LABEL, "Help")
                        .put(NativeElementCatalog.Wire.MESSAGE, "More information")
                else -> JSONObject().put(NativeElementCatalog.Wire.ITEMS, JSONArray())
            }
        return AndroidNativeElements.registry.create(
            name,
            NativeElementContext(
                activity,
                host,
                activity,
                activity,
                events = { event, _ ->
                    events += event
                    onEvent(event)
                },
            ),
            JSONObjectProperties(values),
        )
    }

    private fun invoke(
        view: View,
        method: String,
    ) {
        AndroidNativeElements.registry.invoke(
            view,
            method,
            JSONObjectProperties(JSONObject()),
        )
    }

    private fun tap(
        device: UiDevice,
        x: Float,
        y: Float,
    ) {
        assertTrue(device.click(x.roundToInt(), y.roundToInt()))
    }

    private fun swipe(
        device: UiDevice,
        x: Float,
        startY: Float,
        endY: Float,
    ) {
        assertTrue(
            device.swipe(
                x.roundToInt(),
                startY.roundToInt(),
                x.roundToInt(),
                endY.roundToInt(),
                SWIPE_STEPS,
            )
        )
    }

    private companion object {
        const val SWIPE_STEPS = 16
    }
}
