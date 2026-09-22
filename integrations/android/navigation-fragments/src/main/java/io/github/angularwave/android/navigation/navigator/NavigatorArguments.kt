package io.github.angularwave.android.navigation.navigator

import android.annotation.SuppressLint
import android.os.Bundle
import io.github.angularwave.android.core.ng.nav.PresentationContext
import io.github.angularwave.android.navigation.logging.logError
import kotlin.text.uppercase

internal const val ARG_LOCATION = "location"
internal const val ARG_NAVIGATOR_NAME = "navigator-name"
internal const val ARG_PRESENTATION_CONTEXT = "presentation-context"

internal val Bundle.location
    get() = getString(ARG_LOCATION)

internal val Bundle.navigatorName
    get() = getString(ARG_NAVIGATOR_NAME)

internal val Bundle.presentationContext
    @SuppressLint("DefaultLocale")
    get() =
        try {
            val value = getString(ARG_PRESENTATION_CONTEXT) ?: "default"
            PresentationContext.valueOf(value.uppercase())
        } catch (e: IllegalArgumentException) {
            logError("unknownPresentationContext", e)
            PresentationContext.DEFAULT
        }
