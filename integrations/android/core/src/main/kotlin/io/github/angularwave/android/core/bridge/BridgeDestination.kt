package io.github.angularwave.android.core.bridge

interface BridgeDestination {
    fun bridgeWebViewIsReady(): Boolean
    fun onBridgeComponentInitialized(component: BridgeComponent<*>) {}
}
