package io.github.angularwave.android.navigation.bridge

import io.github.angularwave.android.navigation.elements.NativeElementProvider
import io.github.angularwave.android.navigation.routing.RouteDecisionHandlerProvider
import java.util.ServiceLoader
import java.util.concurrent.CopyOnWriteArrayList

/** Process-wide providers contributed by optional Android artifacts. */
object AndroidNativeProviders {
    private val capabilities = CopyOnWriteArrayList<NativeCapabilityProvider>()
    private val elements = CopyOnWriteArrayList<NativeElementProvider>()
    private val routeDecisionHandlers = CopyOnWriteArrayList<RouteDecisionHandlerProvider>()

    @JvmStatic
    fun registerCapabilityProvider(provider: NativeCapabilityProvider) {
        capabilities.addIfAbsentByType(provider)
    }

    @JvmStatic
    fun registerElementProvider(provider: NativeElementProvider) {
        elements.addIfAbsentByType(provider)
    }

    @JvmStatic
    fun registerRouteDecisionHandlerProvider(provider: RouteDecisionHandlerProvider) {
        routeDecisionHandlers.addIfAbsentByType(provider)
    }

    @JvmStatic fun capabilityProviders(): List<NativeCapabilityProvider> = capabilities.toList()

    @JvmStatic fun elementProviders(): List<NativeElementProvider> = elements.toList()

    @JvmStatic
    fun routeDecisionHandlerProviders(): List<RouteDecisionHandlerProvider> =
        routeDecisionHandlers.toList()

    internal fun discoverCapabilityProviders(): List<NativeCapabilityProvider> =
        merge(capabilities, NativeCapabilityProvider::class.java)

    internal fun discoverElementProviders(classLoader: ClassLoader): List<NativeElementProvider> =
        merge(elements, NativeElementProvider::class.java, classLoader)

    internal fun discoverRouteDecisionHandlerProviders(): List<RouteDecisionHandlerProvider> =
        merge(routeDecisionHandlers, RouteDecisionHandlerProvider::class.java)

    private fun <T : Any> merge(
        registered: Iterable<T>,
        type: Class<T>,
        classLoader: ClassLoader = checkNotNull(type.classLoader),
    ): List<T> =
        (registered + ServiceLoader.load(type, classLoader).toList()).distinctBy {
            it.javaClass.name
        }

    private fun <T : Any> CopyOnWriteArrayList<T>.addIfAbsentByType(provider: T) {
        if (none { it.javaClass == provider.javaClass }) add(provider)
    }
}
