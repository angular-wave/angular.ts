package io.github.angularwave.android.navigation.bridge

import android.app.Activity
import android.graphics.Rect
import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import androidx.window.layout.WindowMetricsCalculator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel as cancelScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

internal class AndroidWindowState(
    private val activity: Activity,
    private val emit: (JSONObject) -> Unit,
    private val layouts: Flow<WindowLayoutInfo> =
        WindowInfoTracker.getOrCreate(activity).windowLayoutInfo(activity),
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var layoutInfo: WindowLayoutInfo? = null
    private var watchJob: Job? = null
    private val layoutListener =
        View.OnLayoutChangeListener {
            _,
            left,
            top,
            right,
            bottom,
            oldLeft,
            oldTop,
            oldRight,
            oldBottom ->
            if (right - left != oldRight - oldLeft || bottom - top != oldBottom - oldTop) {
                emit(status())
            }
        }

    fun status(): JSONObject = AndroidWindowSnapshot.create(activity, layoutInfo)

    fun watch(): JSONObject {
        if (watchJob == null) {
            activity.window.decorView.addOnLayoutChangeListener(layoutListener)
            watchJob = scope.launch {
                layouts.collect { value ->
                    layoutInfo = value
                    emit(status())
                }
            }
        }
        return status()
    }

    fun unwatch(): JSONObject {
        stopWatching()
        return status()
    }

    fun close() {
        stopWatching()
        scope.cancelScope()
    }

    private fun stopWatching() {
        watchJob?.cancel()
        watchJob = null
        activity.window.decorView.removeOnLayoutChangeListener(layoutListener)
    }
}

internal object AndroidWindowSnapshot {
    private const val WIDTH_MEDIUM_DP = 600f
    private const val WIDTH_EXPANDED_DP = 840f
    private const val WIDTH_LARGE_DP = 1200f
    private const val WIDTH_EXTRA_LARGE_DP = 1600f
    private const val HEIGHT_MEDIUM_DP = 480f
    private const val HEIGHT_EXPANDED_DP = 900f

    fun create(
        activity: Activity,
        layoutInfo: WindowLayoutInfo?,
    ): JSONObject {
        val bounds =
            WindowMetricsCalculator.getOrCreate().computeCurrentWindowMetrics(activity).bounds
        val density = activity.resources.displayMetrics.density
        val width = bounds.width() / density
        val height = bounds.height() / density
        val insets =
            ViewCompat.getRootWindowInsets(activity.window.decorView)
                ?.getInsets(
                    WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
                )
        return JSONObject()
            .put("width", width.toDouble())
            .put("height", height.toDouble())
            .put("widthClass", widthClass(width))
            .put("heightClass", heightClass(height))
            .put("orientation", if (width > height) "landscape" else "portrait")
            .put(
                "safeArea",
                JSONObject()
                    .put("left", (insets?.left ?: 0) / density.toDouble())
                    .put("top", (insets?.top ?: 0) / density.toDouble())
                    .put("right", (insets?.right ?: 0) / density.toDouble())
                    .put("bottom", (insets?.bottom ?: 0) / density.toDouble()),
            )
            .put(
                "displayFeatures",
                JSONArray(
                    layoutInfo?.displayFeatures.orEmpty().filterIsInstance<FoldingFeature>().map {
                        feature ->
                        foldingFeature(feature, density)
                    }
                ),
            )
    }

    fun widthClass(width: Float) =
        when {
            width >= WIDTH_EXTRA_LARGE_DP -> "extra-large"
            width >= WIDTH_LARGE_DP -> "large"
            width >= WIDTH_EXPANDED_DP -> "expanded"
            width >= WIDTH_MEDIUM_DP -> "medium"
            else -> "compact"
        }

    fun heightClass(height: Float) =
        when {
            height >= HEIGHT_EXPANDED_DP -> "expanded"
            height >= HEIGHT_MEDIUM_DP -> "medium"
            else -> "compact"
        }

    private fun foldingFeature(
        feature: FoldingFeature,
        density: Float,
    ): JSONObject =
        JSONObject()
            .put(
                "type",
                if (feature.occlusionType == FoldingFeature.OcclusionType.FULL) "hinge" else "fold",
            )
            .put(
                "state",
                if (feature.state == FoldingFeature.State.HALF_OPENED) "half-opened" else "flat",
            )
            .put(
                "orientation",
                if (feature.orientation == FoldingFeature.Orientation.VERTICAL) "vertical"
                else "horizontal",
            )
            .put("separating", feature.isSeparating)
            .put("bounds", bounds(feature.bounds, density))

    private fun bounds(
        bounds: Rect,
        density: Float,
    ) =
        JSONObject()
            .put("left", bounds.left / density.toDouble())
            .put("top", bounds.top / density.toDouble())
            .put("right", bounds.right / density.toDouble())
            .put("bottom", bounds.bottom / density.toDouble())
}
