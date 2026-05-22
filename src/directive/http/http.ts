import {
  _compile,
  _http,
  _injector,
  _interpolate,
  _log,
  _parse,
  _sse,
  _state,
  _stream,
} from "../../injection-tokens.ts";
import { Http } from "../../services/http/http.ts";
import { addClass, removeClass } from "../../animations/class-mutation.ts";
import { createLazyAnimate } from "../../animations/lazy-animate.ts";
import type { ConnectionEvent } from "../../services/connection/connection-manager.ts";
import {
  callBackAfterFirst,
  isDefined,
  isInstanceOf,
  isObject,
  stringify,
  toKeyValue,
  uppercase,
  wait,
  isString,
} from "../../shared/utils.ts";
import { getEventNameForElement } from "../events/event-name.ts";
import {
  getRealtimeProtocolContent,
  isRealtimeProtocolMessage,
  type RealtimeProtocolMessage,
  type SwapModeType,
} from "../realtime/protocol.ts";
import { observeNormalizedAttribute } from "../attrs/observe-normalized.ts";
import { createRealtimeSwapHandler } from "../realtime/swap.ts";
import {
  getNormalizedAttr,
  getNormalizedAttrName,
  hasNormalizedAttr,
  setNormalizedAttr,
} from "../../shared/dom.ts";

export {
  SwapMode,
  type RealtimeProtocolEventDetail,
  type RealtimeProtocolMessage,
  type SseProtocolEventDetail,
  type SseProtocolMessage,
  type SwapModeType,
} from "../realtime/protocol.ts";

type HttpDirectiveMethod = "get" | "delete" | "post" | "put";

type HttpDirectiveElement = HTMLElement & {
  form?: HTMLFormElement | null;
  name?: string;
  value?: string;
  disabled?: boolean;
};

type HttpResponsePayload = ReadableStream<Uint8Array> | string | object;

type RequestShortcutConfigWithHeaders = ng.RequestShortcutConfig & {
  headers?: Record<string, string>;
};

/** Creates a directive factory wrapper for one HTTP method attribute. */
function defineDirective(
  method: HttpDirectiveMethod,
  attrOverride?: string,
): ng.DirectiveFactory {
  const attrName =
    attrOverride ?? `ng${uppercase(method.charAt(0))}${method.slice(1)}`;

  const directive = createHttpDirective(
    method,
    attrName,
  ) as ng.DirectiveFactory & {
    $inject?: string[];
  };

  directive.$inject = [
    _http,
    _compile,
    _log,
    _parse,
    _interpolate,
    _state,
    _sse,
    _injector,
    _stream,
  ];

  return directive;
}

export const ngGetDirective: ng.DirectiveFactory = defineDirective("get");

export const ngDeleteDirective: ng.DirectiveFactory = defineDirective("delete");

export const ngPostDirective: ng.DirectiveFactory = defineDirective("post");

export const ngPutDirective: ng.DirectiveFactory = defineDirective("put");

export const ngSseDirective: ng.DirectiveFactory = defineDirective(
  "get",
  "ngSse",
);

/** Creates an HTTP directive factory that supports GET, DELETE, POST, and PUT. */
export function createHttpDirective(
  method: HttpDirectiveMethod,
  attrName: string,
): ng.DirectiveFactory {
  /** Builds the runtime directive instance with HTTP, SSE, compile, and routing helpers. */
  return function (
    $http: ng.HttpService,
    $compile: ng.CompileService,
    $log: ng.LogService,
    $parse: ng.ParseService,
    $interpolate: ng.InterpolateService,
    $state: ng.StateService,
    $sse: ng.SseService,
    $injector: ng.InjectorService,
    $stream: ng.StreamService,
  ): ng.Directive {
    const getAnimate = createLazyAnimate($injector);

    /** Collects form data from the element or its associated form. */
    function collectFormData(
      element: HttpDirectiveElement,
    ): Record<string, unknown> {
      let form: HTMLFormElement | null = null;

      const tag = element.tagName.toLowerCase();

      if (tag === "form") {
        form = element as HTMLFormElement;
      } else if ("form" in element && element.form) {
        const { form: associatedForm } = element;

        form = associatedForm;
      } else if (element.hasAttribute("form")) {
        const formId = element.getAttribute("form");

        if (formId) {
          const maybeForm = document.getElementById(formId);

          if (maybeForm?.tagName.toLowerCase() === "form") {
            form = maybeForm as HTMLFormElement;
          }
        }
      }

      if (!form) {
        if (
          "name" in element &&
          isString(element.name) &&
          element.name.length > 0
        ) {
          if (
            isInstanceOf(element, HTMLInputElement) ||
            isInstanceOf(element, HTMLTextAreaElement) ||
            isInstanceOf(element, HTMLSelectElement)
          ) {
            const key = element.name;

            const { value } = element;

            return { [key]: value };
          }
        }

        return {};
      }

      const formData = new FormData(form);

      const data: Record<string, FormDataEntryValue> = {};

      formData.forEach((value, key) => {
        data[key] = value;
      });

      return data;
    }

    return {
      restrict: "A",
      link(scope: ng.Scope, element: HttpDirectiveElement) {
        const readAttr = (name: string): string | undefined => {
          const value = getNormalizedAttr(element, name);

          if (!value?.includes("{{")) return value;

          const interpolated = $interpolate(value)?.(scope);

          return interpolated == null ? undefined : stringify(interpolated);
        };

        const hasAttr = (name: string): boolean =>
          hasNormalizedAttr(element, name);

        const setAttr = (
          name: string,
          value: string | boolean | null | undefined,
        ): void => {
          setNormalizedAttr(element, name, value, {
            attrName: getNormalizedAttrName(element, name),
          });
        };

        const eventName =
          readAttr("trigger") ?? getEventNameForElement(element);

        const tag = element.tagName.toLowerCase();

        if (hasAttr("latch")) {
          const dispatchAfterFirst = callBackAfterFirst(() => {
            element.dispatchEvent(new Event(eventName));
          });

          dispatchAfterFirst();
          observeNormalizedAttribute(
            scope,
            element,
            "latch",
            dispatchAfterFirst,
          );
        }

        let throttled = false;

        let intervalId: ReturnType<typeof setInterval> | undefined;

        let resolveDestroy: (() => void) | undefined;

        const destroyPromise = new Promise<void>((resolve) => {
          resolveDestroy = resolve;
        });

        const destroyController = new AbortController();

        scope.$on("$destroy", () => {
          resolveDestroy?.();
          resolveDestroy = undefined;
          destroyController.abort("scope destroyed");

          if (intervalId) clearInterval(intervalId);
        });

        if (hasAttr("interval")) {
          const interval = readAttr("interval");

          element.dispatchEvent(new Event(eventName));
          intervalId = setInterval(
            () => element.dispatchEvent(new Event(eventName)),
            parseInt(interval ?? "") || 1000,
          );
        }

        const handleSwapResponse = createRealtimeSwapHandler({
          $compile,
          $log,
          getAnimate,
          scope,
          element,
          logPrefix: attrName,
        });

        async function handleStreamResponse(
          stream: ReadableStream<Uint8Array>,
          swap: SwapModeType,
        ): Promise<void> {
          await $stream.consumeText(stream, {
            signal: destroyController.signal,
            onChunk(chunk) {
              if (chunk) handleSwapResponse(chunk, swap);
            },
          });
        }

        function createRequestConfig(): RequestShortcutConfigWithHeaders {
          const config: RequestShortcutConfigWithHeaders = {};

          const enctype = readAttr("enctype");

          if (enctype) {
            config.headers = {
              "Content-Type": enctype,
            };
          }

          if (
            readAttr("responseType") === "stream" ||
            hasAttr("stream") ||
            hasAttr("responseStream")
          ) {
            config.responseType = "stream";
          }

          config.timeout = destroyPromise;

          return config;
        }

        function dispatchSseEvent(name: string, detail: object): boolean {
          return element.dispatchEvent(
            new CustomEvent(`ng:sse:${name}`, {
              bubbles: true,
              cancelable: true,
              detail,
            }),
          );
        }

        function parseSseEventTypes(): string[] {
          const sseEvents = readAttr("sseEvents");

          if (!isString(sseEvents)) return [];

          return sseEvents
            .split(",")
            .map((eventType: string) => eventType.trim())
            .filter(Boolean);
        }

        function handleSseProtocolMessage(
          data: RealtimeProtocolMessage,
          swap: SwapModeType,
          event: Event | MessageEvent,
          source: ng.SseConnection,
        ): void {
          const html = getRealtimeProtocolContent(data);

          const nextSwap = data.swap ?? swap;

          if (!dispatchSseEvent("message", { data, event, source })) {
            source.close();

            return;
          }

          if (isDefined(html)) {
            handleSwapResponse(
              isString(html) || isObject(html) ? html : String(html),
              nextSwap,
              { targetSelector: data.target },
            );
            dispatchSseEvent("swapped", { data, event, source });
          }
        }

        element.addEventListener(eventName, (event: Event) => {
          void (async () => {
            if ((element as HTMLButtonElement).disabled) return;

            if (tag === "form") event.preventDefault();
            const swap = (readAttr("swap") ?? "innerHTML") as SwapModeType;

            const url = readAttr(attrName);

            if (!url) {
              $log.warn(`${attrName}: no URL specified`);

              return;
            }

            const handler = (res: ng.HttpResponse<unknown>) => {
              if (hasAttr("loading")) {
                setAttr("loading", false);
              }

              const loadingClass = readAttr("loadingClass");

              if (isDefined(loadingClass)) {
                removeClass(element, loadingClass, getAnimate);
              }

              const html: unknown = res.data;

              if (
                Http._OK <= res.status &&
                res.status <= Http._MultipleChoices - 1
              ) {
                const success = readAttr("success");

                if (isDefined(success)) {
                  $parse(success)(scope, { $res: html });
                }

                const stateSuccess = readAttr("stateSuccess");

                if (isDefined(stateSuccess)) {
                  void $state.go(stateSuccess);
                }
              } else if (
                Http._BadRequest <= res.status &&
                res.status <= Http._ErrorMax
              ) {
                const error = readAttr("error");

                if (isDefined(error)) {
                  $parse(error)(scope, { $res: html });
                }

                const stateError = readAttr("stateError");

                if (isDefined(stateError)) {
                  void $state.go(stateError);
                }
              }

              if ($stream.isReadableStream(html)) {
                handleStreamResponse(html, swap).catch((error: unknown) => {
                  $log.error(`${attrName}: stream error`, error);
                });
              } else if (isObject(html)) {
                const target = readAttr("target");

                if (target) {
                  $parse(target)._assign?.(scope, html);
                } else {
                  scope.$merge(html);
                }
              } else if (isString(html)) {
                handleSwapResponse(html, swap);
              }
            };

            const delay = readAttr("delay");

            if (isDefined(delay)) {
              await wait(parseInt(delay) | 0);
            }

            if (scope._destroyed) return;

            if (throttled) return;

            const throttle = readAttr("throttle");

            if (isDefined(throttle)) {
              throttled = true;
              setAttr("throttled", true);
              setTimeout(() => {
                setAttr("throttled", false);
                throttled = false;
              }, parseInt(throttle));
            }

            if (hasAttr("loading")) {
              setAttr("loading", true);
            }

            const loadingClass = readAttr("loadingClass");

            if (isDefined(loadingClass)) {
              addClass(element, loadingClass, getAnimate);
            }

            if (method === "post" || method === "put") {
              let data: unknown;

              const config = createRequestConfig();

              if (readAttr("enctype")) {
                data = toKeyValue(collectFormData(element));
              } else {
                data = collectFormData(element);
              }
              $http[method](url, data, config).then(handler).catch(handler);
            } else {
              if (method === "get" && hasAttr("ngSse")) {
                const sseUrl = url;

                const sourceRef: { current?: ng.SseConnection } = {};

                const config: ng.SseConfig = {
                  withCredentials: readAttr("withCredentials") === "true",
                  eventTypes: parseSseEventTypes(),
                  transformMessage: (data: string) => {
                    try {
                      return JSON.parse(data) as unknown;
                    } catch {
                      return data;
                    }
                  },
                  onOpen: () => {
                    $log.info(
                      `${attrName}: SSE connection opened to ${sseUrl}`,
                    );

                    if (!dispatchSseEvent("open", { url: sseUrl })) {
                      sourceRef.current?.close();

                      return;
                    }

                    if (hasAttr("loading")) {
                      setAttr("loading", false);
                    }

                    const sseLoadingClass = readAttr("loadingClass");

                    if (isDefined(sseLoadingClass))
                      removeClass(element, sseLoadingClass, getAnimate);
                  },
                  onEvent: ({
                    data,
                    event: messageEvent,
                    type,
                  }: ConnectionEvent) => {
                    const source = sourceRef.current;

                    if (!source) return;

                    if (type !== "message") {
                      const proceed = dispatchSseEvent(type, {
                        data,
                        event: messageEvent,
                        source,
                      });

                      if (!proceed) {
                        source.close();

                        return;
                      }

                      if (!isRealtimeProtocolMessage(data)) return;
                    }

                    if (isRealtimeProtocolMessage(data)) {
                      handleSseProtocolMessage(
                        data,
                        swap,
                        messageEvent,
                        source,
                      );

                      return;
                    }

                    if (
                      !dispatchSseEvent("message", {
                        data,
                        event: messageEvent,
                        source,
                      })
                    ) {
                      source.close();

                      return;
                    }

                    const res: Pick<
                      ng.HttpResponse<unknown>,
                      "status" | "data"
                    > = {
                      status: 200,
                      data,
                    };

                    handler(res as ng.HttpResponse<HttpResponsePayload>);
                    dispatchSseEvent("swapped", {
                      data,
                      event: messageEvent,
                      source,
                    });
                  },
                  onError: (err: unknown) => {
                    const source = sourceRef.current;

                    dispatchSseEvent("error", { error: err, source });
                    $log.error(`${attrName}: SSE error`, err);
                    const res: Pick<
                      ng.HttpResponse<unknown>,
                      "status" | "data"
                    > = {
                      status: 500,
                      data: err,
                    };

                    handler(res as ng.HttpResponse<HttpResponsePayload>);
                  },
                  onReconnect: (count: number) => {
                    $log.info(`ngSse: reconnected ${String(count)} time(s)`);

                    const onReconnect = readAttr("onReconnect");

                    if (onReconnect)
                      $parse(onReconnect)(scope, { $count: count });
                  },
                };

                const source = $sse(sseUrl, config);

                sourceRef.current = source;

                scope.$on("$destroy", () => {
                  $log.info(`${attrName}: closing SSE connection`);
                  dispatchSseEvent("close", { source });
                  source.close();
                });
              } else {
                $http[method](url, createRequestConfig())
                  .then(handler)
                  .catch(handler);
              }
            }
          })();
        });

        if (eventName === "load") {
          element.dispatchEvent(new Event("load"));
        }
      },
    };
  };
}
