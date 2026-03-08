import { directiveNormalize } from "../../shared/utils.ts";
import { $injectTokens as $t } from "../../injection-tokens.ts";
/*
 * A collection of directives that allows creation of custom event handlers that are defined as
 * AngularTS expressions and are compiled and executed within the current scope.
 */

export const ngEventDirectives: Record<string, ng.Injectable<any>> = {};

"blur change click copy cut dblclick focus input keydown keyup load mousedown mouseenter mouseleave mousemove mouseout mouseover mouseup paste submit touchstart touchend touchmove"
  .split(" ")
  .forEach((eventName: string) => {
    const directiveName = directiveNormalize(`ng-${eventName}`);

    ngEventDirectives[directiveName] = [
      $t._parse,
      $t._exceptionHandler,

      /**
       * @param {ng.ParseService} $parse
       * @param {ng.ExceptionHandlerService} $exceptionHandler
       * @returns
       */
      (
        $parse: ng.ParseService,
        $exceptionHandler: ng.ExceptionHandlerService,
      ) => {
        return createEventDirective(
          $parse,
          $exceptionHandler,
          directiveName,
          eventName,
        );
      },
    ];
  });

/**
 *
 * @param {ng.ParseService} $parse
 * @param {ng.ExceptionHandlerService} $exceptionHandler
 * @param {string} directiveName
 * @param {string} eventName
 * @returns {ng.Directive}
 */
export function createEventDirective(
  $parse: ng.ParseService,
  $exceptionHandler: ng.ExceptionHandlerService,
  directiveName: string,
  eventName: string,
): ng.Directive {
  return {
    restrict: "A",
    compile(
      _element: Element,
      attr: import("../../core/compile/attributes.ts").Attributes &
        Record<string, string>,
    ) {
      const fn = $parse(attr[directiveName]);

      return (scope: ng.Scope, element: Element): void => {
        const handler = (event: Event): void => {
          try {
            fn(scope, { $event: event });
          } catch (error) {
            $exceptionHandler(error);
          }
        };

        element.addEventListener(eventName, handler);

        scope.$on("$destroy", () =>
          element.removeEventListener(eventName, handler),
        );
      };
    },
  };
}

/**
 *
 * @param {ng.ParseService} $parse
 * @param {ng.ExceptionHandlerService} $exceptionHandler
 * @param {ng.WindowService} $window
 * @param {string} directiveName
 * @param {string} eventName
 * @returns {ng.Directive}
 */
export function createWindowEventDirective(
  $parse: ng.ParseService,
  $exceptionHandler: ng.ExceptionHandlerService,
  $window: Window,
  directiveName: string,
  eventName: string,
): ng.Directive {
  return {
    restrict: "A",
    compile(
      _element: Element,
      attr: import("../../core/compile/attributes.ts").Attributes &
        Record<string, string>,
    ) {
      const fn = $parse(attr[directiveName]);

      return (scope: ng.Scope): void => {
        const handler = (event: Event): void => {
          try {
            fn(scope, { $event: event });
          } catch (error) {
            $exceptionHandler(error);
          }
        };

        $window.addEventListener(eventName, handler);

        scope.$on("$destroy", () =>
          $window.removeEventListener(eventName, handler),
        );
      };
    },
  };
}
