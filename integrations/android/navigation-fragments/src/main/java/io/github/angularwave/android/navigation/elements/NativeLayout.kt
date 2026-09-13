package io.github.angularwave.android.navigation.elements

import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout

internal fun configureChildLayout(host: ViewGroup, values: NativeProperties) {
    val density = host.resources.displayMetrics.density
    val spacing = layoutDimension(values, NativeElementCatalog.Wire.SPACING, density) ?: 0
    val horizontal = horizontalGravity(values)
    val vertical = verticalGravity(values)
    when (host) {
        is LinearLayout ->
            host.children().forEachIndexed { index, child ->
                val params =
                    child.layoutParams as? LinearLayout.LayoutParams
                        ?: LinearLayout.LayoutParams(child.layoutParams)
                params.gravity = horizontal or vertical
                if (host.orientation == LinearLayout.HORIZONTAL) {
                    params.marginStart = if (index == 0) 0 else spacing
                    params.topMargin = 0
                } else {
                    params.marginStart = 0
                    params.topMargin = if (index == 0) 0 else spacing
                }
                child.layoutParams = params
            }
        is FrameLayout ->
            host.children().forEach { child ->
                val params =
                    child.layoutParams as? FrameLayout.LayoutParams
                        ?: FrameLayout.LayoutParams(child.layoutParams)
                params.gravity = horizontal or vertical
                child.layoutParams = params
            }
    }
}

internal fun layoutDimension(
    values: NativeProperties,
    name: String,
    density: Float,
): Int? {
    if (!values.has(name)) return null
    val value = values.float(name)
    if (!value.isFinite() || value < 0f) invalidLayoutProperty(name, value)
    return kotlin.math.round(value * density).toInt()
}

private fun horizontalGravity(values: NativeProperties): Int =
    when (val value = values.string(NativeElementCatalog.Wire.HORIZONTAL_ALIGNMENT, "stretch")) {
        "start" -> Gravity.START
        "center" -> Gravity.CENTER_HORIZONTAL
        "end" -> Gravity.END
        "stretch" -> Gravity.FILL_HORIZONTAL
        else -> invalidLayoutProperty(NativeElementCatalog.Wire.HORIZONTAL_ALIGNMENT, value)
    }

private fun verticalGravity(values: NativeProperties): Int =
    when (val value = values.string(NativeElementCatalog.Wire.VERTICAL_ALIGNMENT, "stretch")) {
        "top" -> Gravity.TOP
        "center" -> Gravity.CENTER_VERTICAL
        "bottom" -> Gravity.BOTTOM
        "stretch" -> Gravity.FILL_VERTICAL
        else -> invalidLayoutProperty(NativeElementCatalog.Wire.VERTICAL_ALIGNMENT, value)
    }

internal fun invalidLayoutProperty(name: String, value: Any): Nothing =
    throw NativeElementException(
        NativeElementException.Code.INVALID_PROPERTY,
        "Invalid native layout property $name: $value",
    )
