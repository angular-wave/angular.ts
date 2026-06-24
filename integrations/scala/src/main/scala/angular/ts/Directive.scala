package angular.ts

import scala.scalajs.js

enum DirectiveRestrict(val value: String):
  case Attribute extends DirectiveRestrict("A")
  case Element extends DirectiveRestrict("E")
  case AttributeElement extends DirectiveRestrict("AE")
  case ElementAttribute extends DirectiveRestrict("EA")

final case class DirectivePrePost(
    pre: js.UndefOr[js.Function2[Scope, org.scalajs.dom.HTMLElement, Unit]] =
      js.undefined,
    post: js.UndefOr[js.Function2[Scope, org.scalajs.dom.HTMLElement, Unit]] =
      js.undefined,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "pre" -> pre,
      "post" -> post,
    )

type DirectiveFactoryFn = js.Function0[Directive | js.Function | js.Object]
type AnnotatedDirectiveFactory = js.Array[String | DirectiveFactoryFn]
type DirectiveFactory = DirectiveFactoryFn | AnnotatedDirectiveFactory

final case class Directive(
    link: js.UndefOr[js.Function2[Scope, org.scalajs.dom.HTMLElement, Unit]] =
      js.undefined,
    prePostLink: js.UndefOr[DirectivePrePost] = js.undefined,
    restrict: js.UndefOr[DirectiveRestrict] = js.undefined,
    controller: js.UndefOr[InjectableFactory[?]] = js.undefined,
    controllerAs: js.UndefOr[String] = js.undefined,
    bindToController: js.UndefOr[Boolean] = js.undefined,
    priority: js.UndefOr[Int] = js.undefined,
    terminal: js.UndefOr[Boolean] = js.undefined,
    replace: js.UndefOr[Boolean] = js.undefined,
    require: Map[String, String] = Map.empty,
    scope: js.UndefOr[Boolean] = js.undefined,
    template: js.UndefOr[String] = js.undefined,
    templateNamespace: js.UndefOr[String] = js.undefined,
    templateUrl: js.UndefOr[String] = js.undefined,
    transclude: js.UndefOr[Boolean] = js.undefined,
):
  private[ts] def factory: js.Function0[js.Object] =
    () =>
      val linkValue = prePostLink.fold(link.asInstanceOf[js.UndefOr[js.Any]])(
        value => value.toJS.asInstanceOf[js.Any],
      )

      JsObjectBuilder(
        "link" -> linkValue,
        "restrict" -> restrict.map(_.value),
        "controller" -> controller.map(_.annotated),
        "controllerAs" -> controllerAs,
        "bindToController" -> bindToController,
        "priority" -> priority,
        "terminal" -> terminal,
        "replace" -> replace,
        "require" -> JsObjectBuilder.stringMap(require),
        "scope" -> scope,
        "template" -> template,
        "templateNamespace" -> templateNamespace,
        "templateUrl" -> templateUrl,
        "transclude" -> transclude,
      )
