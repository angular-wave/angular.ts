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
                NativeNavigationTransition.from(" ${transition.value.uppercase()} "),
            )
        }
    }

    @Test
    fun `uses the default transition for missing and unsupported values`() {
        assertEquals(
            NativeNavigationTransition.DEFAULT,
            NativeNavigationTransition.from(null),
        )
        assertEquals(
            NativeNavigationTransition.DEFAULT,
            NativeNavigationTransition.from("zoom"),
        )
        assertNull(NativeNavigationTransition.DEFAULT.navigationOptions())
    }

    @Test
    fun `maps transitions to navigation animations`() {
        assertAnimations(NativeNavigationTransition.NONE, 0, 0, 0, 0)
        assertAnimations(
            NativeNavigationTransition.SLIDE,
            R.animator.enter_slide_in_right,
            R.animator.exit_slide_out_left,
            R.animator.enter_slide_in_left,
            R.animator.exit_slide_out_right,
        )
        assertAnimations(
            NativeNavigationTransition.FADE,
            R.animator.fade_in,
            R.animator.fade_out,
            R.animator.fade_in,
            R.animator.fade_out,
        )
        assertAnimations(
            NativeNavigationTransition.COVER,
            R.animator.enter_slide_in_bottom,
            0,
            0,
            R.animator.exit_slide_out_bottom,
        )
        assertAnimations(
            NativeNavigationTransition.DIVE,
            R.animator.enter_dive,
            R.animator.exit_dive,
            R.animator.pop_enter_dive,
            R.animator.pop_exit_dive,
        )
        assertAnimations(
            NativeNavigationTransition.FLIP,
            R.animator.enter_flip,
            R.animator.exit_flip,
            R.animator.pop_enter_flip,
            R.animator.pop_exit_flip,
        )
    }

    @Test
    fun `reduced motion disables every explicit transition`() {
        NativeNavigationTransition.entries
            .filterNot { it == NativeNavigationTransition.DEFAULT }
            .forEach { transition ->
                val options = checkNotNull(transition.navigationOptions(reduceMotion = true))
                assertEquals(0, options.enterAnim)
                assertEquals(0, options.exitAnim)
                assertEquals(0, options.popEnterAnim)
                assertEquals(0, options.popExitAnim)
            }
        assertNull(NativeNavigationTransition.DEFAULT.navigationOptions(reduceMotion = true))
    }

    private fun assertAnimations(
        transition: NativeNavigationTransition,
        enter: Int,
        exit: Int,
        popEnter: Int,
        popExit: Int,
    ) {
        val options = checkNotNull(transition.navigationOptions())
        assertEquals(enter, options.enterAnim)
        assertEquals(exit, options.exitAnim)
        assertEquals(popEnter, options.popEnterAnim)
        assertEquals(popExit, options.popExitAnim)
    }
}
