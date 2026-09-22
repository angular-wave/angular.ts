package io.github.angularwave.android.navigation.navigator

import androidx.annotation.IdRes

data class NavigatorConfiguration(
    val name: String,
    val startLocation: String,
    @param:IdRes val navigatorHostId: Int,
)
