package io.github.angularwave.android.navigation.bridge

import android.animation.ValueAnimator
import androidx.navigation.NavOptions
import io.github.angularwave.android.core.config.AngularNative
import io.github.angularwave.android.core.ng.config.context
import io.github.angularwave.android.core.ng.nav.PresentationContext
import io.github.angularwave.android.core.ng.visit.VisitAction
import io.github.angularwave.android.navigation.destinations.AngularNativeDestination
import io.github.angularwave.android.navigation.transitions.NativeNavigationTransition
import java.net.URI
import org.json.JSONObject

internal data class NativeNavigationSnapshot(
    val location: String?,
    val previousLocation: String?,
    val modal: Boolean,
) {
    val canPop: Boolean
        get() = modal || previousLocation != null
}

internal data class NativeNavigationRequest(
    val location: String,
    val action: VisitAction,
    val options: NavOptions?,
)

private data class PendingNavigation(
    val id: Long,
    val method: String,
    val from: String?,
    val target: String?,
)

/** Reconciles bridge commands with committed AndroidX destination changes. */
private class NativeNavigationStateMachine(
    initial: NativeNavigationSnapshot,
    private val changed: (JSONObject) -> Unit,
) {
    private var current = initial.location
    private var previous = initial.previousLocation
    private var pending: PendingNavigation? = null
    private var nextId = 1L

    fun begin(
        method: String,
        target: String?,
    ): Long {
        pending?.let { changed(event(it, "cancelled").put("reason", "interrupted")) }
        return nextId++.also { id ->
            pending = PendingNavigation(id, method, current, target)
        }
    }

    fun observe(location: String?) {
        val transaction = pending
        if (transaction != null && transaction.matches(location)) {
            pending = null
            previous = transaction.from
            current = location
            changed(event(transaction, "completed").put("url", location ?: JSONObject.NULL))
            return
        }
        if (transaction != null) {
            pending = null
            changed(event(transaction, "cancelled").put("reason", "destination-changed"))
        }
        if (location == current) return

        val method = if (location == previous) "pop" else "deep-link"
        val from = current
        previous = if (method == "pop") null else from
        current = location
        changed(
            JSONObject()
                .put("method", method)
                .put("phase", "completed")
                .put("source", "android")
                .put("from", from ?: JSONObject.NULL)
                .put("url", location ?: JSONObject.NULL)
        )
    }

    fun close() {
        pending?.let { cancel(it.id, "closed") }
    }

    fun cancel(
        id: Long,
        reason: String,
    ) {
        val transaction = pending?.takeIf { it.id == id } ?: return
        pending = null
        changed(event(transaction, "cancelled").put("reason", reason))
    }

    private fun PendingNavigation.matches(location: String?): Boolean =
        target == location || (method == "pop" && target == null)

    private fun event(
        transaction: PendingNavigation,
        phase: String,
    ): JSONObject =
        JSONObject()
            .put("transaction", transaction.id)
            .put("method", transaction.method)
            .put("phase", phase)
            .put("source", "bridge")
            .put("from", transaction.from ?: JSONObject.NULL)
            .put("url", transaction.target ?: JSONObject.NULL)
}

/** Maps the generated bridge contract onto the single Android [Navigator] history owner. */
internal class NativeNavigationDispatcher(
    private val snapshot: () -> NativeNavigationSnapshot,
    private val resolve: (String) -> String,
    private val isModalRoute: (String) -> Boolean,
    private val route: (NativeNavigationRequest) -> Unit,
    private val pop: () -> Unit,
    private val openExternal: (String) -> JSONObject,
    private val reduceMotion: () -> Boolean,
    private val changed: (JSONObject) -> Unit,
    observe: ((String?) -> Unit) -> (() -> Unit),
) : AutoCloseable {
    private val state = NativeNavigationStateMachine(snapshot(), changed)
    private val stopObserving = observe(state::observe)
    private var closed = false

    fun invoke(method: String, params: JSONObject): JSONObject =
        when (method) {
            "status" -> status()
            "pop" -> pop()
            "push" -> route(method, params, VisitAction.ADVANCE)
            "replace" -> route(method, params, VisitAction.REPLACE)
            "modal" -> route(method, params, VisitAction.ADVANCE, requireModal = true)
            "deep-link" -> route(method, params, VisitAction.ADVANCE)
            "external" -> openExternal(resolve(requireUrl(method, params)))
            else ->
                throw NativeCapabilityException(
                    NativeBridgeProtocol.ErrorCode.UNKNOWN_METHOD,
                    "Unsupported navigation method: $method",
                )
        }

    private fun status(): JSONObject {
        val current = snapshot()
        return JSONObject()
            .put("location", current.location ?: JSONObject.NULL)
            .put("previousLocation", current.previousLocation ?: JSONObject.NULL)
            .put("canPop", current.canPop)
            .put("modal", current.modal)
    }

    private fun pop(): JSONObject {
        val current = snapshot()
        if (!current.canPop) {
            return status().put("routed", false).put("method", "pop")
        }
        val transaction = dispatch("pop", current.previousLocation, pop)
        return JSONObject()
            .put("routed", true)
            .put("method", "pop")
            .put("phase", "accepted")
            .put("transaction", transaction)
            .put("from", current.location ?: JSONObject.NULL)
            .put("url", current.previousLocation ?: JSONObject.NULL)
    }

    private fun route(
        method: String,
        params: JSONObject,
        action: VisitAction,
        requireModal: Boolean = false,
    ): JSONObject {
        val location = resolve(requireUrl(method, params))
        if (requireModal && !isModalRoute(location)) {
            throw NativeCapabilityException(
                NativeBridgeProtocol.ErrorCode.INVALID_PARAMS,
                "navigation.modal requires a URL configured with modal context",
            )
        }
        val transition = NativeNavigationTransition.from(params.optString("transition"))
        val transaction =
            dispatch(method, location) {
                route(
                    NativeNavigationRequest(
                        location,
                        action,
                        transition.navigationOptions(reduceMotion()),
                    )
                )
            }
        return JSONObject()
            .put("routed", true)
            .put("method", method)
            .put("phase", "accepted")
            .put("transaction", transaction)
            .put("url", location)
            .put("action", action.name.lowercase())
            .put("transition", transition.value)
    }

    private fun dispatch(
        method: String,
        target: String?,
        operation: () -> Unit,
    ): Long {
        val transaction = state.begin(method, target)
        var completed = false
        try {
            operation()
            completed = true
        } finally {
            if (!completed) state.cancel(transaction, "failed")
        }
        return transaction
    }

    override fun close() {
        if (closed) return
        closed = true
        state.close()
        stopObserving()
    }

    private fun requireUrl(method: String, params: JSONObject): String =
        params.optString("url").takeIf(String::isNotBlank)
            ?: throw NativeCapabilityException(
                NativeBridgeProtocol.ErrorCode.INVALID_PARAMS,
                "navigation.$method requires params.url",
            )

    companion object {
        fun create(
            destination: AngularNativeDestination,
            openExternal: (String) -> JSONObject,
            changed: (JSONObject) -> Unit,
        ): NativeNavigationDispatcher =
            NativeNavigationDispatcher(
                snapshot = {
                    NativeNavigationSnapshot(
                        destination.navigator.location,
                        destination.navigator.previousLocation,
                        destination.navigator.currentDestination?.isModal == true,
                    )
                },
                resolve = { value ->
                    runCatching { URI(destination.location).resolve(value).toString() }
                        .getOrDefault(value)
                },
                isModalRoute = { location ->
                    AngularNative.config.pathConfiguration.properties(location).context ==
                        PresentationContext.MODAL
                },
                route = { request ->
                    destination.navigator.route(
                        request.location,
                        io.github.angularwave.android.core.ng.visit.VisitOptions(
                            action = request.action
                        ),
                        navigationOptions = request.options,
                    )
                },
                pop = destination.navigator::pop,
                openExternal = openExternal,
                reduceMotion = { !ValueAnimator.areAnimatorsEnabled() },
                changed = changed,
                observe = destination.navigator::observeNavigation,
            )
    }
}
