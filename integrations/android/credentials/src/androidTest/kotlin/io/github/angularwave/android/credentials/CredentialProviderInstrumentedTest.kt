package io.github.angularwave.android.credentials

import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CredentialProviderInstrumentedTest {
    @Test
    fun startupRegistersProviderOnAndroid() {
        val providers = AndroidNativeProviders.capabilityProviders()

        assertTrue(providers.any { it is CredentialCapabilityProvider })
    }
}
