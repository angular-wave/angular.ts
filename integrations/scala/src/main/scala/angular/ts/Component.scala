package angular.ts

import scala.scalajs.js

final case class Component[A](
    template: js.UndefOr[String] = js.undefined,
    controller: js.UndefOr[InjectableFactory[A]] = js.undefined,
    controllerAs: js.UndefOr[String] = js.undefined,
    templateUrl: js.UndefOr[String] = js.undefined,
    bindings: Map[String, String] = Map.empty,
    replace: js.UndefOr[Boolean] = js.undefined,
    transclude: js.UndefOr[Boolean] = js.undefined,
    require: Map[String, String] = Map.empty,
):
  private[ts] def toJS: js.Object =
    JsObjectBuilder(
      "template" -> template,
      "controller" -> controller.map(_.annotated),
      "controllerAs" -> controllerAs,
      "templateUrl" -> templateUrl,
      "bindings" -> JsObjectBuilder.stringMap(bindings),
      "replace" -> replace,
      "transclude" -> transclude,
      "require" -> JsObjectBuilder.stringMap(require),
    )
