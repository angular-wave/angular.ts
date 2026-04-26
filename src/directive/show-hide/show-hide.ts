import { $injectTokens } from "../../injection-tokens.ts";
import {
  createLazyAnimate,
  getAnimateForNode,
} from "../../animations/lazy-animate.ts";
import type { Attributes } from "../../core/compile/attributes.ts";

const NG_HIDE_CLASS = "ng-hide";

const NG_HIDE_IN_PROGRESS_CLASS = "ng-hide-animate";

ngShowDirective.$inject = [$injectTokens._injector];
/**
 * Removes the `ng-hide` class when the watched expression becomes truthy.
 */
export function ngShowDirective($injector: ng.InjectorService): ng.Directive {
  const getAnimate = createLazyAnimate($injector);

  return {
    restrict: "A",
    link(
      scope: ng.Scope,
      element: Element,
      $attr: Attributes & Record<string, string>,
    ): void {
      scope.$watch($attr.ngShow, (value: boolean) => {
        // we're adding a temporary, animation-specific class for ng-hide since this way
        // we can control when the element is actually displayed on screen without having
        // to have a global/greedy CSS selector that breaks when other animations are run.
        // Read: https://github.com/angular/angular.ts/issues/9103#issuecomment-58335845
        const animate = getAnimateForNode(getAnimate, element);

        if (animate) {
          animate[value ? "removeClass" : "addClass"](element, NG_HIDE_CLASS, {
            tempClasses: NG_HIDE_IN_PROGRESS_CLASS,
          });
        } else {
          if (value) {
            element.classList.remove(NG_HIDE_CLASS);
          } else {
            element.classList.add(NG_HIDE_CLASS);
          }
        }
      });
    },
  };
}

ngHideDirective.$inject = [$injectTokens._injector];
/**
 * Adds the `ng-hide` class when the watched expression becomes truthy.
 */
export function ngHideDirective($injector: ng.InjectorService): ng.Directive {
  const getAnimate = createLazyAnimate($injector);

  return {
    restrict: "A",
    link(
      scope: ng.Scope,
      element: Element,
      attr: Attributes & Record<string, string>,
    ): void {
      scope.$watch(attr.ngHide, (value: boolean) => {
        // The comment inside of the ngShowDirective explains why we add and
        // remove a temporary class for the show/hide animation
        const animate = getAnimateForNode(getAnimate, element);

        if (animate) {
          animate[value ? "addClass" : "removeClass"](element, NG_HIDE_CLASS, {
            tempClasses: NG_HIDE_IN_PROGRESS_CLASS,
          });
        } else {
          if (value) {
            element.classList.add(NG_HIDE_CLASS);
          } else {
            element.classList.remove(NG_HIDE_CLASS);
          }
        }
      });
    },
  };
}
