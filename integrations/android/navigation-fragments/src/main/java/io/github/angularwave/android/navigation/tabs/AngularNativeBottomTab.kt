package io.github.angularwave.android.navigation.tabs

import androidx.annotation.DrawableRes
import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration

/**
 * Represents a bottom tab used by the [AngularNativeBottomNavigationController].
 *
 * @param itemId The [com.google.android.material.bottomnavigation.BottomNavigationView]'s
 *  menu item ID for the corresponding tab.
 *  @param configuration The [NavigatorConfiguration] for the tab.
 */
data class AngularNativeBottomTab(
    val title: String,
    @DrawableRes val iconResId: Int,
    val isVisible: Boolean = true,
    val configuration: NavigatorConfiguration
)

/**
 * Maps the tabs to a list of their navigator configurations.
 */
val List<AngularNativeBottomTab>.navigatorConfigurations
    get() = map { it.configuration }
