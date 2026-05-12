package dev.hotwire.navigation.bridge

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.TextView
import android.webkit.JavascriptInterface
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.unit.dp
import dev.hotwire.core.turbo.visit.VisitAction
import dev.hotwire.core.turbo.visit.VisitOptions
import dev.hotwire.navigation.R
import dev.hotwire.navigation.destinations.HotwireDestination
import dev.hotwire.navigation.util.colorFromThemeAttr
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.URI
import kotlin.math.roundToInt
import kotlin.random.Random
import com.google.android.material.R as MaterialR

/**
 * JavaScript bridge used by AngularTS micro-apps running inside an Angular Native WebView.
 *
 * AngularTS calls `window.AngularNative.receive(serializedMessage)`. Navigation
 * calls are translated into Android Navigation routes so the native shell can
 * apply Activity/Fragment transitions while the page keeps using AngularTS
 * scopes, directives, and backend-rendered fragments.
 */
class AngularNativeBridge(
    private val destination: HotwireDestination
) {
    private val mountedComponents = mutableMapOf<String, View>()
    private var composeDrawerOverlay: ComposeView? = null

    /**
     * Injects native platform classes and theme tokens into the current WebView document.
     */
    fun injectEnvironment() {
        val environment = createEnvironmentPayload()
        val javascript = """
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
        """.trimIndent()

        destination.navigator.session.webView.post {
            destination.navigator.session.webView.evaluateJavascript(javascript, null)
        }
    }

    /**
     * Receives a serialized AngularTS native call from JavaScript.
     */
    @JavascriptInterface
    fun receive(message: String?) {
        if (message.isNullOrBlank()) return

        val call = try {
            JSONObject(message)
        } catch (_: Exception) {
            return
        }

        val id = call.optString("id", null)
        val target = call.optString("target")
        val method = call.optString("method")

        when (target) {
            "component" -> handleComponentCall(id, method, call.optJSONObject("params"))
            "navigation" -> handleNavigationCall(id, method, call.optJSONObject("params"))
            else -> replyError(id, "Unsupported native target: $target")
        }
    }

    /**
     * Removes native views mounted for the current WebView destination.
     */
    fun unmountAll() {
        runOnUiThread {
            mountedComponents.values.forEach { view ->
                (view.parent as? FrameLayout)?.removeView(view)
            }
            mountedComponents.clear()
            dismissComposeDrawer()
        }
    }

    private fun handleComponentCall(id: String?, method: String, params: JSONObject?) {
        val safeParams = params ?: run {
            replyError(id, "component calls require params.id")

            return
        }

        val componentId = safeParams.optString("id")

        if (componentId.isBlank()) {
            replyError(id, "component calls require params.id")

            return
        }

        when (method) {
            "mount", "update" -> runOnUiThread {
                val container = nativeComponentContainer()

                if (container == null) {
                    replyError(id, "Native component container is unavailable")

                    return@runOnUiThread
                }

                val view = mountedComponents[componentId]
                    ?: createNativeComponentView(safeParams).also {
                        mountedComponents[componentId] = it
                        container.addView(it)
                    }

                updateNativeComponentView(view, safeParams)
                applyComponentRect(view, safeParams.optJSONObject("rect"))
                composeDrawerOverlay?.bringToFront()
                replyOk(
                    id,
                    JSONObject()
                        .put("mounted", true)
                        .put("id", componentId)
                        .put("name", safeParams.optString("name"))
                )
            }
            "unmount" -> runOnUiThread {
                mountedComponents.remove(componentId)?.let { view ->
                    (view.parent as? FrameLayout)?.removeView(view)
                }
                replyOk(id, JSONObject().put("mounted", false).put("id", componentId))
            }
            else -> replyError(id, "Unsupported component method: $method")
        }
    }

    private fun handleNavigationCall(id: String?, method: String, params: JSONObject?) {
        when (method) {
            "back" -> runOnUiThread {
                destination.navigator.pop()
                replyOk(id, JSONObject().put("routed", true).put("action", "back"))
            }
            "visit", "open", "call" -> {
                val url = params?.optString("url").orEmpty()

                if (url.isBlank()) {
                    replyError(id, "navigation.visit requires params.url")

                    return
                }

                val resolvedUrl = resolveUrl(url)
                val action = visitAction(params?.optString("action"))

                runOnUiThread {
                    destination.navigator.route(resolvedUrl, VisitOptions(action = action))
                    replyOk(
                        id,
                        JSONObject()
                            .put("routed", true)
                            .put("url", resolvedUrl)
                            .put("action", action.name.lowercase())
                    )
                }
            }
            else -> replyError(id, "Unsupported navigation method: $method")
        }
    }

    private fun visitAction(action: String?): VisitAction {
        return when (action?.lowercase()) {
            "replace" -> VisitAction.REPLACE
            "restore" -> VisitAction.RESTORE
            else -> VisitAction.ADVANCE
        }
    }

    private fun resolveUrl(url: String): String {
        return try {
            URI(destination.location).resolve(url).toString()
        } catch (_: Exception) {
            url
        }
    }

    private fun createEnvironmentPayload(): JSONObject {
        val context = destination.fragment.requireContext()
        val cssVariables = JSONObject()
            .put("--native-platform", "android")
            .put("--native-bg", colorToCss(context.colorFromThemeAttr(android.R.attr.colorBackground)))
            .put("--native-surface", colorToCss(context.colorFromThemeAttr(MaterialR.attr.colorSurface)))
            .put("--native-ink", colorToCss(context.colorFromThemeAttr(MaterialR.attr.colorOnSurface)))
            .put("--native-accent", colorToCss(context.primaryThemeColor()))
            .put("--native-toolbar-height", "56px")
            .put("--native-safe-area-top", "0px")
            .put("--native-safe-area-bottom", "0px")

        return JSONObject()
            .put("platform", "android")
            .put("location", destination.location)
            .put("cssVariables", cssVariables)
    }

    private fun colorToCss(color: Int): String {
        return "#%02x%02x%02x".format(Color.red(color), Color.green(color), Color.blue(color))
    }

    private fun android.content.Context.primaryThemeColor(): Int {
        val colorPrimary = resources.getIdentifier("colorPrimary", "attr", packageName)
        val attr = if (colorPrimary != 0) colorPrimary else MaterialR.attr.colorSecondary

        return colorFromThemeAttr(attr)
    }

    private fun nativeComponentContainer(): FrameLayout? {
        return destination.fragment.view?.findViewById(R.id.hotwire_view)
    }

    private fun createNativeComponentView(params: JSONObject): View {
        val context = destination.fragment.requireContext()
        val name = params.optString("name")

        if (name == "compose-drawer" || name == "native-card" || name == "native-image") {
            return ComposeView(context).apply {
                setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
            }
        }

        if (name.contains("button", ignoreCase = true)) {
            return MaterialButton(context).apply {
                gravity = Gravity.CENTER
                isAllCaps = false
                minHeight = 0
                minimumHeight = 0
                insetTop = 0
                insetBottom = 0
                setOnClickListener {
                    emitComponentClick(params)
                }
            }
        }

        val radius = 12 * context.resources.displayMetrics.density
        var background = GradientDrawable().apply {
            setColor(context.primaryThemeColor())
            cornerRadius = radius
        }

        return TextView(context).apply {
            gravity = Gravity.CENTER
            setPadding(16, 10, 16, 10)
            setTextColor(context.colorFromThemeAttr(MaterialR.attr.colorOnPrimary))
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            contentDescription = params.optString("name", "Native component")
            elevation = 6 * context.resources.displayMetrics.density
        }
    }

    private fun updateNativeComponentView(view: View, params: JSONObject) {
        val props = params.optJSONObject("props")
        val text = props?.optString("text")?.takeIf { it.isNotBlank() }
            ?: "Hello from native Android"

        when (view) {
            is ComposeView -> {
                view.setContent {
                    when (params.optString("name")) {
                        "compose-drawer" -> AngularNativeDrawerTrigger(params)
                        "native-image" -> AngularNativeImage(params)
                        else -> AngularNativeElevatedCard(params)
                    }
                }
            }
            is MaterialButton -> {
                view.text = text
                view.setOnClickListener {
                    emitComponentClick(params)
                }
            }
            is TextView -> view.text = text
        }
    }

    private fun showComposeDrawer(params: JSONObject) {
        val container = nativeComponentContainer() ?: return

        dismissComposeDrawer()

        composeDrawerOverlay = ComposeView(destination.fragment.requireContext()).apply {
            val overlayElevation = 64 * resources.displayMetrics.density

            isClickable = true
            isFocusable = true
            elevation = overlayElevation
            translationZ = overlayElevation
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
            setContent {
                AngularNativeDrawerOverlay(params)
            }
        }

        container.addView(
            composeDrawerOverlay,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        composeDrawerOverlay?.bringToFront()
        container.invalidate()
    }

    private fun openComposeDrawer(params: JSONObject) {
        nativeComponentContainer()?.post {
            showComposeDrawer(params)
        }
    }

    private fun dismissComposeDrawer() {
        composeDrawerOverlay?.let { overlay ->
            (overlay.parent as? FrameLayout)?.removeView(overlay)
        }
        composeDrawerOverlay = null
    }

    private fun emitComponentClick(params: JSONObject) {
        val payload = JSONObject()
            .put("target", "component")
            .put("event", "click")
            .put(
                "data",
                JSONObject()
                    .put("id", params.optString("id"))
                    .put("name", params.optString("name"))
                    .put("props", params.optJSONObject("props") ?: JSONObject())
            )

        val javascript = "window.angularNative && window.angularNative.dispatch($payload);"

        destination.navigator.session.webView.post {
            destination.navigator.session.webView.evaluateJavascript(javascript, null)
        }
    }

    private fun emitComponentSelect(params: JSONObject, item: NativeDrawerItem) {
        val payload = JSONObject()
            .put("target", "component")
            .put("event", "select")
            .put(
                "data",
                JSONObject()
                    .put("id", params.optString("id"))
                    .put("name", params.optString("name"))
                    .put(
                        "item",
                        JSONObject()
                            .put("label", item.label)
                            .put("route", item.route)
                    )
                    .put("props", params.optJSONObject("props") ?: JSONObject())
            )

        val javascript = "window.angularNative && window.angularNative.dispatch($payload);"

        destination.navigator.session.webView.post {
            destination.navigator.session.webView.evaluateJavascript(javascript, null)
        }
    }

    @Composable
    private fun AngularNativeDrawerTrigger(params: JSONObject) {
        val props = params.optJSONObject("props") ?: JSONObject()
        val label = props.optString("text").takeIf { it.isNotBlank() } ?: "Open drawer"

        MaterialTheme {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp)
            ) {
                Button(
                    onClick = { openComposeDrawer(params) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(label)
                }
            }
        }
    }

    @Composable
    private fun AngularNativeDrawerOverlay(params: JSONObject) {
        val props = params.optJSONObject("props") ?: JSONObject()
        val items = drawerItems(props)
        val drawerState = rememberDrawerState(initialValue = DrawerValue.Open)
        val scope = rememberCoroutineScope()

        LaunchedEffect(Unit) {
            drawerState.open()
        }

        LaunchedEffect(drawerState) {
            snapshotFlow { drawerState.currentValue }.collect { value ->
                if (value == DrawerValue.Closed) dismissComposeDrawer()
            }
        }

        MaterialTheme {
            ModalNavigationDrawer(
                drawerState = drawerState,
                gesturesEnabled = true,
                drawerContent = {
                    ModalDrawerSheet {
                        Text(
                            text = props.optString("title").takeIf { it.isNotBlank() }
                                ?: "Native drawer",
                            modifier = Modifier.padding(16.dp)
                        )
                        items.forEach { item ->
                            NavigationDrawerItem(
                                label = { Text(item.label) },
                                selected = false,
                                onClick = {
                                    scope.launch {
                                        drawerState.close()
                                        dismissComposeDrawer()
                                        emitComponentSelect(params, item)
                                    }
                                },
                                modifier = Modifier.padding(horizontal = 12.dp)
                            )
                        }
                    }
                }
            ) {
                Column(modifier = Modifier.fillMaxSize()) {}
            }
        }
    }

    @Composable
    private fun AngularNativeElevatedCard(params: JSONObject) {
        val props = params.optJSONObject("props") ?: JSONObject()
        val title = props.optString("title").takeIf { it.isNotBlank() }
            ?: "Native card"
        val subtitle = props.optString("subtitle").takeIf { it.isNotBlank() }
            ?: "Rendered by Jetpack Compose from AngularTS markup."
        val imageProps = props.optJSONObject("image")
        val seed = params.optString("id", title)
        val image = remember(seed) {
            randomCardBitmap(seed).asImageBitmap()
        }

        MaterialTheme {
            ElevatedCard(
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp)
            ) {
                imageProps?.let {
                    val imageHeight = it.optDouble("height", 132.0)
                        .takeIf { height -> height > 0.0 }
                        ?: 132.0

                    Image(
                        bitmap = image,
                        contentDescription = it.optString("contentDescription")
                            .takeIf { description -> description.isNotBlank() }
                            ?: title,
                        contentScale = contentScale(it.optString("contentScale")),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(imageHeight.toFloat().dp)
                    )
                }
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium
                    )
                    Text(
                        text = subtitle,
                        modifier = Modifier.padding(top = 6.dp),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }

    @Composable
    private fun AngularNativeImage(params: JSONObject) {
        val props = params.optJSONObject("props") ?: JSONObject()
        val seed = params.optString("id", "native-image")
        val image = remember(seed) {
            randomCardBitmap(seed).asImageBitmap()
        }

        Image(
            bitmap = image,
            contentDescription = props.optString("contentDescription")
                .takeIf { it.isNotBlank() }
                ?: "Native image",
            contentScale = contentScale(props.optString("contentScale")),
            modifier = Modifier
                .fillMaxSize()
                .height(props.optDouble("height", 160.0).toFloat().dp)
        )
    }

    private fun contentScale(value: String): ContentScale {
        return when (value.lowercase()) {
            "fit" -> ContentScale.Fit
            "fillbounds", "fill-bounds" -> ContentScale.FillBounds
            "fillheight", "fill-height" -> ContentScale.FillHeight
            "fillwidth", "fill-width" -> ContentScale.FillWidth
            "inside" -> ContentScale.Inside
            "none" -> ContentScale.None
            else -> ContentScale.Crop
        }
    }

    private fun drawerItems(props: JSONObject): List<NativeDrawerItem> {
        val values = props.optJSONArray("items") ?: return listOf("Refresh from server")
            .map { NativeDrawerItem(label = it) }

        return buildList {
            for (index in 0 until values.length()) {
                val value = values.opt(index)

                when (value) {
                    is JSONObject -> {
                        val label = value.optString("label")
                            .takeIf { it.isNotBlank() }
                            ?: value.optString("title")
                                .takeIf { it.isNotBlank() }

                        if (label != null) {
                            add(
                                NativeDrawerItem(
                                    label = label,
                                    route = value.optString("route")
                                        .takeIf { it.isNotBlank() }
                                        ?: value.optString("path")
                                            .takeIf { it.isNotBlank() }
                                )
                            )
                        }
                    }
                    else -> values.optString(index).takeIf { it.isNotBlank() }?.let {
                        add(NativeDrawerItem(label = it))
                    }
                }
            }
        }.ifEmpty { listOf(NativeDrawerItem(label = "Refresh from server")) }
    }

    private fun randomCardBitmap(seed: String): Bitmap {
        val width = 720
        val height = 420
        val random = Random(seed.hashCode())
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val startColor = Color.rgb(
            random.nextInt(32, 220),
            random.nextInt(64, 230),
            random.nextInt(80, 240)
        )
        val endColor = Color.rgb(
            random.nextInt(32, 220),
            random.nextInt(64, 230),
            random.nextInt(80, 240)
        )

        paint.shader = LinearGradient(
            0f,
            0f,
            width.toFloat(),
            height.toFloat(),
            startColor,
            endColor,
            Shader.TileMode.CLAMP
        )
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
        paint.shader = null

        repeat(7) {
            paint.color = Color.argb(
                random.nextInt(80, 170),
                random.nextInt(20, 255),
                random.nextInt(20, 255),
                random.nextInt(20, 255)
            )
            canvas.drawCircle(
                random.nextInt(width).toFloat(),
                random.nextInt(height).toFloat(),
                random.nextInt(56, 150).toFloat(),
                paint
            )
        }

        return bitmap
    }

    private fun applyComponentRect(view: View, rect: JSONObject?) {
        if (rect == null) return

        val scale = destination.navigator.session.webView.scale
        val width = (rect.optDouble("width") * scale).roundToInt().coerceAtLeast(1)
        val height = (rect.optDouble("height") * scale).roundToInt().coerceAtLeast(1)
        val left = (rect.optDouble("x") * scale).roundToInt()
        val top = (rect.optDouble("y") * scale).roundToInt()

        view.layoutParams = FrameLayout.LayoutParams(width, height)
        view.x = left.toFloat()
        view.y = top.toFloat()
    }

    private fun runOnUiThread(block: () -> Unit) {
        destination.fragment.requireActivity().runOnUiThread(block)
    }

    private fun replyOk(id: String?, result: JSONObject) {
        reply(id, JSONObject().put("id", id).put("ok", true).put("result", result))
    }

    private fun replyError(id: String?, message: String) {
        reply(id, JSONObject().put("id", id).put("ok", false).put("error", message))
    }

    private fun reply(id: String?, payload: JSONObject) {
        if (id.isNullOrBlank()) return

        val javascript = "window.angularNative && window.angularNative.receive($payload);"

        destination.navigator.session.webView.post {
            destination.navigator.session.webView.evaluateJavascript(javascript, null)
        }
    }

    private data class NativeDrawerItem(
        val label: String,
        val route: String? = null
    )
}
