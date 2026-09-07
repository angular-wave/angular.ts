package io.github.angularwave.android.navigation.transitions

import androidx.annotation.AnimRes
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

    fun navigationOptions(): NavOptions? = when (this) {
        DEFAULT -> null
        NONE -> options(0, 0, 0, 0)
        SLIDE -> options(
            R.anim.enter_slide_in_right,
            R.anim.exit_slide_out_left,
            R.anim.enter_slide_in_left,
            R.anim.exit_slide_out_right
        )
        FADE -> options(
            android.R.anim.fade_in,
            android.R.anim.fade_out,
            android.R.anim.fade_in,
            android.R.anim.fade_out
        )
        COVER -> options(
            R.anim.enter_slide_in_bottom,
            0,
            0,
            R.anim.exit_slide_out_bottom
        )
        DIVE -> options(
            R.anim.enter_dive,
            R.anim.exit_dive,
            R.anim.pop_enter_dive,
            R.anim.pop_exit_dive
        )
        FLIP -> options(
            R.anim.enter_flip,
            R.anim.exit_flip,
            R.anim.pop_enter_flip,
            R.anim.pop_exit_flip
        )
    }

    companion object {
        fun from(value: String?): NativeNavigationTransition {
            val normalized = value?.trim()?.lowercase()
            return entries.firstOrNull { it.value == normalized } ?: DEFAULT
        }

        private fun options(
            @AnimRes enter: Int,
            @AnimRes exit: Int,
            @AnimRes popEnter: Int,
            @AnimRes popExit: Int
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
