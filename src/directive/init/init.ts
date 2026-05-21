import { _parse } from "../../injection-tokens.ts";
import { getController, getNormalizedAttr } from "../../shared/dom.ts";

ngInitDirective.$inject = [_parse];

export function ngInitDirective($parse: ng.ParseService): ng.Directive {
  return {
    priority: 450,
    compile(element: Element) {
      const initFn = $parse(getNormalizedAttr(element, "ngInit") ?? "");

      return {
        pre(scope: ng.Scope, linkElement: Element) {
          const controller = getController(linkElement);

          if (controller) {
            initFn(controller);
          } else {
            initFn(scope);
          }
        },
      };
    },
  };
}
