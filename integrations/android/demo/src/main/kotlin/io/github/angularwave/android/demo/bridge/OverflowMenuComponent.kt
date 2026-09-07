package io.github.angularwave.android.demo.bridge

import android.util.Log
import androidx.appcompat.widget.Toolbar
import androidx.fragment.app.Fragment
import io.github.angularwave.android.core.bridge.BridgeComponent
import io.github.angularwave.android.core.bridge.BridgeDelegate
import io.github.angularwave.android.core.bridge.Message
import io.github.angularwave.android.demo.R
import io.github.angularwave.android.navigation.destinations.AngularNativeDestination
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Bridge component to display a native 3-dot menu in the toolbar, which
 * will will notify the web when it has been tapped.
 */
class OverflowMenuComponent(
    name: String,
    private val delegate: BridgeDelegate<AngularNativeDestination>
) : BridgeComponent<AngularNativeDestination>(name, delegate) {

    private val fragment: Fragment
        get() = delegate.destination.fragment
    private val toolbar: Toolbar?
        get() = fragment.view?.findViewById(R.id.toolbar)

    override fun onReceive(message: Message) {
        when (message.event) {
            "connect" -> handleConnectEvent(message)
            else -> Log.w("OverflowMenuComponent", "Unknown event for message: $message")
        }
    }

    private fun handleConnectEvent(message: Message) {
        val data = message.data<MessageData>() ?: return
        showOverflowMenuItem(data)
    }

    private fun showOverflowMenuItem(data: MessageData) {
        val toolbar = toolbar ?: return

        toolbar.menu.findItem(R.id.overflow)?.apply {
            isVisible = true
            title = data.label
        }

        toolbar.setOnMenuItemClickListener {
            when (it.itemId) {
                R.id.overflow -> {
                    performClick()
                    true
                }
                else -> false
            }
        }
    }

    private fun performClick() {
        replyTo("connect")
    }

    @Serializable
    data class MessageData(
        @SerialName("label") val label: String
    )
}
