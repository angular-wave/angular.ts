package io.github.angularwave.android.credentials

import android.content.Context
import androidx.startup.Initializer
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders

/** Registers the credential capability when its artifact is present in an Android app. */
class CredentialCapabilityInitializer : Initializer<Unit> {
    override fun create(context: Context) {
        AndroidNativeProviders.registerCapabilityProvider(CredentialCapabilityProvider())
    }

    override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
