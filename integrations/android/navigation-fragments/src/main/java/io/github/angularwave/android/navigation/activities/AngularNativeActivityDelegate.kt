package io.github.angularwave.android.navigation.activities

import androidx.annotation.IdRes
import io.github.angularwave.android.navigation.logging.logEvent
import io.github.angularwave.android.navigation.navigator.Navigator
import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration
import io.github.angularwave.android.navigation.navigator.NavigatorHost
import io.github.angularwave.android.navigation.navigator.PrimaryNavigationSelector
import io.github.angularwave.android.navigation.observers.AngularNativeActivityObserver

/**
 * Initializes the Activity for AngularNative navigation and provides all the hooks for an Activity
 * to communicate with Angular Native code (and vice versa).
 *
 * @property activity The Activity to bind this delegate to.
 */
@Suppress("unused", "MemberVisibilityCanBePrivate")
class AngularNativeActivityDelegate(val activity: AngularNativeActivity) {
    private val navigatorHosts = mutableMapOf<Int, NavigatorHost>()
    private val primaryNavigation = PrimaryNavigationSelector(activity.supportFragmentManager)

    private var currentNavigatorHostId = activity.navigatorConfigurations().first().navigatorHostId

    // Register the selected NavigatorHost as the primary navigation fragment so AndroidX
    // Navigation owns system and predictive back.
    init {
        activity.lifecycle.addObserver(AngularNativeActivityObserver())
    }

    /**
     * Get the Activity's currently active [Navigator].
     *
     * Returns null if the navigator is not ready for navigation.
     */
    val currentNavigator: Navigator?
        get() {
            val host = navigatorHosts[currentNavigatorHostId]

            return if (host?.isReady() == true) {
                host.navigator
            } else {
                null
            }
        }

    /**
     * Sets the currently active navigator in your Activity. If you use multiple [NavigatorHost]
     * instances in your app (such as for bottom tabs), you must update this whenever the current
     * navigator changes.
     */
    fun setCurrentNavigator(configuration: NavigatorConfiguration) {
        logEvent("navigatorSetAsCurrent", listOf("navigator" to configuration.name))
        currentNavigatorHostId = configuration.navigatorHostId
        navigatorHosts[currentNavigatorHostId]?.let(primaryNavigation::select)
    }

    internal fun registerNavigatorHost(host: NavigatorHost) {
        logEvent("navigatorRegistered", listOf("navigator" to host.navigator.configuration.name))

        if (navigatorHosts[host.id] == null) {
            navigatorHosts[host.id] = host
            if (currentNavigatorHostId == host.id) {
                primaryNavigation.select(host)
            }
        }
    }

    internal fun unregisterNavigatorHost(host: NavigatorHost) {
        logEvent("navigatorUnregistered", listOf("navigator" to host.navigator.configuration.name))
        navigatorHosts.remove(host.id)
        if (primaryNavigation.selected === host) {
            primaryNavigation.select(null)
        }
    }

    internal fun onNavigatorHostReady(host: NavigatorHost) {
        logEvent("navigatorReady", listOf("navigator" to host.navigator.configuration.name))
        activity.onNavigatorReady(host.navigator)
    }

    /**
     * Finds the registered navigator host associated with the provided resource ID.
     *
     * @param navigatorHostId
     * @return The [NavigatorHost] instance if it's view has been created and it has been registered
     *   with the Activity, otherwise `null`.
     */
    fun findNavigatorHost(@IdRes navigatorHostId: Int): NavigatorHost? {
        return navigatorHosts[navigatorHostId]
    }

    /** Resets the sessions associated with all registered navigator hosts. */
    fun resetSessions() {
        navigatorHosts.forEach { it.value.navigator.session.reset() }
    }

    /** Resets all registered navigators via [Navigator.reset]. */
    fun resetNavigators() {
        navigatorHosts.forEach { it.value.navigator.reset() }
    }
}
