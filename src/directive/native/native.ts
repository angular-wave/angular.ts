import {
  _compile,
  _exceptionHandler,
  _injector,
  _log,
  _native,
  _parse,
} from "../../injection-tokens.ts";
import { createLazyAnimate } from "../../animations/lazy-animate.ts";
import {
  getRealtimeProtocolContent,
  isRealtimeProtocolMessage,
  type SwapModeType,
} from "../realtime/protocol.ts";
import { createRealtimeSwapHandler } from "../realtime/swap.ts";
import {
  isDefined,
  isObject,
  isString,
  uppercase,
} from "../../shared/utils.ts";
import { getEventNameForElement } from "../events/event-name.ts";

type NativeComponentEventHandler = (
  context?: ng.Scope,
  locals?: object,
) => unknown;

ngNativeDirective.$inject = [
  _native,
  _parse,
  _compile,
  _log,
  _exceptionHandler,
  _injector,
];

/** Calls a native component from markup and projects the reply into scope. */
export function ngNativeDirective(
  $native: ng.NativeService,
  $parse: ng.ParseService,
  $compile: ng.CompileService,
  $log: ng.LogService,
  $exceptionHandler: ng.ExceptionHandlerService,
  $injector: ng.InjectorService,
): ng.Directive {
  const getAnimate = createLazyAnimate($injector);

  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement, attrs: ng.Attributes): void {
      const attr = attributeReader(attrs);

      const target = attrs.ngNative;

      if (!target) {
        $log.warn("ngNative: missing native target");

        return;
      }

      const eventName = attr("trigger") || getEventNameForElement(element);

      const paramsExpression = attr("params");

      const paramsFn = paramsExpression ? $parse(paramsExpression) : undefined;

      const handleSwapResponse = createRealtimeSwapHandler({
        $compile,
        $log,
        getAnimate,
        scope,
        attrs,
        element,
        logPrefix: "ngNative",
      });

      element.addEventListener(eventName, async () => {
        if (element.hasAttribute("disabled")) return;

        const method = attr("event") || attr("method") || "call";

        let params: unknown;

        try {
          params = paramsFn?.(scope);
        } catch (error) {
          $exceptionHandler(error);
        }

        try {
          attrs.$set("loading", true);
          const result = await $native.call(target, method, params, {
            scopeId: scope.$id,
            elementId: element.id,
          });

          handleResult(result);
        } catch (error) {
          handleError(error);
        } finally {
          attrs.$set("loading", false);
        }
      });

      if (eventName === "load") {
        element.dispatchEvent(new Event("load"));
      }

      function handleResult(result: unknown): void {
        const onResult = attr("onResult");

        if (isDefined(onResult)) {
          $parse(onResult)(scope, {
            $result: result,
            $reply: result,
          });
          scope.$flushQueue();

          return;
        }

        if (isRealtimeProtocolMessage(result)) {
          const content = getRealtimeProtocolContent(result);

          if (
            isDefined(content) ||
            result.swap === "delete" ||
            result.swap === "none"
          ) {
            handleSwapResponse(
              isString(content) || isObject(content)
                ? content
                : String(content),
              (result.swap || attr("swap") || "innerHTML") as SwapModeType,
              { targetSelector: result.target },
            );
          }

          return;
        }

        if (isString(result)) {
          element.textContent = result;
        }
      }

      function handleError(error: unknown): void {
        const onError = attr("onError");

        if (isDefined(onError)) {
          $parse(onError)(scope, { $error: error });
          scope.$flushQueue();

          return;
        }

        $log.error("ngNative: native call failed", error);
      }
    },
  };
}

ngNativeComponentDirective.$inject = [
  _native,
  _parse,
  _compile,
  _log,
  _exceptionHandler,
  _injector,
];

/** Reserves a DOM host for a native component mounted by the native shell. */
export function ngNativeComponentDirective(
  $native: ng.NativeService,
  $parse: ng.ParseService,
  $compile: ng.CompileService,
  $log: ng.LogService,
  $exceptionHandler: ng.ExceptionHandlerService,
  $injector: ng.InjectorService,
): ng.Directive {
  const getAnimate = createLazyAnimate($injector);

  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement, attrs: ng.Attributes): void {
      const attr = attributeReader(attrs);
      const name = attrs.ngNativeComponent;

      if (!name) {
        $log.warn("ngNativeComponent: missing component name");

        return;
      }

      const componentId =
        element.id || `ng-native-component-${scope.$id}-${nextComponentId++}`;

      element.id = componentId;
      element.setAttribute("data-native-component-host", name);

      const propsExpression = attr("props") || attr("params");
      const propsFn = propsExpression ? $parse(propsExpression) : undefined;
      const onClickExpression = attr("onClick");
      const onClickFn = onClickExpression
        ? $parse(onClickExpression)
        : undefined;
      const onSelectExpression = attr("onSelect");
      const onSelectFn = onSelectExpression
        ? $parse(onSelectExpression)
        : undefined;

      const handleSwapResponse = createRealtimeSwapHandler({
        $compile,
        $log,
        getAnimate,
        scope,
        attrs,
        element,
        logPrefix: "ngNativeComponent",
      });

      let mounted = false;
      let raf = 0;
      let destroyed = false;
      let disconnectedFrames = 0;

      const resizeObserver =
        "ResizeObserver" in window
          ? new ResizeObserver(() => scheduleUpdate())
          : undefined;

      resizeObserver?.observe(element);
      window.addEventListener("resize", scheduleUpdate);
      window.addEventListener("scroll", scheduleUpdate, true);

      const unwatch = propsExpression
        ? scope.$watch(propsExpression, () => scheduleUpdate())
        : undefined;

      const unsubscribeClick = $native.on("component", "click", (event) => {
        if (!isObject(event.data)) return;

        if ((event.data as { id?: unknown }).id !== componentId) return;

        handleComponentEvent(onClickFn, event);
      });

      const unsubscribeSelect = $native.on("component", "select", (event) => {
        if (!isObject(event.data)) return;

        if ((event.data as { id?: unknown }).id !== componentId) return;

        handleComponentEvent(onSelectFn, event);
      });

      element.addEventListener("click", handleDomClick);

      scope.$on("$destroy", cleanup);

      scheduleUpdate();

      function cleanup(): void {
        if (destroyed) return;

        destroyed = true;
        if (raf) cancelAnimationFrame(raf);
        resizeObserver?.disconnect();
        window.removeEventListener("resize", scheduleUpdate);
        window.removeEventListener("scroll", scheduleUpdate, true);
        element.removeEventListener("click", handleDomClick);
        unwatch?.();
        unsubscribeClick();
        unsubscribeSelect();

        if (mounted && $native.adapter()) {
          $native
            .call("component", "unmount", { id: componentId }, { timeout: 0 })
            .catch((error) =>
              $log.warn("ngNativeComponent: unmount failed", error),
            );
        }
      }

      function scheduleUpdate(): void {
        if (destroyed || raf) return;

        raf = requestAnimationFrame(() => {
          raf = 0;
          mountOrUpdate();
        });
      }

      function handleDomClick(event: Event): void {
        handleComponentEvent(onClickFn, event);
      }

      function handleComponentEvent(
        fn: NativeComponentEventHandler | undefined,
        event: Event | ng.NativeEventMessage,
      ): void {
        if (!fn) return;

        fn(scope, {
          $data: "data" in event ? event.data : undefined,
          $event: event,
        });
        scope.$flushQueue();
      }

      async function mountOrUpdate(): Promise<void> {
        if (!element.isConnected) {
          if (mounted || disconnectedFrames > 4) {
            cleanup();
          } else {
            disconnectedFrames++;
            scheduleUpdate();
          }

          return;
        }

        disconnectedFrames = 0;

        let props: unknown;

        try {
          props = propsFn?.(scope) || {};
        } catch (error) {
          $exceptionHandler(error);
          props = {};
        }

        try {
          const result = await $native.call(
            "component",
            mounted ? "update" : "mount",
            {
              id: componentId,
              name,
              props,
              rect: readElementRect(element),
            },
          );

          mounted = true;
          if (element.isConnected) handleResult(result);
        } catch (error) {
          $log.warn("ngNativeComponent: native component unavailable", error);
        }
      }

      function handleResult(result: unknown): void {
        if (!isRealtimeProtocolMessage(result)) return;

        const content = getRealtimeProtocolContent(result);

        if (
          isDefined(content) ||
          result.swap === "delete" ||
          result.swap === "none"
        ) {
          handleSwapResponse(
            isString(content) || isObject(content) ? content : String(content),
            (result.swap || attr("swap") || "innerHTML") as SwapModeType,
            { targetSelector: result.target },
          );
        }
      }
    },
  };
}

ngNativeEventDirective.$inject = [_native, _parse, _compile, _log, _injector];

/** Subscribes markup to native events pushed from the native shell. */
export function ngNativeEventDirective(
  $native: ng.NativeService,
  $parse: ng.ParseService,
  $compile: ng.CompileService,
  $log: ng.LogService,
  $injector: ng.InjectorService,
): ng.Directive {
  const getAnimate = createLazyAnimate($injector);

  return {
    restrict: "A",
    link(scope: ng.Scope, element: HTMLElement, attrs: ng.Attributes): void {
      const attr = attributeReader(attrs);

      const [target, event] = parseNativeEvent(
        attrs.ngNativeEvent,
        attr("event"),
      );

      const handleSwapResponse = createRealtimeSwapHandler({
        $compile,
        $log,
        getAnimate,
        scope,
        attrs,
        element,
        logPrefix: "ngNativeEvent",
      });

      const unsubscribe = $native.on(target, event, (nativeEvent) => {
        const { data } = nativeEvent;

        const onEvent = attr("onEvent");

        if (isDefined(onEvent)) {
          $parse(onEvent)(scope, {
            $data: data,
            $event: nativeEvent,
          });
          scope.$flushQueue();

          return;
        }

        if (isRealtimeProtocolMessage(data)) {
          const content = getRealtimeProtocolContent(data);

          if (
            isDefined(content) ||
            data.swap === "delete" ||
            data.swap === "none"
          ) {
            handleSwapResponse(
              isString(content) || isObject(content)
                ? content
                : String(content),
              (data.swap || attr("swap") || "innerHTML") as SwapModeType,
              { targetSelector: data.target },
            );
          }

          return;
        }

        if (isObject(data)) {
          scope.$merge(data);
        } else if (isString(data)) {
          element.textContent = data;
        }
      });

      scope.$on("$destroy", unsubscribe);
    },
  };
}

function attributeReader(
  attrs: ng.Attributes,
): (name: string) => string | undefined {
  return (name: string): string | undefined =>
    attrs[name] || attrs[`data${uppercase(name[0])}${name.slice(1)}`];
}

let nextComponentId = 1;

function readElementRect(element: HTMLElement): Record<string, number> {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    pageX: rect.left + window.scrollX,
    pageY: rect.top + window.scrollY,
  };
}

function parseNativeEvent(
  value: string | undefined,
  eventAttr: string | undefined,
): [string, string] {
  if (!value) return ["*", eventAttr || "*"];

  if (value.includes(".")) {
    const [target, event] = value.split(".", 2);

    return [target || "*", event || eventAttr || "*"];
  }

  if (value.includes(":")) {
    const [target, event] = value.split(":", 2);

    return [target || "*", event || eventAttr || "*"];
  }

  return [value, eventAttr || "*"];
}
