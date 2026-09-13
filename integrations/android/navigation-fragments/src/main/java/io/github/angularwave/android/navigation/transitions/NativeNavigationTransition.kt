package io.github.angularwave.android.navigation.transitions

import androidx.annotation.AnimatorRes
import androidx.navigation.NavOptions
import androidx.navigation.navOptions
import io.github.angularwave.android.navigation.R

enum class NativeNavigationTransition(val value: String) {
    DEFAULT("default"),
    NONE("none"),
    SLIDE("slide"),
    FADE("fade"),
    COVER("cover"),
    DIVE("dive"),
    FLIP("flip");

    fun navigationOptions(reduceMotion: Boolean = false): NavOptions? {
        if (reduceMotion && this != DEFAULT) return NONE.navigationOptions()
        return when (this) {
            DEFAULT -> {
                null
            }

            NONE -> {
                options(0, 0, 0, 0)
            }

            SLIDE -> {
                options(
                    R.animator.enter_slide_in_right,
                    R.animator.exit_slide_out_left,
                    R.animator.enter_slide_in_left,
                    R.animator.exit_slide_out_right,
                )
            }

            FADE -> {
                options(
                    R.animator.fade_in,
                    R.animator.fade_out,
                    R.animator.fade_in,
                    R.animator.fade_out,
                )
            }

            COVER -> {
                options(
                    R.animator.enter_slide_in_bottom,
                    0,
                    0,
                    R.animator.exit_slide_out_bottom,
                )
            }

            DIVE -> {
                options(
                    R.animator.enter_dive,
                    R.animator.exit_dive,
                    R.animator.pop_enter_dive,
                    R.animator.pop_exit_dive,
                )
            }

            FLIP -> {
                options(
                    R.animator.enter_flip,
                    R.animator.exit_flip,
                    R.animator.pop_enter_flip,
                    R.animator.pop_exit_flip,
                )
            }
        }
    }

    companion object {
        fun from(value: String?): NativeNavigationTransition {
            val normalized = value?.trim()?.lowercase()
            return entries.firstOrNull { it.value == normalized } ?: DEFAULT
        }

        internal fun options(
            @AnimatorRes enter: Int,
            @AnimatorRes exit: Int,
            @AnimatorRes popEnter: Int,
            @AnimatorRes popExit: Int,
        ): NavOptions = navOptions {
            anim {
                this.enter = enter
                this.exit = exit
                this.popEnter = popEnter
                this.popExit = popExit
            }
        }
    }
}
