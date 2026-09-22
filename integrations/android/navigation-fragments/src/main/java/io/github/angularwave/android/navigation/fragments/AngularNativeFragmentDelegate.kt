package io.github.angularwave.android.navigation.fragments

import io.github.angularwave.android.core.ng.config.toolbarEnabled
import io.github.angularwave.android.navigation.destinations.AngularNativeDestination
import io.github.angularwave.android.navigation.logging.logEvent
import io.github.angularwave.android.navigation.navigator.navigatorName
import io.github.angularwave.android.navigation.session.SessionModalResult
import io.github.angularwave.android.navigation.session.SessionViewModel
import io.github.angularwave.android.navigation.util.displayBackButton
import io.github.angularwave.android.navigation.util.displayBackButtonAsCloseIcon

/**
 * Provides all the hooks for a Fragment to delegate its lifecycle events to this class. Note: This
 * class should not need to be used directly from within your app.
 */
class AngularNativeFragmentDelegate(private val navDestination: AngularNativeDestination) {
    private val fragment = navDestination.fragment
    private val location = navDestination.location
    private val navigatorName = requireNotNull(fragment.arguments?.navigatorName)
    private val navigator
        get() = navDestination.navigator

    internal val sessionViewModel =
        SessionViewModel.get(
            sessionName = navigatorName,
            activity = fragment.requireActivity(),
        )
    internal val fragmentViewModel =
        AngularNativeFragmentViewModel.get(
            location = location,
            fragment = fragment,
        )

    fun prepareNavigation(onReady: () -> Unit) {
        onReady()
    }

    /** Should be called by the implementing Fragment during `Fragment.onViewCreated`. */
    fun onViewCreated() {
        initToolbar()
        logEvent("fragment.onViewCreated", "location" to location)
    }

    /**
     * Should be called by the implementing Fragment during
     * [androidx.fragment.app.Fragment.onStart].
     */
    fun onStart() {
        logEvent("fragment.onStart", "location" to location)
    }

    /**
     * Should be called by the implementing Fragment during [androidx.fragment.app.Fragment.onStop].
     */
    fun onStop() {
        logEvent("fragment.onStop", "location" to location)
    }

    /**
     * Provides a hook when the Fragment has been started again after a dialog has been
     * dismissed/canceled and no result is passed back.
     */
    fun onStartAfterDialogCancel() {
        logEvent("fragment.onStartAfterDialogCancel", "location" to location)
    }

    /**
     * Provides a hook when a Fragment has been started again after receiving a modal result. Will
     * navigate if the result indicates it should.
     */
    fun onStartAfterModalResult(result: SessionModalResult) {
        logEvent(
            "fragment.onStartAfterModalResult",
            "location" to result.location,
            "options" to result.options,
        )
        if (navigator.shouldRouteToModalResult(result)) {
            navigator.route(result.location, result.options, result.bundle)
        }
    }

    /**
     * Provides a hook when the dialog has been canceled. If there is a modal result, an event will
     * be created in [SessionViewModel] that can be observed.
     */
    fun onDialogCancel() {
        logEvent("fragment.onDialogCancel", "location" to location)
        if (!sessionViewModel.modalResultExists) {
            sessionViewModel.sendDialogResult()
        }
    }

    /** Provides a hook when the dialog has been dismissed. */
    fun onDialogDismiss() {
        logEvent("fragment.onDialogDismiss", "location" to location)
    }

    // ----------------------------------------------------------------------------
    // Private
    // ----------------------------------------------------------------------------

    private fun initToolbar() {
        val toolbar = navDestination.toolbarForNavigation()
        val toolbarEnabled = navDestination.pathProperties.toolbarEnabled
        val visibility = if (toolbarEnabled) android.view.View.VISIBLE else android.view.View.GONE
        toolbar?.visibility = visibility
        (toolbar?.parent as? android.view.View)?.visibility = visibility
        if (!toolbarEnabled) return
        toolbar?.let {
            if (!navigator.isAtStartDestination()) {
                if (navDestination.isModal) {
                    it.displayBackButtonAsCloseIcon()
                } else {
                    it.displayBackButton()
                }
            }

            it.setNavigationOnClickListener {
                navigator.pop()
            }
        }
    }

    private fun logEvent(
        event: String,
        vararg params: Pair<String, Any>,
    ) {
        val attributes =
            params.toMutableList().apply {
                add(0, "navigator" to navigator.configuration.name)
                add("fragment" to fragment.javaClass.simpleName)
            }
        logEvent(event, attributes)
    }
}
