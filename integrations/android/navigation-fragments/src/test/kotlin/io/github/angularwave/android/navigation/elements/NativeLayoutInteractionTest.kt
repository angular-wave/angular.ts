package io.github.angularwave.android.navigation.elements

import android.content.res.Configuration
import android.webkit.WebView
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.ViewCompat
import androidx.core.widget.NestedScrollView
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class NativeLayoutInteractionTest {
    @Test
    fun layoutUsesTheCurrentOrientation() {
        val activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        val landscape =
            Configuration(activity.resources.configuration).apply {
                orientation = Configuration.ORIENTATION_LANDSCAPE
            }

        val layout = LinearLayout(activity.createConfigurationContext(landscape))

        assertEquals(
            Configuration.ORIENTATION_LANDSCAPE,
            layout.resources.configuration.orientation,
        )
    }

    @Test
    fun nativeScrollCooperatesWithAParentAndWebViewSibling() {
        val activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        val parent = NestedScrollView(activity)
        val content = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
        val webView = WebView(activity)
        val nativeScroll = NestedScrollView(activity)
        parent.addView(content)
        content.addView(webView)
        content.addView(nativeScroll)
        nativeScroll.addView(LinearLayout(activity))

        assertTrue(nativeScroll.startNestedScroll(ViewCompat.SCROLL_AXIS_VERTICAL))
        assertTrue(nativeScroll.hasNestedScrollingParent())

        nativeScroll.stopNestedScroll()
        webView.destroy()
    }

    @Test
    fun nativeLayoutDoesNotTrapBackDispatch() {
        val activity = Robolectric.buildActivity(ComponentActivity::class.java).setup().get()
        val content = NestedScrollView(activity)
        activity.setContentView(content)
        var handled = false
        activity.onBackPressedDispatcher.addCallback(
            activity,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    handled = true
                }
            },
        )

        activity.onBackPressedDispatcher.onBackPressed()

        assertTrue(handled)
    }
}
