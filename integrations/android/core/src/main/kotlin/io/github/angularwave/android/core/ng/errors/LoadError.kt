package io.github.angularwave.android.core.ng.errors

/** Errors representing when webNavigation.js or the native adapter fails to load on a page. */
sealed interface LoadError : VisitError {
    val description: String

    data object NotPresent : LoadError {
        override val description = "WebNavigation Not Present"
    }

    data object NotReady : LoadError {
        override val description = "WebNavigation Not Ready"
    }
}
