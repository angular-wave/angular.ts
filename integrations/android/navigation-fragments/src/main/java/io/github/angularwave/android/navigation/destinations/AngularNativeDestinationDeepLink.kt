package io.github.angularwave.android.navigation.destinations

import kotlin.reflect.KClass
import kotlin.reflect.full.findAnnotation

/**
 * Annotation for each Fragment that will be registered as a navigation destination.
 *
 * For example: `@AngularNativeDestinationDeepLink(uri = "angularNative://fragment/search")` `class
 * SearchFragment : AngularNativeWebFragment()`
 *
 * @property uri The deeplink URI to be registered with the Android Navigation component nav graph.
 */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class AngularNativeDestinationDeepLink(val uri: String) {
    companion object {
        internal fun from(klass: KClass<out Any>): AngularNativeDestinationDeepLink =
            requireNotNull(klass.findAnnotation()) {
                "A AngularNativeDestinationDeepLink annotation is required for the destination: ${klass.simpleName}"
            }
    }
}
