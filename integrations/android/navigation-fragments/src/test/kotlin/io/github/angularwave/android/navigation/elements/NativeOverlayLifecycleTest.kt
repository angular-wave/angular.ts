package io.github.angularwave.android.navigation.elements

import android.widget.Button
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentActivity
import java.lang.ref.WeakReference
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativeOverlayLifecycleTest {
    @After fun tearDown() = NativeOverlayCoordinator.clear()

    @Test
    fun `dismiss closes once emits once and returns focus`() {
        val (activity, owner) = owner()
        val anchor = Button(activity)
        activity.setContentView(anchor)
        var closes = 0
        var dismissals = 0
        lateinit var platformDismissed: (org.json.JSONObject?) -> Unit
        val lifecycle = NativeOverlayLifecycle(owner, anchor) { dismissals++ }

        lifecycle.show { dismissed ->
            platformDismissed = dismissed
            {
                closes++
                platformDismissed(null)
            }
        }
        lifecycle.dismiss()
        lifecycle.dismiss()

        assertThat(closes).isEqualTo(1)
        assertThat(dismissals).isEqualTo(1)
        assertThat(lifecycle.isShowing).isFalse()
        assertThat(anchor.hasFocus()).isTrue()
        activity.finish()
    }

    @Test
    fun `replacement dismisses the old overlay and disposal suppresses events`() {
        val (activity, owner) = owner()
        var firstEvents = 0
        var secondEvents = 0
        lateinit var firstDismissed: (org.json.JSONObject?) -> Unit
        val first = NativeOverlayLifecycle(owner, Button(activity)) { firstEvents++ }
        val second = NativeOverlayLifecycle(owner, Button(activity)) { secondEvents++ }

        first.show { dismissed ->
            firstDismissed = dismissed
            { firstDismissed(null) }
        }
        second.show { dismissed -> { dismissed(null) } }
        second.dispose()

        assertThat(firstEvents).isEqualTo(1)
        assertThat(secondEvents).isZero()
        assertThat(first.isShowing).isFalse()
        assertThat(second.isShowing).isFalse()
        activity.finish()
    }

    @Test
    fun `failed creation releases ownership`() {
        val (activity, owner) = owner()
        val failed = NativeOverlayLifecycle(owner, Button(activity)) {}
        var replacementClosed = 0

        org.junit.Assert.assertThrows(IllegalStateException::class.java) {
            failed.show { error("broken overlay") }
        }
        val replacement = NativeOverlayLifecycle(owner, Button(activity)) {}
        replacement.show { dismissed ->
            {
                replacementClosed++
                dismissed(null)
            }
        }
        replacement.dismiss()

        assertThat(replacementClosed).isEqualTo(1)
        activity.finish()
    }

    @Test
    fun `disposal clears every destination and platform reference`() {
        val (activity, owner) = owner()
        val anchor = Button(activity)
        val lifecycle = NativeOverlayLifecycle(owner, anchor) {}
        lifecycle.show { {} }

        lifecycle.dispose()

        assertThat(reference(lifecycle, "owner").get()).isNull()
        assertThat(reference(lifecycle, "anchor").get()).isNull()
        assertThat(field(lifecycle, "closeOverlay")).isNull()
        assertThat(field(lifecycle, "onDismiss")).isNull()
        activity.finish()
    }

    private fun reference(
        lifecycle: NativeOverlayLifecycle,
        name: String,
    ): WeakReference<*> = field(lifecycle, name) as WeakReference<*>

    private fun field(
        lifecycle: NativeOverlayLifecycle,
        name: String,
    ): Any? =
        NativeOverlayLifecycle::class.java.getDeclaredField(name).let {
            it.isAccessible = true
            it.get(lifecycle)
        }

    private fun owner(): Pair<FragmentActivity, Fragment> {
        val controller = Robolectric.buildActivity(FragmentActivity::class.java).setup()
        val activity = controller.get()
        val fragment = Fragment()
        activity.supportFragmentManager.beginTransaction().add(fragment, "owner").commitNow()
        return activity to fragment
    }
}
