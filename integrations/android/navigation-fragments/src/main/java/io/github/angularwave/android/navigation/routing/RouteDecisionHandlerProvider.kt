package io.github.angularwave.android.navigation.routing

/** Supplies optional route handlers without application-level registration. */
fun interface RouteDecisionHandlerProvider {
    fun handlers(): Collection<Router.RouteDecisionHandler>
}

/** Generates service-provider metadata for a [RouteDecisionHandlerProvider]. */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.SOURCE)
annotation class RegisterRouteDecisionHandlerProvider
