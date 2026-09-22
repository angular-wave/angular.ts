package io.github.angularwave.android.navigation.destinations

import androidx.navigation.NavOptions
import androidx.navigation.navOptions
import io.github.angularwave.android.core.ng.config.PathConfigurationProperties
import io.github.angularwave.android.core.ng.config.animated
import io.github.angularwave.android.core.ng.config.context
import io.github.angularwave.android.core.ng.config.presentation
import io.github.angularwave.android.core.ng.nav.Presentation
import io.github.angularwave.android.core.ng.nav.PresentationContext
import io.github.angularwave.android.core.ng.visit.VisitAction
import io.github.angularwave.android.navigation.R

class AngularNativeDestinationAnimations private constructor() {
    companion object {
        fun defaultNavOptions(
            currentPathProperties: PathConfigurationProperties,
            newPathProperties: PathConfigurationProperties,
            action: VisitAction,
        ): NavOptions {
            val navigatingToModalContext =
                currentPathProperties.context == PresentationContext.DEFAULT &&
                    newPathProperties.context == PresentationContext.MODAL

            val navigatingWithinModalContext =
                currentPathProperties.context == PresentationContext.MODAL &&
                    newPathProperties.context == PresentationContext.MODAL

            val dismissingModalContext =
                currentPathProperties.context == PresentationContext.MODAL &&
                    newPathProperties.context == PresentationContext.DEFAULT

            val animate =
                shouldAnimate(
                    navigatingToModalContext = navigatingToModalContext,
                    dismissingModalContext = dismissingModalContext,
                    newPathProperties = newPathProperties,
                    action = action,
                )

            val clearAll = newPathProperties.presentation == Presentation.CLEAR_ALL

            return if (
                navigatingToModalContext || navigatingWithinModalContext || dismissingModalContext
            ) {
                navOptions {
                    anim {
                        enter = if (animate) R.animator.enter_slide_in_bottom else 0
                        exit = R.animator.exit_slide_out_bottom
                        popEnter = R.animator.enter_slide_in_bottom
                        popExit = R.animator.exit_slide_out_bottom
                    }
                }
            } else {
                if (clearAll) {
                    navOptions {
                        anim {
                            enter = R.animator.exit_slide_out_left
                            exit = R.animator.exit_slide_out_right
                            popEnter = R.animator.enter_slide_in_left
                            popExit = R.animator.enter_slide_in_right
                        }
                    }
                } else {
                    navOptions {
                        anim {
                            enter = if (animate) R.animator.enter_slide_in_right else 0
                            exit = R.animator.exit_slide_out_left
                            popEnter = R.animator.enter_slide_in_left
                            popExit = R.animator.exit_slide_out_right
                        }
                    }
                }
            }
        }

        private fun shouldAnimate(
            navigatingToModalContext: Boolean,
            dismissingModalContext: Boolean,
            newPathProperties: PathConfigurationProperties,
            action: VisitAction,
        ): Boolean {
            if (!newPathProperties.animated) {
                return false
            }

            if (navigatingToModalContext || dismissingModalContext) {
                return true
            }

            return action != VisitAction.REPLACE &&
                newPathProperties.presentation != Presentation.REPLACE &&
                newPathProperties.presentation != Presentation.REPLACE_ROOT
        }
    }
}
