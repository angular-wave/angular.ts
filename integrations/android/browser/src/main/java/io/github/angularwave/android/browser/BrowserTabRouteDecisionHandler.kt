package io.github.angularwave.android.browser

import android.util.TypedValue
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri
import com.google.android.material.R
import io.github.angularwave.android.navigation.activities.AngularNativeActivity
import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration
import io.github.angularwave.android.navigation.routing.RegisterRouteDecisionHandlerProvider
import io.github.angularwave.android.navigation.routing.RouteDecisionHandlerProvider
import io.github.angularwave.android.navigation.routing.Router

/** Opens external HTTP and HTTPS locations in an Android Custom Tab. */
class BrowserTabRouteDecisionHandler : Router.RouteDecisionHandler {
    override val name = "browser-tab"

    override fun matches(
        location: String,
        configuration: NavigatorConfiguration,
    ): Boolean {
        val locationUri = location.toUri()
        return configuration.startLocation.toUri().host != locationUri.host &&
            locationUri.scheme?.lowercase() in setOf("https", "http")
    }

    override fun handle(
        location: String,
        configuration: NavigatorConfiguration,
        activity: AngularNativeActivity,
    ): Router.Decision {
        val color =
            TypedValue()
                .also {
                    activity.theme.resolveAttribute(R.attr.colorSurface, it, true)
                }
                .data
        val colors =
            CustomTabColorSchemeParams.Builder()
                .setToolbarColor(color)
                .setNavigationBarColor(color)
                .build()
        CustomTabsIntent.Builder()
            .setShowTitle(true)
            .setShareState(CustomTabsIntent.SHARE_STATE_ON)
            .setUrlBarHidingEnabled(false)
            .setDefaultColorSchemeParams(colors)
            .build()
            .launchUrl(activity, location.toUri())
        return Router.Decision.CANCEL
    }
}

@RegisterRouteDecisionHandlerProvider
class BrowserRouteDecisionHandlerProvider : RouteDecisionHandlerProvider {
    override fun handlers() = listOf(BrowserTabRouteDecisionHandler())
}
