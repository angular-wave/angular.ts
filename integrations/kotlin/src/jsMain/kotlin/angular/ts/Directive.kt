package angular.ts

import angular.ts.generated.Scope as RawScope
import org.w3c.dom.HTMLElement

public enum class DirectiveRestrict(
    internal val raw: String,
) {
    Attribute("A"),
    Element("E"),
    AttributeElement("AE"),
    ElementAttribute("EA"),
}

public typealias DirectiveLink<TController> = (
    scope: Scope<Any>,
    element: HTMLElement,
    controller: TController?,
    transclude: dynamic,
) -> Unit

public data class Directive<TController> public constructor(
    public val template: String? = null,
    public val templateUrl: String? = null,
    public val controller: InjectableFactory<TController>? = null,
    public val controllerAs: String? = null,
    public val restrict: DirectiveRestrict = DirectiveRestrict.ElementAttribute,
    public val scope: Boolean = false,
    public val bindToController: Boolean = false,
    public val require: Any? = null,
    public val link: DirectiveLink<TController>? = null,
    public val preLink: DirectiveLink<TController>? = null,
    public val postLink: DirectiveLink<TController>? = null,
)

internal fun Directive<*>.toJs(): dynamic {
    val raw = js("{}")

    raw.restrict = restrict.raw
    raw.scope = scope
    raw.bindToController = bindToController

    if (template != null) raw.template = template
    if (templateUrl != null) raw.templateUrl = templateUrl
    if (controller != null) raw.controller = controller.toJs()
    if (controllerAs != null) raw.controllerAs = controllerAs
    if (require != null) raw.require = require
    if (link != null) raw.link = link.toJs(require != null)
    if (preLink != null || postLink != null) {
        raw.link = prePostLinksToJs(preLink, postLink, require != null)
    }

    return raw
}

private fun <TController> DirectiveLink<TController>.toJs(hasRequire: Boolean): dynamic =
    { scope: dynamic, element: dynamic, third: dynamic, fourth: dynamic ->
        val controller = if (hasRequire) third else null
        val transclude = if (hasRequire) fourth else third

        this(
            Scope(scope.unsafeCast<RawScope>()),
            element.unsafeCast<HTMLElement>(),
            controller.unsafeCast<TController?>(),
            transclude,
        )
    }

private fun <TController> prePostLinksToJs(
    preLink: DirectiveLink<TController>?,
    postLink: DirectiveLink<TController>?,
    hasRequire: Boolean,
): dynamic {
    val raw = js("{}")

    if (preLink != null) raw.pre = preLink.toJs(hasRequire)
    if (postLink != null) raw.post = postLink.toJs(hasRequire)

    return raw
}
