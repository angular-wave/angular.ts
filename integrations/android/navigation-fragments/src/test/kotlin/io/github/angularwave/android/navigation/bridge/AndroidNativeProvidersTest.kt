package io.github.angularwave.android.navigation.bridge

import io.github.angularwave.android.navigation.elements.NativeElementDefinition
import io.github.angularwave.android.navigation.elements.NativeElementProvider
import io.github.angularwave.android.navigation.routing.RouteDecisionHandlerProvider
import org.junit.Assert.assertEquals
import org.junit.Test

class AndroidNativeProvidersTest {
    @Test
    fun `registration is idempotent by provider type`() {
        AndroidNativeProviders.registerCapabilityProvider(TestCapabilityProvider())
        AndroidNativeProviders.registerCapabilityProvider(TestCapabilityProvider())
        AndroidNativeProviders.registerElementProvider(TestElementProvider())
        AndroidNativeProviders.registerElementProvider(TestElementProvider())
        AndroidNativeProviders.registerRouteDecisionHandlerProvider(TestRouteProvider())
        AndroidNativeProviders.registerRouteDecisionHandlerProvider(TestRouteProvider())

        assertEquals(
            1,
            AndroidNativeProviders.capabilityProviders().count {
                it is TestCapabilityProvider
            },
        )
        assertEquals(
            1,
            AndroidNativeProviders.elementProviders().count { it is TestElementProvider },
        )
        assertEquals(
            1,
            AndroidNativeProviders.routeDecisionHandlerProviders().count {
                it is TestRouteProvider
            },
        )
    }

    private class TestCapabilityProvider : NativeCapabilityProvider {
        override fun capabilities(context: NativeCapabilityContext): Collection<NativeCapability> =
            emptyList()
    }

    private class TestElementProvider : NativeElementProvider {
        override fun definitions(): Collection<NativeElementDefinition> = emptyList()
    }

    private class TestRouteProvider : RouteDecisionHandlerProvider {
        override fun handlers() =
            emptyList<
                io.github.angularwave.android.navigation.routing.Router.RouteDecisionHandler
            >()
    }
}
