package io.github.angularwave.android.navigation.bridge

import android.os.Looper
import androidx.fragment.app.FragmentActivity
import androidx.window.layout.WindowLayoutInfo
import kotlinx.coroutines.flow.MutableSharedFlow
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class AndroidWindowStateTest {
    @Test
    fun `classifies every adaptive width and height boundary`() {
        assertEquals("compact", AndroidWindowSnapshot.widthClass(599f))
        assertEquals("medium", AndroidWindowSnapshot.widthClass(600f))
        assertEquals("expanded", AndroidWindowSnapshot.widthClass(840f))
        assertEquals("large", AndroidWindowSnapshot.widthClass(1200f))
        assertEquals("extra-large", AndroidWindowSnapshot.widthClass(1600f))
        assertEquals("compact", AndroidWindowSnapshot.heightClass(479f))
        assertEquals("medium", AndroidWindowSnapshot.heightClass(480f))
        assertEquals("expanded", AndroidWindowSnapshot.heightClass(900f))
    }

    @Test
    fun `reports current metrics safe area and display features`() {
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()

        val status = AndroidWindowSnapshot.create(activity, null)

        assertTrue(status.getDouble("width") > 0)
        assertTrue(status.getDouble("height") > 0)
        assertTrue(status.getString("widthClass") in WidthClasses)
        assertTrue(status.getString("heightClass") in HeightClasses)
        assertTrue(status.getString("orientation") in setOf("portrait", "landscape"))
        assertEquals(0, status.getJSONArray("displayFeatures").length())
        assertTrue(status.getJSONObject("safeArea").has("bottom"))
        activity.finish()
    }

    @Test
    fun `watch emits layout changes and unwatch releases collection`() {
        val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
        val layouts = MutableSharedFlow<WindowLayoutInfo>(extraBufferCapacity = 1)
        val layoutInfo = mock(WindowLayoutInfo::class.java)
        `when`(layoutInfo.displayFeatures).thenReturn(emptyList())
        var emissions = 0
        val state = AndroidWindowState(activity, { emissions++ }, layouts)

        state.watch()
        layouts.tryEmit(layoutInfo)
        shadowOf(Looper.getMainLooper()).idle()
        assertEquals(1, emissions)

        state.unwatch()
        layouts.tryEmit(layoutInfo)
        shadowOf(Looper.getMainLooper()).idle()
        assertEquals(1, emissions)
        state.close()
        activity.finish()
    }

    private companion object {
        val WidthClasses = setOf("compact", "medium", "expanded", "large", "extra-large")
        val HeightClasses = setOf("compact", "medium", "expanded")
    }
}
