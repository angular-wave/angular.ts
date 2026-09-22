package io.github.angularwave.android.navigation.routing

import androidx.core.net.toUri
import io.github.angularwave.android.navigation.activities.AngularNativeActivity
import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration

/** Navigates internal urls through in-app routing. */
class AppNavigationRouteDecisionHandler : Router.RouteDecisionHandler {
    override val name = "app-navigation"

    override fun matches(
        location: String,
        configuration: NavigatorConfiguration,
    ): Boolean = configuration.startLocation.toUri().host == location.toUri().host

    override fun handle(
        location: String,
        configuration: NavigatorConfiguration,
        activity: AngularNativeActivity,
    ): Router.Decision = Router.Decision.NAVIGATE
}
