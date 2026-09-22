package io.github.angularwave.android.navigation.session

/**
 * Used as a wrapper for data that is exposed via a LiveData that represents an event.
 *
 * @param T
 * @property content Content of the event.
 */
internal class SessionEvent<out T>(
    private val content: T,
    private val onHandled: () -> Unit = {},
) {
    var hasBeenHandled = false
        private set // Allow external read but not write

    /**
     * Returns the content and prevents its use again.
     *
     * @return
     */
    fun getContentIfNotHandled(): T? =
        if (hasBeenHandled) {
            null
        } else {
            hasBeenHandled = true
            onHandled()
            content
        }

    /**
     * Returns the content, even if it's already been handled.
     *
     * @return
     */
    fun peekContent(): T = content
}
