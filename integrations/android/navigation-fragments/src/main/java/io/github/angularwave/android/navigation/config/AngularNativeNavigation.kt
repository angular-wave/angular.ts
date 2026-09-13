package io.github.angularwave.android.navigation.config

import androidx.fragment.app.Fragment
import io.github.angularwave.android.core.bridge.BridgeComponent
import io.github.angularwave.android.core.bridge.BridgeComponentFactory
import io.github.angularwave.android.core.config.AngularNative
import io.github.angularwave.android.navigation.bridge.AndroidNativeProviders
import io.github.angularwave.android.navigation.destinations.AngularNativeDestination
import io.github.angularwave.android.navigation.fragments.AngularNativeWebBottomSheetFragment
import io.github.angularwave.android.navigation.fragments.AngularNativeWebFragment
import io.github.angularwave.android.navigation.routing.AppNavigationRouteDecisionHandler
import io.github.angularwave.android.navigation.routing.Router
import io.github.angularwave.android.navigation.routing.SystemNavigationRouteDecisionHandler
import kotlin.reflect.KClass

internal object AngularNativeNavigation {
    var router =
        Router(
            listOf(AppNavigationRouteDecisionHandler()) +
                AndroidNativeProviders.discoverRouteDecisionHandlerProviders().flatMap {
                    it.handlers()
                } +
                SystemNavigationRouteDecisionHandler()
        )

    var defaultFragmentDestination: KClass<out Fragment> = AngularNativeWebFragment::class

    var registeredFragmentDestinations: List<KClass<out Fragment>> =
        listOf(
            AngularNativeWebFragment::class,
            AngularNativeWebBottomSheetFragment::class,
        )

    @Suppress("UNCHECKED_CAST")
    var registeredBridgeComponentFactories:
        List<
            BridgeComponentFactory<
                AngularNativeDestination,
                BridgeComponent<AngularNativeDestination>,
            >
        >
        get() =
            AngularNative.config.registeredBridgeComponentFactories
                as
                List<
                    BridgeComponentFactory<
                        AngularNativeDestination,
                        BridgeComponent<AngularNativeDestination>,
                    >
                >
        set(value) {
            AngularNative.config.registeredBridgeComponentFactories = value
        }
}

/**
 * Registers the [Router.RouteDecisionHandler] instances that determine whether to route location
 * urls within in-app navigation or with alternative custom behaviors.
 */
fun AngularNative.registerRouteDecisionHandlers(
    vararg decisionHandlers: Router.RouteDecisionHandler
) {
    AngularNativeNavigation.router = Router(decisionHandlers.toList())
}

/**
 * Register bridge components that the app supports. Every possible bridge component, wrapped in a
 * [BridgeComponentFactory], must be provided here.
 */
fun AngularNative.registerBridgeComponents(
    vararg factories:
        BridgeComponentFactory<AngularNativeDestination, BridgeComponent<AngularNativeDestination>>
) {
    config.registeredBridgeComponentFactories = factories.toList()
}

/**
 * The default fragment destination for web requests. If you have not loaded a path configuration
 * with a matching rule and a `uri` available for all possible paths, this destination will be used
 * as the default.
 */
var AngularNative.defaultFragmentDestination: KClass<out Fragment>
    get() = AngularNativeNavigation.defaultFragmentDestination
    set(value) {
        AngularNativeNavigation.defaultFragmentDestination = value
    }

/**
 * Register fragment destinations that can be navigated to. Every possible destination must be
 * provided here, including one set via [defaultFragmentDestination].
 */
fun AngularNative.registerFragmentDestinations(vararg destinations: KClass<out Fragment>) {
    AngularNativeNavigation.registeredFragmentDestinations = destinations.toList()
}
