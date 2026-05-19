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
    attrs: dynamic,
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
    if (link != null) raw.link = link.toJs()
    if (preLink != null || postLink != null) raw.link = prePostLinksToJs(preLink, postLink)

    return raw
}

private fun <TController> DirectiveLink<TController>.toJs(): dynamic =
    { scope: dynamic, element: dynamic, attrs: dynamic, controller: dynamic, transclude: dynamic ->
        this(
            Scope(scope.unsafeCast<RawScope>()),
            element.unsafeCast<HTMLElement>(),
            attrs,
            controller.unsafeCast<TController?>(),
            transclude,
        )
    }

private fun <TController> prePostLinksToJs(
    preLink: DirectiveLink<TController>?,
    postLink: DirectiveLink<TController>?,
): dynamic {
    val raw = js("{}")

    if (preLink != null) raw.pre = preLink.toJs()
    if (postLink != null) raw.post = postLink.toJs()

    return raw
}
