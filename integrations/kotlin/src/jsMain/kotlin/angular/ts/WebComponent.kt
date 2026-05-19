package angular.ts

public data class WebComponentInput public constructor(
    public val attribute: String? = null,
    public val reflect: Boolean = false,
    public val defaultValue: Any? = null,
)

public data class WebComponent<TState : Any> public constructor(
    public val template: String? = null,
    public val shadow: Boolean = false,
    public val isolate: Boolean = false,
    public val inputs: Map<String, WebComponentInput> = emptyMap(),
)

internal fun WebComponent<*>.toJs(): dynamic {
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
