package io.github.angularwave.android.navigation.util

import android.content.Context
import android.view.View
import androidx.annotation.AttrRes
import androidx.appcompat.widget.Toolbar
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.navigation.NavBackStackEntry
import io.github.angularwave.android.navigation.R
import io.github.angularwave.android.navigation.navigator.location

fun Toolbar.displayBackButton() {
    navigationIcon = ContextCompat.getDrawable(context, R.drawable.ic_back)
}

fun Toolbar.displayBackButtonAsCloseIcon() {
    navigationIcon = ContextCompat.getDrawable(context, R.drawable.ic_close)
}

fun View.applyDefaultImeWindowInsets() {
    ViewCompat.setOnApplyWindowInsetsListener(this) { v, insets ->
        insets.getInsets(WindowInsetsCompat.Type.ime()).apply {
            v.setPadding(left, top, right, bottom)
        }
        insets
    }
}

internal val NavBackStackEntry?.location: String?
    get() = this?.arguments?.location

internal fun Context.colorFromThemeAttr(@AttrRes attrColor: Int): Int {
    val attributes = obtainStyledAttributes(intArrayOf(attrColor))
    return try {
        attributes.getColor(0, -1)
    } finally {
        attributes.recycle()
    }
}
