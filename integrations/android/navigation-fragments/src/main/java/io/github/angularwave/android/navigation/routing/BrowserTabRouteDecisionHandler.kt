package io.github.angularwave.android.navigation.routing

import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.net.toUri
import com.google.android.material.R
import io.github.angularwave.android.navigation.activities.AngularNativeActivity
import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration
import io.github.angularwave.android.navigation.util.colorFromThemeAttr

/**
 * Opens external HTTP/S urls via a browser Custom Tab so the user
 * stays in-app. If the device default browser does not support
 * Custom Tabs, the url will open directly in the default browser.
 *
 * https://developer.chrome.com/docs/android/custom-tabs
 */
class BrowserTabRouteDecisionHandler : Router.RouteDecisionHandler {
    override val name = "browser-tab"

    override fun matches(
        location: String,
        configuration: NavigatorConfiguration
    ): Boolean {
        val locationUri = location.toUri()

        return configuration.startLocation.toUri().host != locationUri.host &&
                (locationUri.scheme?.lowercase() == "https" || locationUri.scheme?.lowercase() == "http")
    }

    override fun handle(
        location: String,
        configuration: NavigatorConfiguration,
        activity: AngularNativeActivity
    ): Router.Decision {
        val color = activity.colorFromThemeAttr(R.attr.colorSurface)
        val colorParams = CustomTabColorSchemeParams.Builder()
            .setToolbarColor(color)
            .setNavigationBarColor(color)
            .build()

        CustomTabsIntent.Builder()
            .setShowTitle(true)
            .setShareState(CustomTabsIntent.SHARE_STATE_ON)
            .setUrlBarHidingEnabled(false)
            .setDefaultColorSchemeParams(colorParams)
            .build()
            .launchUrl(activity, location.toUri())

        return Router.Decision.CANCEL
    }
}
