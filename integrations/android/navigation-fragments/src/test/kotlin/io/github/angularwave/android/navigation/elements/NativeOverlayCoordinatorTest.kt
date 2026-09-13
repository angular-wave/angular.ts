package io.github.angularwave.android.navigation.elements

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import org.assertj.core.api.Assertions.assertThat
import org.junit.After
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class NativeOverlayCoordinatorTest {
    @After fun tearDown() = NativeOverlayCoordinator.clear()

    @Test
    fun `claim dismisses the previous overlay for the destination`() {
        val owner = Owner()
        var firstDismissals = 0
        val first = NativeOverlayHandle { firstDismissals++ }
        val second = NativeOverlayHandle {}

        NativeOverlayCoordinator.claim(owner, first)
        NativeOverlayCoordinator.claim(owner, second)

        assertThat(firstDismissals).isEqualTo(1)
    }

    @Test
    fun `release cannot remove a newer overlay`() {
        val owner = Owner()
        var secondDismissals = 0
        val first = NativeOverlayHandle {}
        val second = NativeOverlayHandle { secondDismissals++ }

        NativeOverlayCoordinator.claim(owner, first)
        NativeOverlayCoordinator.claim(owner, second)
        NativeOverlayCoordinator.release(owner, first)
        NativeOverlayCoordinator.claim(owner, NativeOverlayHandle {})

        assertThat(secondDismissals).isEqualTo(1)
    }

    private class Owner : SavedStateRegistryOwner, LifecycleOwner {
        private val lifecycleRegistry = LifecycleRegistry(this)
        override val lifecycle: Lifecycle = lifecycleRegistry
        private val controller = SavedStateRegistryController.create(this)

        init {
            controller.performAttach()
            controller.performRestore(null)
        }

        override val savedStateRegistry: SavedStateRegistry = controller.savedStateRegistry
    }
}
