package angular.ts

import angular.ts.generated.ScopeElement as RawScopeElement

public data class WebComponentInput public constructor(
    public val attribute: String? = null,
    public val reflect: Boolean = false,
    public val defaultValue: Any? = null,
)

public data class ScopeElementConstructor<TState : Any> public constructor(
    internal val raw: Any,
)

public class ScopeElement<TState : Any> internal constructor(
    internal val raw: RawScopeElement<TState>,
)

public data class AppComponent<TState : Any> public constructor(
    public val template: String? = null,
    public val shadow: Boolean = false,
    public val isolate: Boolean = false,
    public val inputs: Map<String, WebComponentInput> = emptyMap(),
)

public typealias WebComponent<TState> = AppComponent<TState>

internal fun AppComponent<*>.toJs(): dynamic {
    val raw = js("{}")

    if (template != null) raw.template = template
    if (shadow) raw.shadow = true
    if (isolate) raw.isolate = true
    if (inputs.isNotEmpty()) raw.inputs = inputs.mapValues { (_, input) -> input.toJs() }.toJsRecord()

    return raw
}

private fun WebComponentInput.toJs(): dynamic {
    val raw = js("{}")

    if (attribute != null) raw.attribute = attribute
    if (reflect) raw.reflect = true
    if (defaultValue != null) raw.default = defaultValue

    return raw
}
