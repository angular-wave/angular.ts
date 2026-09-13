package io.github.angularwave.android.demo

import android.app.Application
import android.os.StrictMode
import io.github.angularwave.android.core.bridge.BridgeComponentFactory
import io.github.angularwave.android.core.bridge.KotlinXJsonConverter
import io.github.angularwave.android.core.config.AngularNative
import io.github.angularwave.android.core.ng.config.PathConfiguration
import io.github.angularwave.android.demo.bridge.FormComponent
import io.github.angularwave.android.demo.bridge.MenuComponent
import io.github.angularwave.android.demo.bridge.OverflowMenuComponent
import io.github.angularwave.android.demo.features.imageviewer.ImageViewerFragment
import io.github.angularwave.android.demo.features.numbers.NumbersFragment
import io.github.angularwave.android.demo.features.web.WebBottomSheetFragment
import io.github.angularwave.android.demo.features.web.WebFragment
import io.github.angularwave.android.navigation.config.defaultFragmentDestination
import io.github.angularwave.android.navigation.config.registerBridgeComponents
import io.github.angularwave.android.navigation.config.registerFragmentDestinations

class DemoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) configureStrictMode()
        configureApp()
    }

    private fun configureStrictMode() {
        StrictMode.setThreadPolicy(
            StrictMode.ThreadPolicy.Builder().detectAll().penaltyLog().build()
        )
        StrictMode.setVmPolicy(
            StrictMode.VmPolicy.Builder()
                .detectActivityLeaks()
                .detectLeakedClosableObjects()
                .detectLeakedRegistrationObjects()
                .detectFileUriExposure()
                .penaltyLog()
                .build()
        )
    }

    private fun configureApp() {
        // Set the default fragment destination
        AngularNative.defaultFragmentDestination = WebFragment::class

        // Register fragment destinations
        AngularNative.registerFragmentDestinations(
            WebFragment::class,
            WebBottomSheetFragment::class,
            NumbersFragment::class,
            ImageViewerFragment::class,
        )

        // Register bridge components
        AngularNative.registerBridgeComponents(
            BridgeComponentFactory("form", ::FormComponent),
            BridgeComponentFactory("menu", ::MenuComponent),
            BridgeComponentFactory("overflow-menu", ::OverflowMenuComponent),
        )

        // Set configuration options
        AngularNative.config.debugLoggingEnabled = BuildConfig.DEBUG
        AngularNative.config.webViewDebuggingEnabled = BuildConfig.DEBUG
        AngularNative.config.jsonConverter = KotlinXJsonConverter()
        AngularNative.config.applicationUserAgentPrefix = "AngularNative Demo;"

        // Loads the path configuration
        AngularNative.loadPathConfiguration(
            context = this,
            location =
                PathConfiguration.Location(
                    assetFilePath = "json/path-configuration.json",
                    remoteFileUrl = "${Demo.current.url}/configurations/android_v1.json",
                ),
        )
    }
}
