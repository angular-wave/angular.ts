package io.github.angularwave.android.browser

import android.content.Context
import androidx.startup.Initializer
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders

/** Registers Custom Tabs routing when its artifact is present in an Android app. */
class BrowserRouteDecisionHandlerInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        AndroidNativeProviders.registerRouteDecisionHandlerProvider(
            BrowserRouteDecisionHandlerProvider()
        )
    }

    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
