package angular.ts

import org.w3c.dom.Element

public data class BootstrapConfig public constructor(
    public val strictDi: Boolean = false,
)

public fun ng.bootstrap(
    root: Element,
    modules: List<String>,
    config: BootstrapConfig = BootstrapConfig(),
): Injector =
    Injector(angularRuntime.bootstrap(root, modules.toTypedArray(), config.toJs()))

internal fun BootstrapConfig.toJs(): dynamic {
    val raw = js("{}")
    raw.strictDi = strictDi
    return raw
}
