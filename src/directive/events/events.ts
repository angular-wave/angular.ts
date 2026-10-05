import { _exceptionHandler, _parse } from "../../injection-tokens.ts";
import { directiveNormalize, isString } from "../../shared/utils.ts";
import {
  getInheritedData,
  getNormalizedAttr,
  hasNormalizedAttr,
} from "../../shared/dom.ts";
import {
  AFTER_RENDER_EVENT_SCHEDULER_KEY,
  type AfterRenderEventScheduler,
} from "../../core/render/after-render.ts";
import {
  addScopeDelegatedEventListener,
  addScopeEventListener,
  canDelegateEvent,
} from "../../core/render/event-dispatcher.ts";
import { EVENT_SCOPE } from "../../core/scope/scope.ts";
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

type EventDirectiveFactory = ng.DirectiveFactory;

interface EventBehavior {
  _prevent: boolean;
  _stop: boolean;
  _listenerOptions?: AddEventListenerOptions;
}

interface EventLinkState {
  _delegated: boolean;
  _eventBehavior: EventBehavior;
  _eventName: string;
  _exceptionHandler: ng.ExceptionHandlerService;
  _fn: ReturnType<ng.ParseService>;
  _handler?: EventListener;
}

function directiveNameForEvent(eventName: NgEventName): NgEventDirectiveName {
  return directiveNormalize(`ng-${eventName}`) as NgEventDirectiveName;
}

type EventScopeTarget = Element & { [EVENT_SCOPE]?: ng.Scope };

function createEventDirectiveFactory(
  eventName: NgEventName,
): EventDirectiveFactory {
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

export const ngEventDirectives: Record<
  NgEventDirectiveName,
  EventDirectiveFactory
> = EVENT_NAMES.reduce(
  (directives, eventName) => {
    directives[directiveNameForEvent(eventName)] =
      createEventDirectiveFactory(eventName);

    return directives;
  },
  {} as Record<NgEventDirectiveName, EventDirectiveFactory>,
);

export const ngClickDirective = ngEventDirectives.ngClick;

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
    compile(element: Element) {
      const expression: unknown = getNormalizedAttr(element, directiveName);

      if (!isString(expression)) return () => undefined;

      const eventBehavior = readEventBehavior(element);

      return {
        post: linkEventDirective,
        _postLinkCtx: {
          _delegated:
            eventBehavior._listenerOptions === undefined &&
            canDelegateEvent(eventName),
          _eventBehavior: eventBehavior,
          _eventName: eventName,
          _exceptionHandler: $exceptionHandler,
          _fn: $parse(expression),
        },
      } as unknown as ng.DirectivePrePost;
    },
  };
}

/** Links an event directive from immutable compile-time state. */
function linkEventDirective(
  linkState: EventLinkState,
  scope: ng.Scope,
  element: Element,
): void {
  const eventTarget = element as EventScopeTarget;
  eventTarget[EVENT_SCOPE] = scope;

  const handler = (linkState._handler ??= function eventHandler(
    this: EventScopeTarget,
    event: Event,
  ): void {
    const linkedScope = this[EVENT_SCOPE];

    if (!linkedScope) return;

    if (linkState._eventBehavior._prevent) {
      event.preventDefault();
    }

    if (linkState._eventBehavior._stop) {
      event.stopPropagation();
    }

    try {
      linkState._fn(linkedScope, { $event: event });
    } catch (error) {
      linkState._exceptionHandler(error);
    } finally {
      scheduleEventAfterRender(linkedScope, this);
    }
  });

  if (linkState._delegated) {
    addScopeDelegatedEventListener(
      scope,
      element,
      linkState._eventName,
      handler,
    );
  } else {
    addScopeEventListener(
      scope,
      element,
      linkState._eventName,
      handler,
      linkState._eventBehavior._listenerOptions,
    );
  }
}

function readEventBehavior(element: Element): EventBehavior {
  const prevent = hasNormalizedAttr(element, "eventPrevent");
  const stop = hasNormalizedAttr(element, "eventStop");
  const capture = hasNormalizedAttr(element, "eventCapture");
  const once = hasNormalizedAttr(element, "eventOnce");
  const passive = hasNormalizedAttr(element, "eventPassive");

  if (prevent && passive) {
    throw new Error(
      "data-event-prevent cannot be combined with data-event-passive because passive listeners cannot prevent default.",
    );
  }

  return {
    _prevent: prevent,
    _stop: stop,
    _listenerOptions:
      capture || once || passive
        ? {
            capture,
            once,
            passive,
          }
        : undefined,
  };
}

function scheduleEventAfterRender(scope: ng.Scope, element: Element): void {
  const scheduler = getInheritedData(
    element,
    AFTER_RENDER_EVENT_SCHEDULER_KEY,
  ) as AfterRenderEventScheduler | undefined;
  const scheduleCallback = (
    scope as {
      _scheduleCallback?: (callback: () => void) => void;
    }
  )._scheduleCallback;

  if (!scheduler) {
    return;
  }

  if (scheduleCallback) {
    scheduleCallback.call(scope, scheduler);
    return;
  }

  scheduler();
}

/**
 * Creates a directive that evaluates an expression when a global event target fires.
 */
export function createWindowEventDirective(
  $parse: ng.ParseService,
  $exceptionHandler: ng.ExceptionHandlerService,
  target: Window | Document,
  directiveName: string,
  eventName: string,
): ng.Directive {
  return {
    restrict: "A",
    compile(element: Element) {
      const expression: unknown = getNormalizedAttr(element, directiveName);

      if (!isString(expression)) return () => undefined;

      const fn = $parse(expression);

      return (scope: ng.Scope): void => {
        const handler = (event: Event): void => {
          try {
            fn(scope, { $event: event });
          } catch (error) {
            $exceptionHandler(error);
          } finally {
            scheduleEventAfterRender(scope, element);
          }
        };

        addScopeEventListener(scope, target, eventName, handler);
      };
    },
  };
}
