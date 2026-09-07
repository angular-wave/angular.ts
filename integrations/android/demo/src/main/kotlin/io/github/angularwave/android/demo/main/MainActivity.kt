package io.github.angularwave.android.demo.main

import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.google.android.material.bottomnavigation.BottomNavigationView
import io.github.angularwave.android.core.turbo.webview.WebViewInfo
import io.github.angularwave.android.core.turbo.webview.WebViewVersionCompatibility
import io.github.angularwave.android.demo.R
import io.github.angularwave.android.navigation.activities.AngularNativeActivity
import io.github.angularwave.android.navigation.tabs.AngularNativeBottomNavigationController
import io.github.angularwave.android.navigation.tabs.navigatorConfigurations
import io.github.angularwave.android.navigation.util.applyDefaultImeWindowInsets

class MainActivity : AngularNativeActivity() {
    private lateinit var bottomNavigationController: AngularNativeBottomNavigationController
    private val viewModel: MainActivityViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_main)
        findViewById<View>(R.id.root).applyDefaultImeWindowInsets()

        initializeBottomTabs()

        WebViewVersionCompatibility.displayUpdateDialogIfOutdated(
            activity = this,
            requiredVersion = WebViewInfo.REQUIRED_WEBVIEW_VERSION
        )
    }

    private fun initializeBottomTabs() {
        val bottomNavigationView = findViewById<BottomNavigationView>(R.id.bottom_nav)

        bottomNavigationController = AngularNativeBottomNavigationController(this, bottomNavigationView)
        bottomNavigationController.load(mainTabs, viewModel.selectedTabIndex)
        bottomNavigationController.setOnTabSelectedListener { index, _ ->
            viewModel.selectedTabIndex = index
        }
    }

    override fun navigatorConfigurations() = mainTabs.navigatorConfigurations
}
