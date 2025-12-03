import { getController } from "../../shared/dom.js";

/**
 * @returns {import('../../interface.ts').Directive}
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
