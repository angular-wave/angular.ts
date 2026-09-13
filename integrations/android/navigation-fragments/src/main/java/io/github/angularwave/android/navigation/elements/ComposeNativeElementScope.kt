package io.github.angularwave.android.navigation.elements

import android.os.Bundle
import android.os.Parcelable
import android.util.SparseArray
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.core.os.BundleCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import org.json.JSONObject

/** Destination services available to custom Compose native elements. */
class ComposeNativeElementScope internal constructor(context: NativeElementContext) {
    val context = context.context
    val lifecycleOwner: LifecycleOwner = context.lifecycleOwner
    val savedStateOwner: SavedStateRegistryOwner = context.savedStateOwner
    private val events = context.events

    fun emit(
        event: String,
        data: JSONObject? = null,
    ) = events.emit(event, data)
}

/** Creates a catalog element factory backed by Compose content. */
fun composeNativeElement(
    content: @Composable ComposeNativeElementScope.(NativeProperties) -> Unit
): NativeElementFactory = NativeElementFactory { context, properties ->
    val state = mutableStateOf(properties)
    val scope = ComposeNativeElementScope(context)
    val composeView =
        ComposeView(context.context).apply {
            id = android.view.View.generateViewId()
            setViewTreeLifecycleOwner(context.lifecycleOwner)
            setViewTreeSavedStateRegistryOwner(context.savedStateOwner)
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
            setContent { scope.content(state.value) }
        }

    object : NativeElementInstance {
        override val view = composeView

        override fun update(properties: NativeProperties) {
            state.value = properties
        }

        override fun saveState(): Bundle =
            Bundle().apply {
                val hierarchy = SparseArray<Parcelable>()
                composeView.saveHierarchyState(hierarchy)
                putSparseParcelableArray("hierarchy", hierarchy)
            }

        override fun restoreState(state: Bundle) {
            BundleCompat.getSparseParcelableArray(state, "hierarchy", Parcelable::class.java)
                ?.let(composeView::restoreHierarchyState)
        }

        override fun dispose() {
            composeView.disposeComposition()
        }
    }
}
