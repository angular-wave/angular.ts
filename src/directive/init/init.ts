import { _parse } from "../../injection-tokens.ts";
import { getController } from "../../shared/dom.ts";

ngInitDirective.$inject = [_parse];

export function ngInitDirective($parse: ng.ParseService): ng.Directive {
  return {
    priority: 450,
    compile(_element: Element, attrs: ng.Attributes) {
      const initFn = $parse(attrs.ngInit);

      return {
        pre(scope: ng.Scope, element: Element) {
          const controller = getController(element);

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
