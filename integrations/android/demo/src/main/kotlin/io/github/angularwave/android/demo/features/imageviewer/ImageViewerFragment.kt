package io.github.angularwave.android.demo.features.imageviewer

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.core.view.WindowCompat
import coil.load
import io.github.angularwave.android.core.turbo.util.isNightModeEnabled
import io.github.angularwave.android.demo.R
import io.github.angularwave.android.navigation.destinations.AngularNativeDestinationDeepLink
import io.github.angularwave.android.navigation.fragments.AngularNativeFragment
import io.github.angularwave.android.navigation.util.displayBackButtonAsCloseIcon

@AngularNativeDestinationDeepLink(uri = "angularNative://fragment/image_viewer")
class ImageViewerFragment : AngularNativeFragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_image_viewer, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        initToolbar()
        loadImage(view)
    }

    private fun initToolbar() {
        toolbarForNavigation()?.displayBackButtonAsCloseIcon()
    }

    private fun loadImage(view: View) {
        view.findViewById<ImageView>(R.id.image_view)?.load(location)
    }

    override fun onStart() {
        super.onStart()

        val window = requireActivity().window
        WindowCompat.getInsetsController(window, window.decorView)
            .isAppearanceLightStatusBars = false
    }

    override fun onStop() {
        super.onStop()

        val window = requireActivity().window
        WindowCompat.getInsetsController(window, window.decorView)
            .isAppearanceLightStatusBars = !requireContext().isNightModeEnabled
    }
}
