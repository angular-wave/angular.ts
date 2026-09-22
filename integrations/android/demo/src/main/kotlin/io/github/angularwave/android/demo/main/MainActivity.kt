package io.github.angularwave.android.demo.main

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.Debug
import android.os.Trace
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebView
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewClientCompat
import com.google.android.material.bottomnavigation.BottomNavigationView
import io.github.angularwave.android.core.ng.webview.AngularNativeWebView
import io.github.angularwave.android.core.ng.webview.WebViewInfo
import io.github.angularwave.android.core.ng.webview.WebViewVersionCompatibility
import io.github.angularwave.android.demo.R
import io.github.angularwave.android.navigation.activities.AngularNativeActivity
import io.github.angularwave.android.navigation.elements.AndroidNativeElements
import io.github.angularwave.android.navigation.elements.JSONObjectProperties
import io.github.angularwave.android.navigation.elements.NativeElementContext
import io.github.angularwave.android.navigation.tabs.AngularNativeBottomNavigationController
import io.github.angularwave.android.navigation.tabs.navigatorConfigurations
import io.github.angularwave.android.navigation.util.applyDefaultImeWindowInsets
import org.json.JSONArray
import org.json.JSONObject

open class MainActivity : AngularNativeActivity() {
    private lateinit var bottomNavigationController: AngularNativeBottomNavigationController
    private val viewModel: MainActivityViewModel by viewModels()
    private var benchmarkWebView: AngularNativeWebView? = null
    protected open val benchmarkMode = BenchmarkMode.NONE

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        when (benchmarkMode) {
            BenchmarkMode.COLLECTION -> {
                showCollectionBenchmark()
                return
            }
            BenchmarkMode.WEB_VIEW -> {
                showWebViewBenchmark()
                return
            }
            BenchmarkMode.NONE -> Unit
        }

        setContentView(R.layout.activity_main)
        findViewById<View>(R.id.root).applyDefaultImeWindowInsets()

        initializeBottomTabs()

        WebViewVersionCompatibility.displayUpdateDialogIfOutdated(
            activity = this,
            requiredVersion = WebViewInfo.REQUIRED_WEBVIEW_VERSION,
        )
    }

    private fun initializeBottomTabs() {
        val bottomNavigationView = findViewById<BottomNavigationView>(R.id.bottom_nav)

        bottomNavigationController =
            AngularNativeBottomNavigationController(this, bottomNavigationView)
        bottomNavigationController.load(mainTabs, viewModel.selectedTabIndex)
        bottomNavigationController.setOnTabSelectedListener { index, _ ->
            viewModel.selectedTabIndex = index
        }
    }

    override fun navigatorConfigurations() = mainTabs.navigatorConfigurations

    private fun showCollectionBenchmark() {
        val root = benchmarkRoot()
        val host = FrameLayout(this)
        val context =
            NativeElementContext(
                context = this,
                container = host,
                lifecycleOwner = this,
                savedStateOwner = this,
                events = { _, _ -> },
            )
        var offset = 0
        val collection =
            AndroidNativeElements.registry.create(
                "list",
                context,
                collectionProperties(offset),
            )
        val update =
            Button(this).apply {
                text = getString(R.string.benchmark_update_collection)
                contentDescription = COLLECTION_READY_DESCRIPTION
                setOnClickListener {
                    contentDescription = COLLECTION_RUNNING_DESCRIPTION
                    offset = (offset + 1) % COLLECTION_BENCHMARK_SIZE
                    val allocatedBefore = allocatedBytes()
                    Trace.beginSection(COLLECTION_UPDATE_TRACE)
                    try {
                        AndroidNativeElements.registry.update(
                            collection,
                            collectionProperties(offset),
                        )
                    } finally {
                        Trace.endSection()
                        contentDescription =
                            "$text; allocatedBytes=${allocatedBytes() - allocatedBefore}"
                    }
                }
            }
        host.addView(collection)
        root.addView(update)
        root.addView(
            host,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f,
            ),
        )
        setContentView(root)
    }

    private fun collectionProperties(offset: Int): JSONObjectProperties =
        JSONObjectProperties(
            JSONObject()
                .put("label", "collection-benchmark")
                .put(
                    "children",
                    JSONArray(
                        (0 until COLLECTION_BENCHMARK_SIZE).map { index ->
                            val value = (index + offset) % COLLECTION_BENCHMARK_SIZE
                            JSONObject()
                                .put("key", "item-$value")
                                .put("name", "list-item")
                                .put(
                                    "props",
                                    JSONObject()
                                        .put("label", "Task $value")
                                        .put("text", "Task $value"),
                                )
                        }
                    ),
                )
        )

    private fun showWebViewBenchmark() {
        val root = benchmarkRoot()
        val run =
            Button(this).apply {
                text = getString(R.string.benchmark_run_bridge)
                contentDescription = BRIDGE_LOADING_DESCRIPTION
                isEnabled = false
            }
        val webView = AngularNativeWebView(this)
        benchmarkWebView = webView
        webView.contentDescription = getString(R.string.benchmark_web_view)
        webView.addJavascriptInterface(
            WebViewBenchmarkBridge { latencyMilliseconds ->
                runOnUiThread {
                    if (!isDestroyed) {
                        run.contentDescription =
                            "$BRIDGE_LATENCY_PREFIX$latencyMilliseconds; " +
                                "$WEB_VIEW_PSS_PREFIX${Debug.getPss()}"
                    }
                }
            },
            WEB_VIEW_BENCHMARK_INTERFACE,
        )
        webView.webViewClient = BenchmarkWebViewClient(run)
        run.setOnClickListener {
            run.contentDescription = BRIDGE_RUNNING_DESCRIPTION
            webView.evaluateJavascript(BRIDGE_BENCHMARK_SCRIPT, null)
        }
        root.addView(run)
        root.addView(
            webView,
            LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f,
            ),
        )
        setContentView(root)
        webView.loadDataWithBaseURL(
            WEB_VIEW_BENCHMARK_ORIGIN,
            WEB_VIEW_BENCHMARK_DOCUMENT,
            "text/html",
            Charsets.UTF_8.name(),
            null,
        )
    }

    private fun benchmarkRoot() =
        LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            ViewCompat.setOnApplyWindowInsetsListener(this) { view, insets ->
                val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
                view.setPadding(
                    systemBars.left,
                    systemBars.top,
                    systemBars.right,
                    systemBars.bottom,
                )
                insets
            }
        }

    override fun onDestroy() {
        benchmarkWebView?.apply {
            removeJavascriptInterface(WEB_VIEW_BENCHMARK_INTERFACE)
            destroy()
        }
        benchmarkWebView = null
        super.onDestroy()
    }

    private fun allocatedBytes(): Long =
        Debug.getRuntimeStat(ALLOCATED_BYTES_STAT)?.toLongOrNull() ?: 0L

    protected enum class BenchmarkMode {
        NONE,
        COLLECTION,
        WEB_VIEW,
    }

    private companion object {
        const val ALLOCATED_BYTES_STAT = "art.gc.bytes-allocated"
        const val COLLECTION_BENCHMARK_SIZE = 10_000
        const val COLLECTION_UPDATE_TRACE = "AngularNativeCollectionUpdate"
        const val COLLECTION_READY_DESCRIPTION = "collectionBenchmark=ready"
        const val COLLECTION_RUNNING_DESCRIPTION = "collectionBenchmark=running"
        const val WEB_VIEW_BENCHMARK_INTERFACE = "WebViewBenchmark"
        const val WEB_VIEW_BENCHMARK_ORIGIN = "https://benchmark.invalid/"
        const val WEB_VIEW_BENCHMARK_DOCUMENT = "<!doctype html><title>Bridge benchmark</title>"
        const val BRIDGE_LOADING_DESCRIPTION = "bridgeLatencyMs=loading"
        const val BRIDGE_READY_DESCRIPTION = "bridgeLatencyMs=ready"
        const val BRIDGE_RUNNING_DESCRIPTION = "bridgeLatencyMs=running"
        const val BRIDGE_RENDERER_GONE_DESCRIPTION = "bridgeLatencyMs=renderer-gone"
        const val BRIDGE_LATENCY_PREFIX = "bridgeLatencyMs="
        const val WEB_VIEW_PSS_PREFIX = "appPssKb="
        const val BRIDGE_BENCHMARK_SCRIPT =
            """(() => {
                const start = performance.now();
                let checksum = 0;
                for (let index = 0; index < 1000; index += 1) {
                    checksum += WebViewBenchmark.ping(index);
                }
                if (checksum !== 499500) throw new Error("Bridge checksum failed");
                WebViewBenchmark.report(performance.now() - start);
            })()"""
    }

    private class WebViewBenchmarkBridge(private val reportResult: (Double) -> Unit) {
        @JavascriptInterface fun ping(value: Int): Int = value

        @JavascriptInterface fun report(milliseconds: Double) = reportResult(milliseconds)
    }

    @SuppressLint("MissingOnRenderProcessGone")
    private inner class BenchmarkWebViewClient(private val run: Button) : WebViewClientCompat() {
        override fun onPageFinished(view: WebView, url: String) {
            run.isEnabled = true
            run.contentDescription = BRIDGE_READY_DESCRIPTION
        }

        override fun onRenderProcessGone(
            view: WebView,
            detail: RenderProcessGoneDetail,
        ): Boolean {
            benchmarkWebView = null
            (view.parent as? ViewGroup)?.removeView(view)
            view.destroy()
            run.isEnabled = false
            run.contentDescription = BRIDGE_RENDERER_GONE_DESCRIPTION
            return true
        }
    }
}

class CollectionBenchmarkActivity : MainActivity() {
    override val benchmarkMode = BenchmarkMode.COLLECTION
}

class WebViewBenchmarkActivity : MainActivity() {
    override val benchmarkMode = BenchmarkMode.WEB_VIEW
}
