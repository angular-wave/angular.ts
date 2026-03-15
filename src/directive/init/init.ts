import { getController } from "../../shared/dom.ts";

export function ngInitDirective(): ng.Directive {
  return {
    priority: 450,
    compile() {
      return {
        pre(scope: ng.Scope, element: Element, attrs: ng.Attributes) {
          const controller = getController(element);

          if (controller) {
            controller.$eval(attrs.ngInit);
          } else {
            scope.$eval(attrs.ngInit);
          }
        },
      };
    },
  };
}
