package io.github.angularwave.android.browser

import android.content.Context
import androidx.startup.AppInitializer
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class BrowserProviderInstrumentedTest {
    @Test
    fun initializerRegistersProviderOnAndroid() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        AppInitializer.getInstance(context)
            .initializeComponent(BrowserRouteDecisionHandlerInitializer::class.java)
        val providers = AndroidNativeProviders.routeDecisionHandlerProviders()

        assertTrue(providers.any { it is BrowserRouteDecisionHandlerProvider })
    }
}
