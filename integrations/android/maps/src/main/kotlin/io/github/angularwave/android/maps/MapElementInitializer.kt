package io.github.angularwave.android.maps

import android.content.Context
import androidx.startup.Initializer
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders

/** Registers the map element when its artifact is present in an Android app. */
class MapElementInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        AndroidNativeProviders.registerElementProvider(MapElementProvider())
    }

    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
