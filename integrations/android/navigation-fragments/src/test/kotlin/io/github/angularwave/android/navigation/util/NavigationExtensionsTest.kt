package io.github.angularwave.android.navigation.util

import android.app.Activity
import com.google.android.material.R as MaterialR
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NavigationExtensionsTest {
    @Test
    fun `theme colors resolve without treating values as resource identifiers`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        activity.setTheme(MaterialR.style.Theme_Material3_DayNight_NoActionBar)
        val attributes = activity.obtainStyledAttributes(intArrayOf(MaterialR.attr.colorSurface))
        val expected = attributes.getColor(0, -1)
        attributes.recycle()

        assertEquals(expected, activity.colorFromThemeAttr(MaterialR.attr.colorSurface))

        activity.finish()
    }
}
