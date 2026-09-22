package io.github.angularwave.android.navigation.elements

import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric.buildActivity
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativeImageLayoutTest {
    @Test
    fun `image supports explicit native layout dimensions`() {
        val activity = themedActivity()
        val host = FrameLayout(activity)
        val image =
            AndroidNativeElements.registry.create(
                "image",
                NativeElementContext(activity, host, activity, activity, events = { _, _ -> }),
                JSONObjectProperties(
                    JSONObject().put("src", "").put("width", 240).put("height", 180)
                ),
            )

        assertEquals(240, image.layoutParams.width)
        assertEquals(180, image.layoutParams.height)
        AndroidNativeElements.registry.dispose(image)
    }

    @Test
    fun `image exposes native click and long click events`() {
        val activity = themedActivity()
        val host = FrameLayout(activity)
        val events = mutableListOf<String>()
        val image =
            AndroidNativeElements.registry.create(
                "image",
                NativeElementContext(
                    activity,
                    host,
                    activity,
                    activity,
                    events = { event, _ -> events += event },
                ),
                JSONObjectProperties(JSONObject().put("src", "")),
            )

        assertTrue(image.performClick())
        assertTrue(image.performLongClick())
        assertEquals(listOf("click", "longClick"), events)
        AndroidNativeElements.registry.dispose(image)
    }

    private fun themedActivity(): AppCompatActivity {
        val controller = buildActivity(AppCompatActivity::class.java)
        controller.get().setTheme(com.google.android.material.R.style.Theme_Material3_DayNight)
        return controller.setup().get()
    }
}
