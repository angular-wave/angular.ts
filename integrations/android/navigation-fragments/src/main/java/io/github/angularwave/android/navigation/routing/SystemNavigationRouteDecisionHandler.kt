package io.github.angularwave.android.navigation.routing

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.core.net.toUri
import io.github.angularwave.android.navigation.activities.AngularNativeActivity
import io.github.angularwave.android.navigation.logging.logError
import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration

/** Opens external urls via a new Activity intent. Non-HTTP/S schemes are supported. */
class SystemNavigationRouteDecisionHandler : Router.RouteDecisionHandler {
    override val name = "system-navigation"

    override fun matches(
        location: String,
        configuration: NavigatorConfiguration,
    ): Boolean = configuration.startLocation.toUri().host != location.toUri().host

    override fun handle(
        location: String,
        configuration: NavigatorConfiguration,
        activity: AngularNativeActivity,
    ): Router.Decision {
        val intent = Intent(Intent.ACTION_VIEW, location.toUri())

        try {
            activity.startActivity(intent)
        } catch (e: ActivityNotFoundException) {
            logError("SystemNavigationRouteDecisionHandler", e)
        }

        return Router.Decision.CANCEL
    }
}
