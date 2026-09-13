package io.github.angularwave.android.navigation.bridge

import android.graphics.Color
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.compose.foundation.layout.height
import com.google.android.material.R as MaterialR
import io.github.angularwave.android.navigation.R
import io.github.angularwave.android.navigation.destinations.AngularNativeDestination
import io.github.angularwave.android.navigation.elements.AndroidNativeElements
import io.github.angularwave.android.navigation.elements.JSONObjectProperties
import io.github.angularwave.android.navigation.elements.NativeElementActivityLauncher
import io.github.angularwave.android.navigation.elements.NativeElementContext
import io.github.angularwave.android.navigation.elements.NativeElementException
import io.github.angularwave.android.navigation.util.colorFromThemeAttr
import io.github.angularwave.android.navigation.views.AngularNativeView
import java.lang.ref.WeakReference
import java.util.WeakHashMap
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.roundToInt
import org.json.JSONObject

/**
 * JavaScript bridge used by AngularTS micro-apps running inside an Angular Native WebView.
 *
 * AngularTS calls `window.AngularNative.receive(serializedMessage)`. Navigation calls are
 * translated into Android Navigation routes so the native shell can apply Activity/Fragment
 * transitions while the page keeps using AngularTS scopes, directives, and backend-rendered
 * fragments.
 */
class AngularNativeBridge(private val destination: AngularNativeDestination) {
    private val activeReplies = ConcurrentHashMap<String, BridgeReply>()
    private val mountedComponents = mutableMapOf<String, View>()
    @Volatile private var documentLocation: String? = destination.location
    private val restoredComponentStates by lazy {
        destination.fragment.savedStateRegistry.consumeRestoredStateForKey(COMPONENT_STATE_KEY)
            ?: android.os.Bundle()
    }
    private var componentStateRegistered = false
    private val nativeElementRegistry = AndroidNativeElements.registry
    private val capabilitiesLock = Any()
    @Volatile private var capabilitiesDelegate: AndroidNativeCapabilities? = null
    private val capabilities: AndroidNativeCapabilities
        get() =
            capabilitiesDelegate
                ?: synchronized(capabilitiesLock) {
                    capabilitiesDelegate
                        ?: AndroidNativeCapabilities(
                                destination,
                                eventSink = NativeCapabilityEventSink(::emitNativeCapabilityEvent),
                            )
                            .also { capabilitiesDelegate = it }
                }

    private val security by lazy { AngularNativeBridgeSecurity(destination.location) }

    /** Binds this destination to the stable JavaScript interface retained by the shared WebView. */
    internal fun attachTo(webView: WebView) {
        synchronized(activeBridges) {
            activeBridges[webView] = WeakReference(this)
        }
        webView.addJavascriptInterface(this, JAVASCRIPT_INTERFACE)
    }

    /** Injects native platform classes and theme tokens into the current WebView document. */
    fun injectEnvironment() {
        val environment = createEnvironmentPayload()
        val javascript =
            """
            (function() {
              var environment = $environment;
              var root = document.documentElement;
              if (!root) return;
              root.classList.remove("platform-web");
              root.classList.add("platform-android", "native-shell");
              Object.keys(environment.cssVariables).forEach(function(name) {
                root.style.setProperty(name, environment.cssVariables[name]);
              });
              window.angularNativeEnvironment = environment;
              window.dispatchEvent(new CustomEvent("ng:native:environment", {
                detail: environment
              }));
            })();
        """
                .trimIndent()

        val webView = destination.navigator.session.webView
        webView.post {
            documentLocation = webView.url
            webView.evaluateJavascript(javascript, null)
        }
    }

    /** Receives a serialized AngularTS native call from JavaScript. */
    @JavascriptInterface
    fun receive(message: String?) {
        val webView = destination.navigator.session.webView
        val activeBridge =
            synchronized(activeBridges) { activeBridges[webView]?.get() }
                ?.takeIf { it.destination.isActive }
        if (activeBridge != null && activeBridge !== this) {
            activeBridge.receiveCurrent(message)
            return
        }
        receiveCurrent(message)
    }

    private fun receiveCurrent(message: String?) {
        when (val parsed = NativeBridgeProtocol.parse(message)) {
            is NativeBridgeProtocol.ParseResult.Failure -> {
                parsed.id?.let { replyError(it, parsed.code, parsed.message) }
                return
            }
            is NativeBridgeProtocol.ParseResult.Success -> dispatch(parsed.request)
        }
    }

    // This protocol boundary must turn every recoverable guest/runtime exception into a reply.
    @Suppress("TooGenericExceptionCaught")
    private fun dispatch(call: NativeBridgeProtocol.Request) {
        val reply = BridgeReply(call.id)
        if (activeReplies.putIfAbsent(call.id, reply) != null) {
            replyError(
                call.id,
                NativeBridgeProtocol.ErrorCode.INVALID_MESSAGE,
                "Native request id is already active",
            )
            return
        }
        if (
            !security.accepts(
                call.session,
                documentLocation,
            )
        ) {
            reply.error(
                NativeBridgeProtocol.ErrorCode.UNAUTHORIZED,
                "Native session or origin is invalid",
            )
            return
        }

        try {
            when (call.target) {
                "bridge" -> handleBridgeCall(reply, call.method, call.params)
                "component" -> handleComponentCall(reply, call.method, call.params)
                in capabilities.targets ->
                    runOnUiThread(reply) {
                        if (
                            !capabilities.invokeAsync(
                                call.target,
                                call.method,
                                call.params,
                                reply::ok,
                                reply::failure,
                                reply::cancelWith,
                            )
                        ) {
                            reply.ok(capabilities.invoke(call.target, call.method, call.params))
                        }
                    }
                else ->
                    reply.error(
                        NativeBridgeProtocol.ErrorCode.UNKNOWN_TARGET,
                        "Unsupported native target: ${call.target}",
                    )
            }
        } catch (error: Exception) {
            reply.failure(error)
        }
    }

    /** Removes native views mounted for the current WebView destination. */
    fun unmountAll() {
        activeReplies.values.toList().forEach {
            it.error(NativeBridgeProtocol.ErrorCode.INTERRUPTED, "Native destination was removed")
        }
        synchronized(capabilitiesLock) {
                capabilitiesDelegate.also { capabilitiesDelegate = null }
            }
            ?.close()
        runOnUiThread {
            mountedComponents.values.forEach { view ->
                nativeElementRegistry.dispose(view)
                (view.parent as? FrameLayout)?.removeView(view)
            }
            mountedComponents.clear()
            if (componentStateRegistered) {
                destination.fragment.savedStateRegistry.unregisterSavedStateProvider(
                    COMPONENT_STATE_KEY
                )
                componentStateRegistered = false
            }
        }
    }

    private fun handleBridgeCall(reply: BridgeReply, method: String, params: JSONObject?) {
        if (method != "cancel") {
            reply.error(
                NativeBridgeProtocol.ErrorCode.UNKNOWN_METHOD,
                "Unsupported bridge method: $method",
            )
            return
        }

        val requestId = params?.optString("id").orEmpty()
        if (requestId.isBlank()) {
            reply.error(
                NativeBridgeProtocol.ErrorCode.INVALID_PARAMS,
                "bridge.cancel requires params.id",
            )
            return
        }

        val cancelled = activeReplies[requestId]
        cancelled?.error(NativeBridgeProtocol.ErrorCode.CANCELLED, "Native request was cancelled")
        reply.ok(JSONObject().put("id", requestId).put("cancelled", cancelled != null))
    }

    private fun handleComponentCall(reply: BridgeReply, method: String, params: JSONObject?) {
        val safeParams =
            params
                ?: run {
                    reply.error(
                        NativeBridgeProtocol.ErrorCode.INVALID_PARAMS,
                        "component calls require params.id",
                    )

                    return
                }

        val componentId = safeParams.optString("id")

        if (componentId.isBlank()) {
            reply.error(
                NativeBridgeProtocol.ErrorCode.INVALID_PARAMS,
                "component calls require params.id",
            )

            return
        }

        when (method) {
            "mount" ->
                runOnUiThread(reply) {
                    registerComponentStateProvider()
                    val container = nativeComponentContainer()

                    if (container == null) {
                        reply.error(
                            NativeBridgeProtocol.ErrorCode.INTERNAL,
                            "Native component container is unavailable",
                        )

                        return@runOnUiThread
                    }

                    val view =
                        mountedComponents[componentId]
                            ?: createNativeComponentView(safeParams).also {
                                mountedComponents[componentId] = it
                                mountCloaked(container, it) {
                                    destination.fragment.view
                                        ?.findViewById<AngularNativeView>(R.id.angular_native_view)
                                        ?.apply {
                                            removeProgressView()
                                            removeScreenshot()
                                        }
                                }
                                restoredComponentStates.getBundle(componentId)?.let { state ->
                                    nativeElementRegistry.restoreState(it, state)
                                }
                            }

                    updateNativeComponentView(view, safeParams)
                    applyComponentRect(view, safeParams.optJSONObject("rect"))
                    reply.ok(
                        JSONObject()
                            .put("mounted", true)
                            .put("id", componentId)
                            .put("name", safeParams.optString("name"))
                    )
                }
            "update" ->
                runOnUiThread(reply) {
                    val view =
                        mountedComponents[componentId]
                            ?: run {
                                reply.error(
                                    NativeBridgeProtocol.ErrorCode.UNKNOWN_INSTANCE,
                                    "Unknown native component instance: $componentId",
                                )
                                return@runOnUiThread
                            }
                    updateNativeComponentView(view, safeParams)
                    applyComponentRect(view, safeParams.optJSONObject("rect"))
                    reply.ok(JSONObject().put("mounted", true).put("id", componentId))
                }
            "invoke" ->
                runOnUiThread(reply) {
                    val view =
                        mountedComponents[componentId]
                            ?: run {
                                reply.error(
                                    NativeBridgeProtocol.ErrorCode.UNKNOWN_INSTANCE,
                                    "Unknown native component instance: $componentId",
                                )
                                return@runOnUiThread
                            }
                    val operation = safeParams.optString("method")
                    if (operation.isBlank()) {
                        reply.error(
                            NativeBridgeProtocol.ErrorCode.INVALID_PARAMS,
                            "component.invoke requires params.method",
                        )
                        return@runOnUiThread
                    }
                    val result =
                        nativeElementRegistry.invoke(
                            view,
                            operation,
                            JSONObjectProperties(safeParams.optJSONObject("args") ?: JSONObject()),
                        )
                    reply.ok(JSONObject().put("id", componentId).put("result", result))
                }
            "unmount" ->
                runOnUiThread(reply) {
                    restoredComponentStates.remove(componentId)
                    mountedComponents.remove(componentId)?.let { view ->
                        nativeElementRegistry.dispose(view)
                        (view.parent as? FrameLayout)?.removeView(view)
                    }
                    reply.ok(JSONObject().put("mounted", false).put("id", componentId))
                }
            else ->
                reply.error(
                    NativeBridgeProtocol.ErrorCode.UNKNOWN_METHOD,
                    "Unsupported component method: $method",
                )
        }
    }

    private fun createEnvironmentPayload(): JSONObject {
        val context = destination.fragment.requireContext()
        val cssVariables =
            JSONObject()
                .put("--native-platform", "android")
                .put(
                    "--native-bg",
                    colorToCss(context.colorFromThemeAttr(android.R.attr.colorBackground)),
                )
                .put(
                    "--native-surface",
                    colorToCss(context.colorFromThemeAttr(MaterialR.attr.colorSurface)),
                )
                .put(
                    "--native-ink",
                    colorToCss(context.colorFromThemeAttr(MaterialR.attr.colorOnSurface)),
                )
                .put("--native-accent", colorToCss(context.primaryThemeColor()))
                .put("--native-toolbar-height", "56px")
                .put("--native-safe-area-top", "0px")
                .put("--native-safe-area-bottom", "0px")

        return JSONObject()
            .put("platform", "android")
            .put("location", destination.location)
            .put("session", security.sessionToken)
            .put("protocolVersion", NativeBridgeProtocol.VERSION)
            .put("maxMessageBytes", NativeBridgeProtocol.MAX_MESSAGE_BYTES)
            .put("capabilities", createCapabilitiesPayload())
            .put("cssVariables", cssVariables)
    }

    private fun createCapabilitiesPayload(): JSONObject {
        val platformCapabilities = capabilities.describe()
        return JSONObject()
            .put("component", org.json.JSONArray(listOf("mount", "update", "invoke", "unmount")))
            .apply {
                platformCapabilities.keys().forEach { target ->
                    put(target, platformCapabilities.getJSONArray(target))
                }
            }
            .put(
                "elements",
                org.json.JSONArray(nativeElementRegistry.definitions.map { it.name }),
            )
    }

    private fun colorToCss(color: Int): String {
        return "#%02x%02x%02x".format(Color.red(color), Color.green(color), Color.blue(color))
    }

    private fun android.content.Context.primaryThemeColor(): Int {
        return colorFromThemeAttr(androidx.appcompat.R.attr.colorPrimary)
    }

    private fun nativeComponentContainer(): FrameLayout? {
        return destination.fragment.view?.findViewById(R.id.angular_native_view)
    }

    private fun registerComponentStateProvider() {
        if (componentStateRegistered) return
        destination.fragment.savedStateRegistry.registerSavedStateProvider(COMPONENT_STATE_KEY) {
            android.os.Bundle().apply {
                mountedComponents.forEach { (id, view) ->
                    nativeElementRegistry.saveState(view)?.let { putBundle(id, it) }
                }
            }
        }
        componentStateRegistered = true
    }

    private fun createNativeComponentView(params: JSONObject): View {
        val fragment = destination.fragment
        val properties = params.optJSONObject("props") ?: JSONObject()
        return nativeElementRegistry.create(
            params.optString("name"),
            NativeElementContext(
                context = fragment.requireContext(),
                container = nativeComponentContainer(),
                lifecycleOwner = fragment,
                savedStateOwner = fragment,
                events = { event, data -> emitNativeElementEvent(params, event, data) },
                activityLauncher =
                    object : NativeElementActivityLauncher {
                        override fun launch(
                            intent: android.content.Intent,
                            result: (Int, android.content.Intent?) -> Unit,
                        ): Boolean = destination.launchNativeActivity(intent, result)

                        override fun cancel() = destination.cancelNativeActivity()
                    },
            ),
            JSONObjectProperties(properties),
        )
    }

    private fun updateNativeComponentView(view: View, params: JSONObject) {
        nativeElementRegistry.update(
            view,
            JSONObjectProperties(params.optJSONObject("props") ?: JSONObject()),
        )
    }

    private fun emitNativeElementEvent(
        params: JSONObject,
        event: String,
        data: JSONObject?,
    ) {
        val eventData =
            JSONObject().put("id", params.optString("id")).put("name", params.optString("name"))

        data?.keys()?.forEach { key -> eventData.put(key, data.opt(key)) }

        emitNativeEvent("component", event, eventData)
    }

    private fun emitNativeCapabilityEvent(target: String, event: String, data: JSONObject?) {
        emitNativeEvent(target, event, data)
    }

    private fun emitNativeEvent(target: String, event: String, data: JSONObject?) {
        if (!destination.isActive) return

        val payload =
            JSONObject()
                .put("protocol", NativeBridgeProtocol.VERSION)
                .put("target", target)
                .put("event", event)
                .put("data", data ?: JSONObject.NULL)
        val javascript = "window.angularNative && window.angularNative.receive($payload);"
        val webView = destination.navigator.session.webView

        webView.post {
            if (destination.isActive) {
                webView.evaluateJavascript(javascript, null)
            }
        }
    }

    private fun applyComponentRect(view: View, rect: JSONObject?) {
        if (rect == null) return

        val scale = destination.navigator.session.webView.resources.displayMetrics.density
        val width = (rect.optDouble("width") * scale).roundToInt().coerceAtLeast(1)
        val height = (rect.optDouble("height") * scale).roundToInt().coerceAtLeast(1)
        val left = (rect.optDouble("x") * scale).roundToInt()
        val top = (rect.optDouble("y") * scale).roundToInt()

        view.layoutParams = FrameLayout.LayoutParams(width, height)
        view.x = left.toFloat()
        view.y = top.toFloat()
    }

    // This asynchronous protocol boundary must not strand an active request without a reply.
    @Suppress("TooGenericExceptionCaught")
    private fun runOnUiThread(reply: BridgeReply, block: () -> Unit) {
        destination.fragment.requireActivity().runOnUiThread {
            if (reply.isCompleted) return@runOnUiThread
            try {
                block()
            } catch (error: Exception) {
                reply.failure(error)
            }
        }
    }

    private fun runOnUiThread(block: () -> Unit) {
        destination.fragment.requireActivity().runOnUiThread(block)
    }

    internal fun replyError(id: String, code: NativeBridgeProtocol.ErrorCode, message: String) {
        reply(
            JSONObject()
                .put("protocol", NativeBridgeProtocol.VERSION)
                .put("id", id)
                .put("ok", false)
                .put("error", JSONObject().put("code", code.value).put("message", message))
        )
    }

    internal fun reply(payload: JSONObject) {
        val javascript = "window.angularNative && window.angularNative.receive($payload);"

        destination.navigator.session.webView.post {
            destination.navigator.session.webView.evaluateJavascript(javascript, null)
        }
    }

    private inner class BridgeReply(private val id: String) {
        private val completed = AtomicBoolean(false)
        private var cancellation: (() -> Unit)? = null

        val isCompleted: Boolean
            get() = completed.get()

        private fun complete(block: () -> Unit) {
            if (!completed.compareAndSet(false, true)) return
            activeReplies.remove(id, this)
            cancellation = null
            block()
        }

        fun cancelWith(action: () -> Unit) {
            if (!isCompleted) cancellation = action
        }

        fun ok(result: Any?) {
            complete {
                reply(
                    JSONObject()
                        .put("protocol", NativeBridgeProtocol.VERSION)
                        .put("id", id)
                        .put("ok", true)
                        .put("result", result)
                )
            }
        }

        fun error(code: NativeBridgeProtocol.ErrorCode, message: String) {
            if (
                !isCompleted &&
                    code in
                        setOf(
                            NativeBridgeProtocol.ErrorCode.CANCELLED,
                            NativeBridgeProtocol.ErrorCode.INTERRUPTED,
                        )
            ) {
                cancellation?.invoke()
            }
            complete { replyError(id, code, message) }
        }

        fun failure(error: Exception) {
            if (error is NativeElementException) {
                val code =
                    when (error.code) {
                        NativeElementException.Code.INVALID_PROPERTY ->
                            NativeBridgeProtocol.ErrorCode.INVALID_PROPERTY
                        NativeElementException.Code.UNKNOWN_ELEMENT ->
                            NativeBridgeProtocol.ErrorCode.UNKNOWN_ELEMENT
                        NativeElementException.Code.UNKNOWN_INSTANCE ->
                            NativeBridgeProtocol.ErrorCode.UNKNOWN_INSTANCE
                        NativeElementException.Code.UNKNOWN_METHOD ->
                            NativeBridgeProtocol.ErrorCode.UNKNOWN_METHOD
                    }
                error(code, error.message ?: "Native element operation failed")
            } else if (error is NativeCapabilityException) {
                error(error.code, error.message ?: "Native capability operation failed")
            } else {
                error(NativeBridgeProtocol.ErrorCode.INTERNAL, "Native operation failed")
            }
        }
    }

    private companion object {
        const val COMPONENT_STATE_KEY = "angular-native-components"
        const val JAVASCRIPT_INTERFACE = "AngularNative"
        val activeBridges = WeakHashMap<WebView, WeakReference<AngularNativeBridge>>()
    }
}
