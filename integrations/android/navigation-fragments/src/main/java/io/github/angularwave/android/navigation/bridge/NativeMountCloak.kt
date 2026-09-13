package io.github.angularwave.android.navigation.bridge

import android.view.View
import android.view.ViewGroup
import androidx.core.view.doOnPreDraw

internal fun mountCloaked(
    container: ViewGroup,
    view: View,
    onReady: () -> Unit,
) {
    view.visibility = View.INVISIBLE
    container.addView(view)
    view.doOnPreDraw {
        view.visibility = View.VISIBLE
        onReady()
    }
}
