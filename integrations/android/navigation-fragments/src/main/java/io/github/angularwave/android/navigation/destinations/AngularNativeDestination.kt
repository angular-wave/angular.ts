package io.github.angularwave.android.navigation.destinations

import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import androidx.appcompat.widget.Toolbar
import androidx.fragment.app.Fragment
import androidx.lifecycle.Lifecycle
import androidx.navigation.NavOptions
import io.github.angularwave.android.core.bridge.BridgeDestination
import io.github.angularwave.android.core.config.AngularNative
import io.github.angularwave.android.core.ng.config.PathConfigurationProperties
import io.github.angularwave.android.core.ng.config.context
import io.github.angularwave.android.core.ng.nav.PresentationContext
import io.github.angularwave.android.core.ng.visit.VisitAction
import io.github.angularwave.android.navigation.fragments.AngularNativeFragmentDelegate
import io.github.angularwave.android.navigation.fragments.AngularNativeFragmentViewModel
import io.github.angularwave.android.navigation.navigator.Navigator
import io.github.angularwave.android.navigation.navigator.location
import io.github.angularwave.android.navigation.routing.Router

/**
 * The primary interface that a navigable Fragment implements to provide the library with the
 * information it needs to properly navigate.
 */
interface AngularNativeDestination : BridgeDestination {
    /** Gets the navigator instance associated with this destination. */
    val navigator: Navigator

    /** Gets the fragment instance for this destination. */
    val fragment: Fragment
        get() = this as Fragment

    /** Gets the location for this destination. */
    val location: String
        get() = requireNotNull(fragment.arguments?.location)

    /** Gets the path configuration properties for the location associated with this destination. */
    val pathProperties: PathConfigurationProperties
        get() = AngularNative.config.pathConfiguration.properties(location)

    /** Gets the [AngularNativeFragmentViewModel] associated with this destination. */
    val fragmentViewModel: AngularNativeFragmentViewModel
        get() = delegate().fragmentViewModel

    /**
     * Specifies whether the destination fragment is currently active and added to its parent
     * activity.
     */
    val isActive: Boolean
        get() =
            fragment.isAdded &&
                !fragment.isDetached &&
                fragment.lifecycle.currentState.isAtLeast(Lifecycle.State.STARTED)

    /** Specifies whether the destination was presented in a modal context. */
    val isModal: Boolean
        get() = pathProperties.context == PresentationContext.MODAL

    /** Gets the delegate instance that handles the Fragment's lifecycle events. */
    fun delegate(): AngularNativeFragmentDelegate

    /** Returns the [Toolbar] used for navigation by the given view. */
    fun toolbarForNavigation(): Toolbar?

    /**
     * Specifies whether title changes should be automatically observed and update the title in the
     * Toolbar provided from toolbarForNavigation(), if available. Default is true.
     */
    fun shouldObserveTitleChanges(): Boolean = true

    /**
     * Called before any navigation action takes places. This is a useful place for state cleanup in
     * your Fragment if necessary.
     */
    fun onBeforeNavigation()

    /**
     * Refresh the destination's contents.
     *
     * @param displayProgress Whether progress should be displayed while refreshing.
     */
    fun refresh(displayProgress: Boolean = true)

    /**
     * Override if you're using a [NestedNavigatorHostDelegate] to provide sub-navigation within
     * your current Fragment destination and would like custom behavior.
     *
     * Return `null` to use the default `navigator` instance for navigation.
     */
    fun customNavigatorForNavigation(newLocation: String): Navigator? = null

    /**
     * Override to provide a custom `Router.Decision` from your destination. By default, the
     * registered [Router.RouteDecisionHandler] instances are used to determine routing logic. It's
     * recommend to use dedicated [Router.RouteDecisionHandler] instances for routing logic.
     *
     * Return `null` to use the global [Router.RouteDecisionHandler] instances to determine routing
     * logic.
     */
    fun customRouteDecision(newLocation: String): Router.Decision? = null

    /**
     * Override to provide a custom set of navigation options (basic enter/exit animations) for the
     * Android Navigation component to use to execute a navigation event.
     *
     * Return `null` to use the library's default destination animations.
     */
    fun customNavigationOptions(
        newLocation: String,
        newPathProperties: PathConfigurationProperties,
        action: VisitAction,
    ): NavOptions? = null

    /**
     * Gets a registered `ActivityResultContracts.StartActivityForResult` activity result launcher
     * instance for the given `requestCode`.
     *
     * Override to provide your own [androidx.activity.result.ActivityResultLauncher] instances. If
     * your app doesn't have a matching `requestCode`, you must call
     * `super.activityResultLauncher(requestCode)` to give the library an opportunity to provide a
     * matching result launcher.
     *
     * @param requestCode The request code for the corresponding result launcher.
     */
    fun activityResultLauncher(requestCode: Int): ActivityResultLauncher<Intent>? = null

    /**
     * Gets a registered `ActivityResultContracts.RequestPermission` activity result launcher
     * instance for the given `requestCode`.
     *
     * Override to provide your own [androidx.activity.result.ActivityResultLauncher] instances. If
     * your app doesn't have a matching `requestCode`, you must call
     * `super.activityPermissionResultLauncher(requestCode)` to give the library an opportunity to
     * provide a matching result launcher.
     *
     * @param requestCode The request code for the corresponding result launcher.
     */
    fun activityPermissionResultLauncher(requestCode: Int): ActivityResultLauncher<String>? = null

    /** Launches an activity result owned by this destination's native bridge. */
    fun launchNativeActivity(
        intent: Intent,
        result: (Int, Intent?) -> Unit,
    ): Boolean = false

    /** Requests one runtime permission owned by this destination's native bridge. */
    fun launchNativePermission(
        permission: String,
        result: (Boolean) -> Unit,
    ): Boolean = false

    /** Clears a pending native activity callback when its bridge request ends. */
    fun cancelNativeActivity() {}

    /** Clears a pending native permission callback when its bridge request ends. */
    fun cancelNativePermission() {}

    fun prepareNavigation(onReady: () -> Unit)

    override fun bridgeWebViewIsReady(): Boolean = navigator.session.isReady
}
