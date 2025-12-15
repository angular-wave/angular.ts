import { getController } from "../../shared/dom.js";

/**
 * @returns {ng.Directive}
 */
export function ngInitDirective() {
  return {
    priority: 450,
    compile() {
      return {
        pre(scope, element, attrs) {
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
