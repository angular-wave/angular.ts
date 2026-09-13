package io.github.angularwave.android.navigation.elements

import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.core.graphics.ColorUtils
import androidx.core.graphics.toColorInt
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.chip.Chip
import com.google.android.material.imageview.ShapeableImageView
import com.google.android.material.tabs.TabLayout

internal fun applyNativePresentation(
    view: View,
    properties: NativeProperties,
    elementName: String,
) {
    val style = properties.objectValue(NATIVE_STYLE_PROPERTY) ?: return
    val density = view.resources.displayMetrics.density
    val pixels: (String) -> Int = { (style.float(it) * density).toInt().coerceAtLeast(0) }

    val layout = view.layoutParams
    if (layout != null) {
        if (style.has("width")) layout.width = pixels("width")
        if (style.has("height")) layout.height = pixels("height")
        if (layout is ViewGroup.MarginLayoutParams) {
            layout.setMargins(
                pixels("marginLeft"),
                pixels("marginTop"),
                pixels("marginRight"),
                pixels("marginBottom"),
            )
        }
        view.layoutParams = layout
    }
    if (style.has("minWidth")) view.minimumWidth = pixels("minWidth")
    if (style.has("minHeight")) view.minimumHeight = pixels("minHeight")
    if (
        style.has("paddingTop") ||
            style.has("paddingRight") ||
            style.has("paddingBottom") ||
            style.has("paddingLeft")
    ) {
        view.setPadding(
            pixels("paddingLeft"),
            pixels("paddingTop"),
            pixels("paddingRight"),
            pixels("paddingBottom"),
        )
    }
    if (style.has("opacity")) view.alpha = style.float("opacity", 1f).coerceIn(0f, 1f)
    if (style.has("elevation")) view.elevation = style.float("elevation") * density

    val background = style.string("backgroundColor").takeIf(String::isNotEmpty)
    val border = style.string("borderColor").takeIf(String::isNotEmpty)
    val radius = style.float("borderRadius") * density
    val borderWidth = pixels("borderWidth")
    applySurface(view, background, border, radius, borderWidth)

    if (elementName in TEXT_PRESENTATION_ELEMENTS) {
        applyTextPresentationTree(view, style, density)
    }
    if (view is ImageView) applyImagePresentation(view, style, radius, density)

    val foreground = style.string("color").takeIf(String::isNotEmpty)?.let(::nativeStyleColor)
    val accent = style.string("accentColor").takeIf(String::isNotEmpty)?.let(::nativeStyleColor)
    if (foreground != null && accent != null) {
        val colors =
            ColorStateList(
                arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
                intArrayOf(accent, foreground),
            )
        when (view) {
            is BottomNavigationView -> {
                view.itemIconTintList = colors
                view.itemTextColor = colors
                view.itemActiveIndicatorColor =
                    ColorStateList.valueOf(
                        ColorUtils.setAlphaComponent(accent, ACTIVE_INDICATOR_ALPHA)
                    )
            }
            is TabLayout -> view.setTabTextColors(foreground, accent)
        }
    }
}

private fun applySurface(
    view: View,
    background: String?,
    border: String?,
    radius: Float,
    borderWidth: Int,
) {
    val backgroundColor = background?.let(::nativeStyleColor)
    val borderColor = border?.let(::nativeStyleColor)
    when (view) {
        is MaterialCardView ->
            applyCardSurface(view, backgroundColor, borderColor, radius, borderWidth)
        is MaterialButton ->
            applyButtonSurface(view, backgroundColor, borderColor, radius, borderWidth)
        is Chip -> applyChipSurface(view, backgroundColor, borderColor, radius, borderWidth)
        else -> applyDefaultSurface(view, backgroundColor, borderColor, radius, borderWidth)
    }
}

private fun applyCardSurface(
    view: MaterialCardView,
    backgroundColor: Int?,
    borderColor: Int?,
    radius: Float,
    borderWidth: Int,
) {
    if (backgroundColor != null) view.setCardBackgroundColor(backgroundColor)
    if (radius > 0) view.radius = radius
    view.strokeWidth = borderWidth
    if (borderColor != null) view.strokeColor = borderColor
}

private fun applyButtonSurface(
    view: MaterialButton,
    backgroundColor: Int?,
    borderColor: Int?,
    radius: Float,
    borderWidth: Int,
) {
    if (backgroundColor != null) {
        view.backgroundTintList = ColorStateList.valueOf(backgroundColor)
    }
    if (radius > 0) view.cornerRadius = radius.toInt()
    view.strokeWidth = borderWidth
    if (borderColor != null) view.strokeColor = ColorStateList.valueOf(borderColor)
}

private fun applyChipSurface(
    view: Chip,
    backgroundColor: Int?,
    borderColor: Int?,
    radius: Float,
    borderWidth: Int,
) {
    if (backgroundColor != null) {
        view.chipBackgroundColor = ColorStateList.valueOf(backgroundColor)
    }
    if (radius > 0) {
        view.shapeAppearanceModel =
            view.shapeAppearanceModel.toBuilder().setAllCornerSizes(radius).build()
    }
    view.chipStrokeWidth = borderWidth.toFloat()
    if (borderColor != null) view.chipStrokeColor = ColorStateList.valueOf(borderColor)
}

private fun applyDefaultSurface(
    view: View,
    backgroundColor: Int?,
    borderColor: Int?,
    radius: Float,
    borderWidth: Int,
) {
    if (backgroundColor == null && (borderColor == null || borderWidth <= 0)) return
    view.background =
        GradientDrawable().apply {
            setColor(backgroundColor ?: Color.TRANSPARENT)
            cornerRadius = radius
            if (borderColor != null && borderWidth > 0) {
                setStroke(borderWidth, borderColor)
            }
        }
}

private fun applyTextPresentationTree(view: View, style: NativeProperties, density: Float) {
    if (view is TextView) applyTextPresentation(view, style, density)
    if (view is ViewGroup) {
        for (index in 0 until view.childCount) {
            applyTextPresentationTree(view.getChildAt(index), style, density)
        }
    }
}

private fun applyTextPresentation(view: TextView, style: NativeProperties, density: Float) {
    if (style.has("color")) view.setTextColor(nativeStyleColor(style.string("color")))
    if (style.has("fontSize")) {
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, style.float("fontSize"))
    }
    val family = style.string("fontFamily")
    val base = nativeStyleBaseTypeface(family, view.typeface)
    val weight =
        style.string("fontWeight", FONT_WEIGHT_NORMAL.toString()).toIntOrNull()
            ?: if (style.string("fontWeight") == "bold") FONT_WEIGHT_BOLD else FONT_WEIGHT_NORMAL
    val italic = style.string("fontStyle") == "italic"
    view.typeface =
        if (weight == FONT_WEIGHT_NORMAL || weight == FONT_WEIGHT_BOLD) {
            val typefaceStyle =
                when {
                    weight == FONT_WEIGHT_BOLD && italic -> Typeface.BOLD_ITALIC
                    weight == FONT_WEIGHT_BOLD -> Typeface.BOLD
                    italic -> Typeface.ITALIC
                    else -> Typeface.NORMAL
                }
            Typeface.create(base, typefaceStyle)
        } else {
            Typeface.create(base, weight.coerceIn(FONT_WEIGHT_MIN, FONT_WEIGHT_MAX), italic)
        }
    view.paint.isFakeBoldText =
        weight >= FONT_WEIGHT_FAKE_BOLD && !requireNotNull(view.typeface).isBold
    view.paint.textSkewX =
        if (italic && !requireNotNull(view.typeface).isItalic) {
            ITALIC_TEXT_SKEW
        } else {
            0f
        }
    if (style.has("lineHeight")) {
        view.setLineHeight((style.float("lineHeight") * density).toInt())
    }
    if (style.has("letterSpacing") && style.float("fontSize") > 0) {
        view.letterSpacing = style.float("letterSpacing") / style.float("fontSize")
    }
    view.gravity =
        when (style.string("textAlign")) {
            "center" -> Gravity.CENTER_HORIZONTAL
            "right",
            "end" -> Gravity.END
            else -> Gravity.START
        } or (view.gravity and Gravity.VERTICAL_GRAVITY_MASK)
}

internal fun nativeStyleBaseTypeface(family: String, fallback: Typeface?): Typeface {
    val requested = family.substringBefore(',').trim(' ', '\"', '\'')
    return when (requested.lowercase()) {
        "monospace" -> Typeface.MONOSPACE
        "avenir",
        "avenir next",
        "arial",
        "helvetica",
        "sans-serif",
        "system-ui" -> Typeface.SANS_SERIF
        "georgia",
        "times",
        "times new roman",
        "serif" -> Typeface.SERIF
        "" -> fallback ?: Typeface.DEFAULT
        else -> Typeface.create(requested, Typeface.NORMAL)
    }
}

private fun applyImagePresentation(
    view: ImageView,
    style: NativeProperties,
    radius: Float,
    density: Float,
) {
    view.scaleType =
        when (style.string("objectFit")) {
            "contain",
            "scale-down" -> ImageView.ScaleType.FIT_CENTER
            "fill" -> ImageView.ScaleType.FIT_XY
            "none" -> ImageView.ScaleType.CENTER
            else -> view.scaleType
        }
    if (radius > 0 && view is ShapeableImageView) {
        val width = style.float("width") * density
        val height = style.float("height") * density
        val cornerRadius =
            if (width > 0 && height > 0) {
                minOf(radius, width / 2, height / 2)
            } else {
                radius
            }
        view.shapeAppearanceModel =
            view.shapeAppearanceModel.toBuilder().setAllCornerSizes(cornerRadius).build()
    }
}

private fun nativeStyleColor(value: String): Int =
    runCatching { value.toColorInt() }.getOrDefault(Color.TRANSPARENT)

private const val FONT_WEIGHT_MIN = 1
private const val FONT_WEIGHT_NORMAL = 400
private const val FONT_WEIGHT_FAKE_BOLD = 600
private const val FONT_WEIGHT_BOLD = 700
private const val FONT_WEIGHT_MAX = 1000
private const val ITALIC_TEXT_SKEW = -0.25f
private const val ACTIVE_INDICATOR_ALPHA = 31
private val TEXT_PRESENTATION_ELEMENTS =
    setOf(
        "badge",
        "button",
        "card",
        "chip",
        "file-picker",
        "list-item",
        "search-field",
        "text",
        "text-field",
    )
