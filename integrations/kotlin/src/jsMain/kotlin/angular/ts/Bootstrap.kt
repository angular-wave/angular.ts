package angular.ts

import org.w3c.dom.Element

public fun ng.bootstrap(
    root: Element,
    modules: List<String>,
): Injector =
    Injector(angularRuntime.bootstrap(root, modules.toTypedArray()))
