package io.github.angularwave.android.navigation.elements

import android.view.View
import android.view.accessibility.AccessibilityEvent
import android.widget.FrameLayout
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.google.android.material.R as MaterialR
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeOverlayAccessibilityInstrumentedTest {
    @get:Rule val activityRule = ActivityScenarioRule(NativeElementTestActivity::class.java)

    @Test
    fun dialogMovesAccessibilityIntoOverlayAndReturnsFocusToTrigger() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val focusEvents = mutableListOf<Int>()
        lateinit var trigger: View

        activityRule.scenario.onActivity { activity ->
            activity.setTheme(MaterialR.style.Theme_Material3_DayNight_NoActionBar)
            val host = FrameLayout(activity)
            activity.setContentView(host)
            trigger =
                AndroidNativeElements.registry.create(
                    NativeElementCatalog.Wire.DIALOG,
                    NativeElementContext(
                        activity,
                        host,
                        activity,
                        activity,
                        events = { _, _ -> },
                    ),
                    JSONObjectProperties(
                        JSONObject()
                            .put(NativeElementCatalog.Wire.TITLE, "Delete item?")
                            .put(NativeElementCatalog.Wire.MESSAGE, "This cannot be undone")
                    ),
                )
            host.addView(trigger)
            trigger.accessibilityDelegate =
                object : View.AccessibilityDelegate() {
                    override fun sendAccessibilityEvent(
                        host: View,
                        eventType: Int,
                    ) {
                        focusEvents += eventType
                        super.sendAccessibilityEvent(host, eventType)
                    }
                }
            trigger.isFocusableInTouchMode = true
            assertTrue(trigger.requestFocus())
        }

        val opened =
            instrumentation.uiAutomation.executeAndWaitForEvent(
                { instrumentation.runOnMainSync { trigger.performClick() } },
                { event -> event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED },
                ACCESSIBILITY_TIMEOUT_MS,
            )
        assertTrue(opened.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED)

        activityRule.scenario.onActivity {
            AndroidNativeElements.registry.invoke(
                trigger,
                NativeElementCatalog.Wire.DISMISS,
                JSONObjectProperties(JSONObject()),
            )
            assertTrue(trigger.hasFocus())
            assertTrue(focusEvents.contains(AccessibilityEvent.TYPE_VIEW_FOCUSED))
            AndroidNativeElements.registry.dispose(trigger)
        }
    }

    private companion object {
        const val ACCESSIBILITY_TIMEOUT_MS = 3_000L
    }
}
