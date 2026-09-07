package io.github.angularwave.android.navigation.activities

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import io.github.angularwave.android.navigation.navigator.Navigator
import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration

/**
 * Activity that should be implemented by any Activity using AngularNative.
 */
abstract class AngularNativeActivity : AppCompatActivity() {
    lateinit var delegate: AngularNativeActivityDelegate
        private set

    /**
     * Provide a list of navigator configurations for the Activity. Configurations
     * for all navigator instances available throughout the app should be provided here.
     */
    abstract fun navigatorConfigurations(): List<NavigatorConfiguration>

    /**
     * Called when a navigator has been initialized and is ready for navigation. The
     * root destination for the navigator has already been created.
     */
    open fun onNavigatorReady(navigator: Navigator) {}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        delegate = AngularNativeActivityDelegate(this)
    }
}
