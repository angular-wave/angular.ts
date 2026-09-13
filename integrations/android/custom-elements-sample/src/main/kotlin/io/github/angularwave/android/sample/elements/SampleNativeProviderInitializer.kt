package io.github.angularwave.android.sample.elements

import android.content.Context
import androidx.startup.Initializer
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders

/** Registers both sample extensions before the app creates its first destination. */
class SampleNativeProviderInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        AndroidNativeProviders.registerElementProvider(TaskCardProvider())
        AndroidNativeProviders.registerCapabilityProvider(DeviceInfoCapabilityProvider())
    }

    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
