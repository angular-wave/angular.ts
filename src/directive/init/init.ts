import { _attributes, _parse } from "../../injection-tokens.ts";
import { getController } from "../../shared/dom.ts";

ngInitDirective.$inject = [_parse, _attributes];

export function ngInitDirective(
  $parse: ng.ParseService,
  $attributes: ng.AttributesService,
): ng.Directive {
  return {
    priority: 450,
    compile(element: Element) {
      const initFn = $parse($attributes.read(element, "ngInit") ?? "");

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
