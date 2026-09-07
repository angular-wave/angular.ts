package io.github.angularwave.android.navigation.transitions

import io.github.angularwave.android.navigation.R
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NativeNavigationTransitionTest {
    @Test
    fun `parses every supported transition`() {
        NativeNavigationTransition.entries.forEach { transition ->
            assertEquals(transition, NativeNavigationTransition.from(transition.value))
            assertEquals(
                transition,
                NativeNavigationTransition.from(" ${transition.value.uppercase()} ")
            )
        }
    }

    @Test
    fun `uses the default transition for missing and unsupported values`() {
        assertEquals(
            NativeNavigationTransition.DEFAULT,
            NativeNavigationTransition.from(null)
        )
        assertEquals(
            NativeNavigationTransition.DEFAULT,
            NativeNavigationTransition.from("zoom")
        )
        assertNull(NativeNavigationTransition.DEFAULT.navigationOptions())
    }

    @Test
    fun `maps transitions to navigation animations`() {
        assertAnimations(NativeNavigationTransition.NONE, 0, 0, 0, 0)
        assertAnimations(
            NativeNavigationTransition.SLIDE,
            R.anim.enter_slide_in_right,
            R.anim.exit_slide_out_left,
            R.anim.enter_slide_in_left,
            R.anim.exit_slide_out_right
        )
        assertAnimations(
            NativeNavigationTransition.FADE,
            android.R.anim.fade_in,
            android.R.anim.fade_out,
            android.R.anim.fade_in,
            android.R.anim.fade_out
        )
        assertAnimations(
            NativeNavigationTransition.COVER,
            R.anim.enter_slide_in_bottom,
            0,
            0,
            R.anim.exit_slide_out_bottom
        )
        assertAnimations(
            NativeNavigationTransition.DIVE,
            R.anim.enter_dive,
            R.anim.exit_dive,
            R.anim.pop_enter_dive,
            R.anim.pop_exit_dive
        )
        assertAnimations(
            NativeNavigationTransition.FLIP,
            R.anim.enter_flip,
            R.anim.exit_flip,
            R.anim.pop_enter_flip,
            R.anim.pop_exit_flip
        )
    }

    private fun assertAnimations(
        transition: NativeNavigationTransition,
        enter: Int,
        exit: Int,
        popEnter: Int,
        popExit: Int
    ) {
        val options = checkNotNull(transition.navigationOptions())
        assertEquals(enter, options.enterAnim)
        assertEquals(exit, options.exitAnim)
        assertEquals(popEnter, options.popEnterAnim)
        assertEquals(popExit, options.popExitAnim)
    }
}
