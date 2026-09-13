package io.github.angularwave.android.navigation.navigator

import androidx.fragment.app.Fragment
import androidx.fragment.app.FragmentManager

/** Keeps AndroidX back dispatch attached to the navigator selected by Angular Native. */
internal class PrimaryNavigationSelector(private val fragmentManager: FragmentManager) {
    val selected: Fragment?
        get() = fragmentManager.primaryNavigationFragment

    fun select(fragment: Fragment?) {
        if (fragmentManager.isDestroyed || selected === fragment) return
        fragmentManager.beginTransaction().setPrimaryNavigationFragment(fragment).commit()
    }
}
