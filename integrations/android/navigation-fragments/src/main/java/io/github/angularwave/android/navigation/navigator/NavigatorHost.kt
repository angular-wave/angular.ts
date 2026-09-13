package io.github.angularwave.android.navigation.navigator

import android.net.Uri
import android.os.Bundle
import android.view.View
import androidx.annotation.VisibleForTesting
import androidx.annotation.VisibleForTesting.Companion.PROTECTED
import androidx.core.net.toUri
import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager
import androidx.fragment.app.FragmentOnAttachListener
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.fragment.findNavController
import io.github.angularwave.android.core.config.AngularNative
import io.github.angularwave.android.navigation.activities.AngularNativeActivity
import io.github.angularwave.android.navigation.config.AngularNativeNavigation

internal const val DEEPLINK_EXTRAS_KEY = "android-support-nav:controller:deepLinkExtras"
internal const val LOCATION_KEY = "location"

open class NavigatorHost : NavHostFragment(), FragmentOnAttachListener {
    internal lateinit var activity: AngularNativeActivity
    lateinit var navigator: Navigator
        private set

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        activity = requireActivity() as AngularNativeActivity
        navigator = Navigator(this, configuration, activity)
        childFragmentManager.addFragmentOnAttachListener(this)

        initControllerGraph()
    }

    override fun onViewCreated(
        view: View,
        savedInstanceState: Bundle?,
    ) {
        super.onViewCreated(view, savedInstanceState)
        activity.delegate.registerNavigatorHost(this)
    }

    override fun onAttachFragment(
        fragmentManager: FragmentManager,
        fragment: Fragment,
    ) {
        activity.delegate.onNavigatorHostReady(this)
        childFragmentManager.removeFragmentOnAttachListener(this)
    }

    override fun onDestroy() {
        activity.delegate.unregisterNavigatorHost(this)
        super.onDestroy()
    }

    /**
     * Returns whether the navigation host is ready for navigation. It is not ready for navigation
     * if the view is not attached or the start destination has not been created yet.
     */
    fun isReady(): Boolean =
        isAdded && !isDetached && childFragmentManager.primaryNavigationFragment != null

    internal fun initControllerGraph() {
        ensureDeeplinkStartLocationValid()

        navController.apply {
            graph =
                NavigatorGraphBuilder(
                        navigatorName = configuration.name,
                        startLocation = configuration.startLocation,
                        pathConfiguration = AngularNative.config.pathConfiguration,
                        navController = findNavController(),
                    )
                    .build(
                        registeredFragments = AngularNativeNavigation.registeredFragmentDestinations
                    )
        }
    }

    /**
     * Google's Navigation library automatically navigates to deep links provided in the Activity's
     * Intent. This exposes a vulnerability for malicious Intents to open an arbitrary webpage
     * outside of the app's domain, allowing javascript injection on the page. Ensure that deep link
     * intents always match the app's domain.
     */
    @VisibleForTesting(otherwise = PROTECTED)
    fun ensureDeeplinkStartLocationValid() {
        val extrasBundle = activity.intent.extras?.getBundle(DEEPLINK_EXTRAS_KEY) ?: return
        val startLocation = extrasBundle.getString(LOCATION_KEY) ?: return

        val deepLinkStartUri = startLocation.toUri()
        val configStartUri = configuration.startLocation.toUri()

        if (!deepLinkStartUri.hasSameOrigin(configStartUri)) {
            extrasBundle.putString(LOCATION_KEY, configuration.startLocation)
            activity.intent.putExtra(DEEPLINK_EXTRAS_KEY, extrasBundle)
        }
    }

    private val configuration
        get() =
            activity.navigatorConfigurations().firstOrNull {
                id == it.navigatorHostId
            } ?: throw IllegalStateException("No configuration found for NavigatorHost")

    private fun Uri.hasSameOrigin(other: Uri): Boolean {
        val currentScheme = scheme ?: return false
        val currentHost = host ?: return false
        val otherScheme = other.scheme ?: return false
        val otherHost = other.host ?: return false

        return currentScheme.equals(otherScheme, ignoreCase = true) &&
            currentHost.equals(otherHost, ignoreCase = true) &&
            normalizedPort() == other.normalizedPort()
    }

    private fun Uri.normalizedPort(): Int =
        when {
            port >= 0 -> port
            scheme.equals("http", ignoreCase = true) -> DEFAULT_HTTP_PORT
            scheme.equals("https", ignoreCase = true) -> DEFAULT_HTTPS_PORT
            else -> -1
        }

    private companion object {
        const val DEFAULT_HTTP_PORT = 80
        const val DEFAULT_HTTPS_PORT = 443
    }
}
