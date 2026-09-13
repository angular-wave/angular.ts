package io.github.angularwave.android.navigation.elements

/** Generates service-provider metadata for a [NativeElementProvider]. */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.SOURCE)
annotation class RegisterNativeElementProvider(vararg val names: String)
