package angular.ts

import angular.ts.generated.StateRegistryService as RawStateRegistryService
import angular.ts.generated.StateService as RawStateService
import angular.ts.generated.Transition as RawTransition
import angular.ts.generated.TransitionService as RawTransitionService

public typealias StateOrName = Any

public typealias StateResolveObject = Map<String, InjectableFactory<*>>

public typealias StateResolveArray = List<ResolvableLiteral>

public typealias TemplateFactory = (Map<String, Any?>?) -> String

public typealias TemplateUrlFactory = (Map<String, Any?>?) -> String?

public typealias RedirectToResult = Any?

public typealias TransitionHookFn = (Transition) -> Any?

public typealias TransitionStateHookFn = (
    transition: Transition,
    state: Any?,
) -> Any?

public data class ViewDeclaration public constructor(
    public val name: String? = null,
    public val component: String? = null,
    public val bindings: Map<String, String>? = null,
    public val controller: InjectableFactory<*>? = null,
    public val template: Any? = null,
    public val templateUrl: Any? = null,
)

public data class ResolvableLiteral public constructor(
    public val token: String,
    public val resolve: InjectableFactory<*>,
    public val eager: Boolean = false,
)

public data class RedirectTo public constructor(
    public val state: String? = null,
    public val params: Map<String, Any?>? = null,
)

public data class StateDeclaration public constructor(
    public val name: String,
    public val abstractState: Boolean? = null,
    public val parent: Any? = null,
    public val views: Map<String, ViewDeclaration>? = null,
    public val url: String? = null,
    public val params: Map<String, Any?>? = null,
    public val data: Any? = null,
    public val redirectTo: Any? = null,
    public val onEnter: Any? = null,
    public val onRetain: Any? = null,
    public val onExit: Any? = null,
    public val dynamicState: Boolean? = null,
    public val component: String? = null,
    public val bindings: Map<String, String>? = null,
    public val template: Any? = null,
    public val controller: InjectableFactory<*>? = null,
    public val templateUrl: Any? = null,
    public val resolve: Any? = null,
)

public class Transition internal constructor(
    internal val raw: RawTransition,
) {
    public val id: Int?
        get() = raw.`$id`.unsafeCast<Int?>()

    public val promise: Any?
        get() = raw.promise

    public val success: Boolean
        get() = raw.success

    public fun applyViewConfigs() {
        raw.applyViewConfigs()
    }

    public fun from(): Any? =
        raw.from()

    public fun to(): Any? =
        raw.to()

    public fun params(pathname: String? = null): Any? =
        raw.params(pathname ?: undefined)

    public fun entering(): Array<dynamic> =
        raw.entering()

    public fun exiting(): Array<dynamic> =
        raw.exiting()

    public fun redirect(targetState: Any?): Transition =
        Transition(raw.redirect(routerValueToJs(targetState)).unsafeCast<RawTransition>())

    public fun isDynamic(): Boolean =
        raw.dynamic()

    public fun isActive(): Boolean =
        raw.isActive()

    public fun isValid(): Boolean =
        raw.valid()

    public fun abort() {
        raw.abort()
    }

    public fun error(): Any? =
        raw.error()

    override fun toString(): String =
        raw.toString()
}

public class TransitionPromise internal constructor(
    public val promise: Any?,
    public val transition: Transition,
)

public class StateService internal constructor(
    internal val raw: RawStateService,
) {
    public val current: Any?
        get() = raw.current

    public val params: Any?
        get() = raw.params

    public fun defaultErrorHandler(handler: (Any?) -> Any?): (Any?) -> Any? =
        raw.defaultErrorHandler(handler).unsafeCast<(Any?) -> Any?>()

    public fun get(
        state: StateOrName? = null,
        base: StateOrName? = null,
    ): Any? =
        raw.get(routerValueToJs(state), routerValueToJs(base))

    public fun getCurrentPath(): Array<dynamic> =
        raw.getCurrentPath()

    public fun go(
        state: StateOrName,
        params: Map<String, Any?>? = null,
        options: Map<String, Any?>? = null,
    ): Any? =
        raw.go(routerValueToJs(state), params?.toJsRecord(), options?.toJsRecord())

    public fun href(
        state: StateOrName,
        params: Map<String, Any?>? = null,
        options: Map<String, Any?>? = null,
    ): String =
        raw.href(routerValueToJs(state), params?.toJsRecord(), options?.toJsRecord())

    public fun includes(
        state: StateOrName,
        params: Map<String, Any?>? = null,
        options: Map<String, Any?>? = null,
    ): Boolean =
        raw.includes(routerValueToJs(state), params?.toJsRecord(), options?.toJsRecord())

    public fun isState(
        state: StateOrName,
        params: Map<String, Any?>? = null,
        options: Map<String, Any?>? = null,
    ): Boolean =
        raw.`is`(routerValueToJs(state), params?.toJsRecord(), options?.toJsRecord())

    public fun lazy(
        name: String,
        loader: () -> Any?,
    ): Any? =
        raw.lazy(name, loader)

    public fun reload(state: StateOrName? = null): Any? =
        raw.reload(routerValueToJs(state))

    public fun state(declaration: StateDeclaration): Any? =
        raw.state(declaration.name, declaration.toJs())

    public fun target(
        state: StateOrName,
        params: Map<String, Any?>? = null,
        options: Map<String, Any?>? = null,
    ): Any? =
        raw.target(routerValueToJs(state), params?.toJsRecord(), options?.toJsRecord())

    public fun transitionTo(
        state: StateOrName,
        params: Map<String, Any?>? = null,
        options: Map<String, Any?>? = null,
    ): Any? =
        raw.transitionTo(routerValueToJs(state), params?.toJsRecord(), options?.toJsRecord())
}

public class StateRegistryService internal constructor(
    internal val raw: RawStateRegistryService,
) {
    public fun register(declaration: StateDeclaration): Any? =
        raw.register(declaration.toJs())

    public fun deregister(state: StateOrName): Array<dynamic> =
        raw.deregister(routerValueToJs(state))

    public fun get(
        state: StateOrName? = null,
        base: StateOrName? = null,
    ): Any? =
        raw.get(routerValueToJs(state), routerValueToJs(base))

    public fun getAll(): Array<dynamic> =
        raw.getAll()

    public fun onStatesChanged(listener: (event: String, states: Array<dynamic>) -> Unit): () -> Unit {
        val disposer = raw.onStatesChanged { event: String, states: Array<dynamic> ->
            listener(event, states)
        }

        return { callJsFunction(disposer, null, emptyArray()) }
    }

    public fun registerRoot() {
        raw.registerRoot()
    }

    public fun root(): Any? =
        raw.root()
}

public class TransitionService internal constructor(
    internal val raw: RawTransitionService,
) {
    public fun onBefore(
        criteria: Map<String, Any?> = emptyMap(),
        options: Map<String, Any?> = emptyMap(),
        callback: TransitionHookFn,
    ): () -> Unit =
        hook(raw.onBefore(criteria.toJsRecord(), transitionCallback(callback), options.toJsRecord()))

    public fun onStart(
        criteria: Map<String, Any?> = emptyMap(),
        options: Map<String, Any?> = emptyMap(),
        callback: TransitionHookFn,
    ): () -> Unit =
        hook(raw.onStart(criteria.toJsRecord(), transitionCallback(callback), options.toJsRecord()))

    public fun onEnter(
        criteria: Map<String, Any?> = emptyMap(),
        options: Map<String, Any?> = emptyMap(),
        callback: TransitionStateHookFn,
    ): () -> Unit =
        hook(raw.onEnter(criteria.toJsRecord(), stateTransitionCallback(callback), options.toJsRecord()))

    public fun onRetain(
        criteria: Map<String, Any?> = emptyMap(),
        options: Map<String, Any?> = emptyMap(),
        callback: TransitionStateHookFn,
    ): () -> Unit =
        hook(raw.onRetain(criteria.toJsRecord(), stateTransitionCallback(callback), options.toJsRecord()))

    public fun onExit(
        criteria: Map<String, Any?> = emptyMap(),
        options: Map<String, Any?> = emptyMap(),
        callback: TransitionStateHookFn,
    ): () -> Unit =
        hook(raw.onExit(criteria.toJsRecord(), stateTransitionCallback(callback), options.toJsRecord()))

    public fun onFinish(
        criteria: Map<String, Any?> = emptyMap(),
        options: Map<String, Any?> = emptyMap(),
        callback: TransitionHookFn,
    ): () -> Unit =
        hook(raw.onFinish(criteria.toJsRecord(), transitionCallback(callback), options.toJsRecord()))

    public fun onSuccess(
        criteria: Map<String, Any?> = emptyMap(),
        options: Map<String, Any?> = emptyMap(),
        callback: TransitionHookFn,
    ): () -> Unit =
        hook(raw.onSuccess(criteria.toJsRecord(), transitionCallback(callback), options.toJsRecord()))

    public fun onError(
        criteria: Map<String, Any?> = emptyMap(),
        options: Map<String, Any?> = emptyMap(),
        callback: TransitionHookFn,
    ): () -> Unit =
        hook(raw.onError(criteria.toJsRecord(), transitionCallback(callback), options.toJsRecord()))

    private fun hook(disposer: Function<*>): () -> Unit =
        { callJsFunction(disposer, null, emptyArray()) }
}

internal fun StateDeclaration.toJs(): dynamic {
    val raw = js("{}")

    raw.name = name
    if (abstractState != null) raw["abstract"] = abstractState
    if (parent != null) raw.parent = routerValueToJs(parent)
    if (views != null) raw.views = views.mapValuesToJs()
    if (url != null) raw.url = url
    if (params != null) raw.params = params.mapValuesToJs()
    if (data != null) raw.data = routerValueToJs(data)
    if (redirectTo != null) raw.redirectTo = routerValueToJs(redirectTo)
    if (onEnter != null) raw.onEnter = routerValueToJs(onEnter)
    if (onRetain != null) raw.onRetain = routerValueToJs(onRetain)
    if (onExit != null) raw.onExit = routerValueToJs(onExit)
    if (dynamicState != null) raw["dynamic"] = dynamicState
    if (component != null) raw.component = component
    if (bindings != null) raw.bindings = bindings.toJsRecord()
    if (template != null) raw.template = routerValueToJs(template)
    if (controller != null) raw.controller = controller.toJs()
    if (templateUrl != null) raw.templateUrl = routerValueToJs(templateUrl)
    if (resolve != null) raw.resolve = routerValueToJs(resolve)

    return raw
}

private fun ViewDeclaration.toJs(): dynamic {
    val raw = js("{}")

    if (name != null) raw._name = name
    if (component != null) raw.component = component
    if (bindings != null) raw.bindings = bindings.toJsRecord()
    if (controller != null) raw.controller = controller.toJs()
    if (template != null) raw.template = routerValueToJs(template)
    if (templateUrl != null) raw.templateUrl = routerValueToJs(templateUrl)

    return raw
}

private fun ResolvableLiteral.toJs(): dynamic {
    val raw = js("{}")

    raw.token = token
    raw.resolveFn = resolve.toJs()
    if (eager) raw.eager = true

    return raw
}

private fun RedirectTo.toJs(): dynamic {
    val raw = js("{}")

    if (state != null) raw.state = state
    if (params != null) raw.params = params.mapValuesToJs()

    return raw
}

private fun transitionCallback(callback: TransitionHookFn): Function<*> =
    { transition: dynamic -> callback(Transition(transition.unsafeCast<RawTransition>())) }

private fun stateTransitionCallback(callback: TransitionStateHookFn): Function<*> =
    { transition: dynamic, state: dynamic ->
        callback(Transition(transition.unsafeCast<RawTransition>()), state)
    }

private fun Map<*, *>.mapValuesToJs(): dynamic {
    val raw = js("{}")

    for ((key, value) in this) {
        if (key != null) raw[key.toString()] = routerValueToJs(value)
    }

    return raw
}

private fun Iterable<*>.toJsArray(): Array<dynamic> =
    map(::routerValueToJs).toTypedArray()

private fun routerValueToJs(value: Any?): dynamic =
    when (value) {
        null -> undefined
        is StateDeclaration -> value.toJs()
        is ViewDeclaration -> value.toJs()
        is ResolvableLiteral -> value.toJs()
        is RedirectTo -> value.toJs()
        is InjectableFactory<*> -> value.toJs()
        is Map<*, *> -> value.mapValuesToJs()
        is Iterable<*> -> value.toJsArray()
        else -> value
    }

@Suppress("UNUSED_VARIABLE")
private val undefined: dynamic =
    js("undefined")
