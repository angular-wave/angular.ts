package io.github.angularwave.android.navigation.elements

import android.view.View
import android.view.accessibility.AccessibilityEvent
import androidx.savedstate.SavedStateRegistryOwner
import java.lang.ref.WeakReference
import org.json.JSONObject

/** Owns one platform overlay without extending the lifetime of its destination or focus anchor. */
internal class NativeOverlayLifecycle(
    owner: SavedStateRegistryOwner,
    anchor: View,
    onDismiss: (JSONObject?) -> Unit,
) : NativeOverlayHandle {
    private val owner = WeakReference(owner)
    private val anchor = WeakReference(anchor)
    private var onDismiss: ((JSONObject?) -> Unit)? = onDismiss
    private val opening: () -> Unit = {}
    private var closeOverlay: (() -> Unit)? = null
    private var disposed = false

    val isShowing: Boolean
        get() = closeOverlay != null

    fun show(create: (dismissed: (JSONObject?) -> Unit) -> (() -> Unit)) {
        if (disposed) return
        dismiss()
        val currentOwner = owner.get() ?: return
        closeOverlay = opening
        NativeOverlayCoordinator.claim(currentOwner, this)
        var created = false
        try {
            val close = create(::platformDismissed)
            if (closeOverlay === opening) closeOverlay = close else close()
            created = true
        } finally {
            if (!created) {
                closeOverlay = null
                NativeOverlayCoordinator.release(currentOwner, this)
            }
        }
    }

    fun dismiss() {
        val close = closeOverlay ?: return
        if (close !== opening) close()
        if (closeOverlay === close) platformDismissed(null)
    }

    fun dispose() {
        if (disposed) return
        disposed = true
        val close = closeOverlay
        closeOverlay = null
        onDismiss = null
        owner.get()?.let { NativeOverlayCoordinator.release(it, this) }
        if (close !== opening) close?.invoke()
        anchor.clear()
        owner.clear()
    }

    override fun dismissForReplacement() = dismiss()

    private fun platformDismissed(data: JSONObject?) {
        if (closeOverlay == null) return
        closeOverlay = null
        owner.get()?.let { NativeOverlayCoordinator.release(it, this) }
        if (disposed) return
        anchor.get()?.let { view ->
            if (!view.requestFocus()) view.requestFocusFromTouch()
            view.sendAccessibilityEvent(AccessibilityEvent.TYPE_VIEW_FOCUSED)
        }
        onDismiss?.invoke(data)
    }
}
