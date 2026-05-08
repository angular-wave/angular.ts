import { _exceptionHandler, _parse } from "../../injection-tokens.ts";
import { directiveNormalize } from "../../shared/utils.ts";
import { Attributes } from "../../core/compile/attributes.ts";
/*
 * A collection of directives that allows creation of custom event handlers that are defined as
 * AngularTS expressions and are compiled and executed within the current scope.
 */

const EVENT_NAMES = [
  "blur",
  "change",
  "click",
  "copy",
  "cut",
  "dblclick",
  "focus",
  "input",
  "keydown",
  "keyup",
  "load",
  "mousedown",
  "mouseenter",
  "mouseleave",
  "mousemove",
  "mouseout",
  "mouseover",
  "mouseup",
  "paste",
  "submit",
  "touchstart",
  "touchend",
  "touchmove",
] as const;

export type NgEventName = (typeof EVENT_NAMES)[number];

export type NgEventDirectiveName = `ng${Capitalize<NgEventName>}`;

function directiveNameForEvent(eventName: NgEventName): NgEventDirectiveName {
  return directiveNormalize(`ng-${eventName}`) as NgEventDirectiveName;
}

function createEventDirectiveFactory(
  eventName: NgEventName,
): ng.Injectable<any> {
  const directiveName = directiveNameForEvent(eventName);

  return [
    _parse,
    _exceptionHandler,

    /**
     * Creates the event directive factory for this DOM event name.
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
}

export const ngClickDirective = createEventDirectiveFactory("click");

export const ngEventDirectives: Record<
  NgEventDirectiveName,
  ng.Injectable<any>
> = EVENT_NAMES.reduce(
  (directives, eventName) => {
    directives[directiveNameForEvent(eventName)] =
      createEventDirectiveFactory(eventName);

    return directives;
  },
  {} as Record<NgEventDirectiveName, ng.Injectable<any>>,
);

/**
 * Creates a directive that evaluates an expression when the element event fires.
 */
export function createEventDirective(
  $parse: ng.ParseService,
  $exceptionHandler: ng.ExceptionHandlerService,
  directiveName: string,
  eventName: string,
): ng.Directive {
  return {
    restrict: "A",
    compile(_element: Element, attr: Attributes & Record<string, string>) {
      const fn = $parse(attr[directiveName]);

      return (scope: ng.Scope, element: Element): void => {
        const handler = (event: Event): void => {
          try {
            fn(scope, { $event: event });

            flushScopeQueue(scope);
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
 * Creates a directive that evaluates an expression when the window event fires.
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
    compile(_element: Element, attr: Attributes & Record<string, string>) {
      const fn = $parse(attr[directiveName]);

      return (scope: ng.Scope): void => {
        const handler = (event: Event): void => {
          try {
            fn(scope, { $event: event });

            flushScopeQueue(scope);
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

function flushScopeQueue(scope: ng.Scope): void {
  const rootScope = scope.$root || scope;

  if (typeof rootScope.$flushQueue === "function") {
    rootScope.$flushQueue();
  }
}
