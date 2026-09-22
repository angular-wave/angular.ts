package io.github.angularwave.android.navigation.fragments

internal class PendingNativeResult<T> {
    private var callback: ((T) -> Unit)? = null

    fun register(callback: (T) -> Unit): Boolean {
        if (this.callback != null) return false
        this.callback = callback
        return true
    }

    fun complete(value: T) {
        val pending = callback ?: return
        callback = null
        pending(value)
    }

    fun cancel() {
        callback = null
    }
}
