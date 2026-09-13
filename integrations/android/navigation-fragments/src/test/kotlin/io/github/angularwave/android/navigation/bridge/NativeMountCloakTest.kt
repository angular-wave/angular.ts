package io.github.angularwave.android.navigation.bridge

import android.app.Activity
import android.view.View
import android.widget.FrameLayout
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativeMountCloakTest {
    @Test
    fun `mount stays hidden until the first complete frame`() {
        val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
        val container = FrameLayout(activity)
        val view = View(activity)
        var ready = false

        mountCloaked(container, view) { ready = true }

        assertSame(container, view.parent)
        assertEquals(View.INVISIBLE, view.visibility)
        assertFalse(ready)

        view.viewTreeObserver.dispatchOnPreDraw()

        assertEquals(View.VISIBLE, view.visibility)
        assertTrue(ready)
        activity.finish()
    }
}
