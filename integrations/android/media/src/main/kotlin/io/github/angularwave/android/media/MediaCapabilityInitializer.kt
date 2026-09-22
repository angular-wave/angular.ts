package io.github.angularwave.android.media

import android.content.Context
import androidx.startup.Initializer
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders

/** Registers Media3 support when its artifact is present in an Android app. */
class MediaCapabilityInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        AndroidNativeProviders.registerCapabilityProvider(MediaCapabilityProvider())
    }

    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
