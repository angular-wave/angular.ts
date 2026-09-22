package io.github.angularwave.android.navigation.elements

import androidx.savedstate.SavedStateRegistryOwner
import java.lang.ref.WeakReference
import java.util.WeakHashMap

internal fun interface NativeOverlayHandle {
    fun dismissForReplacement()
}

/** Enforces one transient overlay per destination without retaining either owner. */
internal object NativeOverlayCoordinator {
    private val active = WeakHashMap<SavedStateRegistryOwner, WeakReference<NativeOverlayHandle>>()

    @Synchronized
    fun claim(
        owner: SavedStateRegistryOwner,
        handle: NativeOverlayHandle,
    ) {
        val previous = active.put(owner, WeakReference(handle))?.get()
        if (previous !== handle) previous?.dismissForReplacement()
    }

    @Synchronized
    fun release(
        owner: SavedStateRegistryOwner,
        handle: NativeOverlayHandle,
    ) {
        if (active[owner]?.get() === handle) active.remove(owner)
    }

    @Synchronized fun clear() = active.clear()
}
