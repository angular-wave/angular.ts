package angular.ts

import angular.ts.generated.InjectorService as RawInjectorService
import angular.ts.generated.Scope as RawScope
import angular.ts.generated.ScopeElement as RawScopeElement
import angular.ts.generated.WebComponentContext as RawWebComponentContext
import angular.ts.generated.WebComponentService as RawWebComponentService
import org.w3c.dom.HTMLElement

public enum class WebComponentInputKind {
    String,
    Number,
    Boolean,
}

public data class WebComponentInput public constructor(
    public val kind: WebComponentInputKind? = null,
    public val attribute: String? = null,
    public val reflect: Boolean = false,
    public val defaultValue: Any? = null,
    public val coerce: ((Any?) -> Any?)? = null,
)

public data class ScopeElementConstructor<TState : Any> public constructor(
    internal val raw: Any,
)

public class ScopeElement<TState : Any> internal constructor(
    internal val raw: RawScopeElement<TState>,
)

public data class ElementScopeOptions public constructor(
    public val parentScope: Scope<*>? = null,
    public val isolate: Boolean = false,
)

public data class WebComponentEvent<TDetail> public constructor(
    public val name: String,
    public val detail: TDetail,
    public val init: Map<String, Any?> = emptyMap(),
)

public class WebComponentContext<TState : Any> internal constructor(
    internal val raw: RawWebComponentContext<TState>,
) {
    public val host: HTMLElement
        get() = raw.host.unsafeCast<HTMLElement>()

    public val scope: Scope<TState>
        get() = Scope(raw.scope.unsafeCast<RawScope>())

    public val injector: Injector
        get() = Injector(raw.injector.unsafeCast<RawInjectorService<Any?>>())

    public val root: Any?
        get() = raw.root

    public val shadowRoot: Any?
        get() = raw.shadowRoot

    public fun <TDetail> dispatch(event: WebComponentEvent<TDetail>): Boolean =
        raw.dispatch(event.name, event.detail, event.init.toJsRecord())
}

public typealias AppComponentConnected<TState> = (WebComponentContext<TState>) -> (() -> Unit)?

public typealias AppComponentDisconnected<TState> = (WebComponentContext<TState>) -> Unit

public typealias AppComponentAttributeChanged<TState> = (
    name: String,
    oldValue: String?,
    newValue: String?,
    context: WebComponentContext<TState>,
) -> Unit

public typealias AppComponentScopeFactory<TState> = () -> TState

public data class AppComponent<TState : Any> public constructor(
    public val template: String? = null,
    public val shadow: Any? = false,
    public val scope: Any? = null,
    public val isolate: Boolean = false,
    public val inputs: Map<String, WebComponentInput> = emptyMap(),
    public val connected: AppComponentConnected<TState>? = null,
    public val disconnected: AppComponentDisconnected<TState>? = null,
    public val attributeChanged: AppComponentAttributeChanged<TState>? = null,
)

public typealias WebComponent<TState> = AppComponent<TState>

public fun inputString(
    attribute: String? = null,
    defaultValue: String? = null,
    reflect: Boolean = false,
): WebComponentInput =
    WebComponentInput(
        kind = WebComponentInputKind.String,
        attribute = attribute,
        defaultValue = defaultValue,
        reflect = reflect,
    )

public fun inputNumber(
    attribute: String? = null,
    defaultValue: Number? = null,
    reflect: Boolean = false,
): WebComponentInput =
    WebComponentInput(
        kind = WebComponentInputKind.Number,
        attribute = attribute,
        defaultValue = defaultValue,
        reflect = reflect,
    )

public fun inputBoolean(
    attribute: String? = null,
    defaultValue: Boolean? = null,
    reflect: Boolean = false,
): WebComponentInput =
    WebComponentInput(
        kind = WebComponentInputKind.Boolean,
        attribute = attribute,
        defaultValue = defaultValue,
        reflect = reflect,
    )

public fun inputCustom(
    coerce: (Any?) -> Any?,
    attribute: String? = null,
    defaultValue: Any? = null,
    reflect: Boolean = false,
): WebComponentInput =
    WebComponentInput(
        attribute = attribute,
        defaultValue = defaultValue,
        reflect = reflect,
        coerce = coerce,
    )

public class WebComponentService internal constructor(
    internal val raw: RawWebComponentService,
) {
    public fun <TState : Any> defineAppComponent(
        name: String,
        options: AppComponent<TState>,
    ): ScopeElementConstructor<TState> =
        ScopeElementConstructor(raw.defineAppComponent(name, options.toJs()))

    public fun <TState : Any> defineElement(
        name: String,
        elementClass: ScopeElementConstructor<TState>,
    ): ScopeElementConstructor<TState> =
        ScopeElementConstructor(raw.defineElement(name, elementClass.raw))

    public fun <TState : Any> createElementScope(
        host: HTMLElement,
        initialState: TState? = null,
        options: ElementScopeOptions = ElementScopeOptions(),
    ): Scope<TState> =
        Scope(raw.createElementScope(host, initialState, options.toJs()).unsafeCast<RawScope>())
}

internal fun <TState : Any> AppComponent<TState>.toJs(): dynamic {
    val raw = js("{}")

    if (template != null) raw.template = template
    if (shadow != null && shadow != false) raw.shadow = shadow
    if (scope != null) raw.scope = scope.toJsScope()
    if (isolate) raw.isolate = true
    if (inputs.isNotEmpty()) raw.inputs = inputs.mapValues { (_, input) -> input.toJs() }.toJsRecord()
    if (connected != null) {
        raw.connected = { context: dynamic ->
            connected.invoke(WebComponentContext(context.unsafeCast<RawWebComponentContext<TState>>()))
        }
    }
    if (disconnected != null) {
        raw.disconnected = { context: dynamic ->
            disconnected.invoke(WebComponentContext(context.unsafeCast<RawWebComponentContext<TState>>()))
        }
    }
    if (attributeChanged != null) {
        raw.attributeChanged = { name: String, oldValue: String?, newValue: String?, context: dynamic ->
            attributeChanged.invoke(
                name,
                oldValue,
                newValue,
                WebComponentContext(context.unsafeCast<RawWebComponentContext<TState>>()),
            )
        }
    }

    return raw
}

private fun WebComponentInput.toJs(): dynamic {
    val raw = js("{}")

    if (kind != null) raw.type = kind.toJsConstructor()
    if (coerce != null) raw.type = coerce
    if (attribute != null) raw.attribute = attribute
    if (reflect) raw.reflect = true
    if (defaultValue != null) raw.default = defaultValue

    return raw
}

private fun ElementScopeOptions.toJs(): dynamic {
    val raw = js("{}")

    if (parentScope != null) raw.parentScope = parentScope.raw
    if (isolate) raw.isolate = true

    return raw
}

private fun Any.toJsScope(): Any? =
    if (this is Function0<*>) {
        { this() }
    } else {
        this
    }

private fun WebComponentInputKind.toJsConstructor(): dynamic =
    when (this) {
        WebComponentInputKind.String -> js("String")
        WebComponentInputKind.Number -> js("Number")
        WebComponentInputKind.Boolean -> js("Boolean")
    }
