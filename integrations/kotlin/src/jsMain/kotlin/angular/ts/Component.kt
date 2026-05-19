package angular.ts

public data class Component<TController> public constructor(
    public val template: String? = null,
    public val templateUrl: String? = null,
    public val controller: InjectableFactory<TController>? = null,
    public val controllerAs: String? = null,
    public val bindings: Map<String, String> = emptyMap(),
    public val transclude: Boolean = false,
    public val require: Map<String, String> = emptyMap(),
)

internal fun Component<*>.toJs(): dynamic {
    val raw = js("{}")

    if (template != null) raw.template = template
    if (templateUrl != null) raw.templateUrl = templateUrl
    if (controller != null) raw.controller = controller.toJs()
    if (controllerAs != null) raw.controllerAs = controllerAs
    if (bindings.isNotEmpty()) raw.bindings = bindings.toJsRecord()
    if (transclude) raw.transclude = true
    if (require.isNotEmpty()) raw.require = require.toJsRecord()

    return raw
}
