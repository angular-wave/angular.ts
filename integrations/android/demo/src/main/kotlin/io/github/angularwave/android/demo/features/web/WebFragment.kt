package io.github.angularwave.android.demo.features.web

import android.os.Bundle
import android.view.MenuItem
import android.view.View
import io.github.angularwave.android.core.turbo.errors.HttpError
import io.github.angularwave.android.core.turbo.errors.VisitError
import io.github.angularwave.android.core.turbo.visit.VisitAction.REPLACE
import io.github.angularwave.android.core.turbo.visit.VisitOptions
import io.github.angularwave.android.demo.R
import io.github.angularwave.android.navigation.destinations.AngularNativeDestinationDeepLink
import io.github.angularwave.android.navigation.fragments.AngularNativeWebFragment

@AngularNativeDestinationDeepLink(uri = "angularNative://fragment/web")
open class WebFragment : AngularNativeWebFragment() {
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupMenu()
    }

    override fun onFormSubmissionStarted(location: String) {
        menuProgress?.isVisible = true
    }

    override fun onFormSubmissionFinished(location: String) {
        menuProgress?.isVisible = false
    }

    private fun setupMenu() {
        toolbarForNavigation()?.inflateMenu(R.menu.web)
    }

    private val menuProgress: MenuItem?
        get() = toolbarForNavigation()?.menu?.findItem(R.id.menu_progress)
}
