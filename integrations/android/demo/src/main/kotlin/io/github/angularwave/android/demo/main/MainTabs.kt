package io.github.angularwave.android.demo.main

import io.github.angularwave.android.demo.Demo
import io.github.angularwave.android.demo.R
import io.github.angularwave.android.navigation.navigator.NavigatorConfiguration
import io.github.angularwave.android.navigation.tabs.AngularNativeBottomTab

private val nativeDemoUrl = "${Demo.current.url}/src/services/native/native-demo.html"

private val navigation = AngularNativeBottomTab(
    title = "AngularTS Native",
    iconResId = R.drawable.ic_tab_navigation,
    configuration = NavigatorConfiguration(
        name = "navigation",
        navigatorHostId = R.id.navigation_navigator_host,
        startLocation = nativeDemoUrl
    )
)

private val bridgeComponents = AngularNativeBottomTab(
    title = "Bridge Components",
    iconResId = R.drawable.ic_tab_bridge_components,
    configuration = NavigatorConfiguration(
        name = "bridge-components",
        navigatorHostId = R.id.bridge_components_navigator_host,
        startLocation = "${Demo.current.url}/components"
    )
)

private val resources = AngularNativeBottomTab(
    title = "Resources",
    iconResId = R.drawable.ic_tab_resources,
    configuration = NavigatorConfiguration(
        name = "resources",
        navigatorHostId = R.id.resources_navigator_host,
        startLocation = "${Demo.current.url}/resources"
    )
)

private val bugsAndFixes = AngularNativeBottomTab(
    title = "Bugs & Fixes",
    iconResId = R.drawable.ic_tab_bugs_fixes,
    isVisible = Demo.current == Demo.Environment.Local,
    configuration = NavigatorConfiguration(
        name = "bugs-fixes",
        navigatorHostId = R.id.bugs_fixes_navigator_host,
        startLocation = "${Demo.current.url}/bugs"
    )
)

val mainTabs = listOf(
    navigation,
    bridgeComponents,
    resources,
    bugsAndFixes
)
