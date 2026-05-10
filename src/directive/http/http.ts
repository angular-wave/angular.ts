import {
  _compile,
  _http,
  _injector,
  _log,
  _parse,
  _sse,
  _state,
  _stream,
} from "../../injection-tokens.ts";
import { Http } from "../../services/http/http.ts";
import { NodeType } from "../../shared/node.ts";
import {
  createDocumentFragment,
  emptyElement,
  removeElement,
} from "../../shared/dom.ts";
import { createLazyAnimate } from "../../animations/lazy-animate.ts";
import type { ConnectionEvent } from "../../services/connection/connection-manager.ts";
import {
  arrayFrom,
  callBackAfterFirst,
  isArray,
  isDefined,
  isInstanceOf,
  isObject,
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

type SwapNodes = Array<Node | ChildNode>;

type RequestShortcutConfigWithHeaders = ng.RequestShortcutConfig & {
  headers?: Record<string, string>;
};

/** Creates a directive factory wrapper for one HTTP method attribute. */
function defineDirective(
  method: HttpDirectiveMethod,
  attrOverride?: string,
): ng.DirectiveFactory {
  const attrName =
    attrOverride || `ng${uppercase(method.charAt(0))}${method.slice(1)}`;

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
    $state: ng.StateService,
    $sse: ng.SseService,
    $injector: ng.InjectorService,
    $stream: ng.StreamService,
  ): ng.Directive {
    const getAnimate = createLazyAnimate($injector);

    /** Collects form data from the element or its associated form. */
    function collectFormData(
      element: HttpDirectiveElement,
    ): Record<string, any> {
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

          if (maybeForm && maybeForm.tagName.toLowerCase() === "form") {
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
      link(
        scope: ng.Scope,
        element: HttpDirectiveElement,
        attrs: ng.Attributes & Record<string, any>,
      ) {
        const eventName = attrs.trigger || getEventNameForElement(element);

        const tag = element.tagName.toLowerCase();

        let content: ChildNode | ChildNode[] | undefined;

        if (isDefined(attrs.latch)) {
          attrs.$observe(
            "latch",
            callBackAfterFirst(() =>
              element.dispatchEvent(new Event(eventName)),
            ),
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

        if (isDefined(attrs.interval)) {
          element.dispatchEvent(new Event(eventName));
          intervalId = setInterval(
            () => element.dispatchEvent(new Event(eventName)),
            parseInt(attrs.interval) || 1000,
          );
        }

        /**
         * Handles DOM manipulation based on a swap strategy and server-rendered HTML.
         */
        function handleSwapResponse(
          html: string | object,
          swap: SwapModeType,
          scopeParam: ng.Scope,
          attrsParam: ng.Attributes & Record<string, any>,
          elementParam: Element,
        ): void {
          let animationEnabled = false;

          if (attrsParam.animate) {
            animationEnabled = true;
          }
          const animate = animationEnabled ? getAnimate() : undefined;

          let nodes: SwapNodes = [];

          if (!["textcontent", "delete", "none"].includes(swap)) {
            if (!html) return;
            const compiled = $compile(String(html))(scopeParam) as
              | DocumentFragment
              | ChildNode;

            nodes = isInstanceOf(compiled, DocumentFragment)
              ? arrayFrom(compiled.childNodes)
              : [compiled];
          }

          const targetSelector = attrsParam.target;

          const target = targetSelector
            ? document.querySelector(targetSelector)
            : elementParam;

          if (!target) {
            $log.warn(`${attrName}: target "${targetSelector}" not found`);

            return;
          }

          switch (swap) {
            case "outerHTML": {
              const parent = target.parentNode;

              if (!parent) return;

              // Build fragment for static replacement OR a list for animation
              const frag = createDocumentFragment();

              nodes.forEach((x) => frag.appendChild(x));

              if (!animationEnabled) {
                parent.replaceChild(frag, target);
                break;
              }

              const placeholder = document.createElement("span");

              placeholder.style.display = "none";
              parent.insertBefore(placeholder, target.nextSibling);

              animate!.leave(target).done(() => {
                const insertedNodes = arrayFrom(frag.childNodes);

                // Insert each node in order
                for (const x of insertedNodes) {
                  if (x.nodeType === NodeType._ELEMENT_NODE) {
                    // Animate elements
                    animate!.enter(
                      x as Element,
                      parent as Element,
                      placeholder,
                    );
                  } else {
                    // Insert text nodes statically
                    parent.insertBefore(x, placeholder);
                  }
                }

                content = insertedNodes;
                scopeParam.$flushQueue(); // flush once after all insertions
              });

              scopeParam.$flushQueue(); // flush leave animation
              break;
            }

            case "textContent":
              if (animationEnabled) {
                animate!.leave(target).done(() => {
                  target.textContent = html;
                  animate!.enter(target, target.parentNode as Element);
                  scopeParam.$flushQueue();
                });

                scopeParam.$flushQueue();
              } else {
                target.textContent = html;
              }
              break;

            case "beforebegin": {
              const parent = target.parentNode;

              if (!parent) break;

              nodes.forEach((node) => {
                if (
                  animationEnabled &&
                  node.nodeType === NodeType._ELEMENT_NODE
                ) {
                  animate!.enter(node as Element, parent as Element, target); // insert before target
                } else {
                  parent.insertBefore(node, target);
                }
              });

              if (animationEnabled) scopeParam.$flushQueue();
              break;
            }

            case "afterbegin": {
              const { firstChild } = target;

              [...nodes].reverse().forEach((node) => {
                if (
                  animationEnabled &&
                  node.nodeType === NodeType._ELEMENT_NODE
                ) {
                  animate!.enter(
                    node as Element,
                    target,
                    firstChild as Element,
                  ); // insert before first child
                } else {
                  target.insertBefore(node, firstChild);
                }
              });

              if (animationEnabled) scopeParam.$flushQueue();
              break;
            }

            case "beforeend": {
              nodes.forEach((node) => {
                if (
                  animationEnabled &&
                  node.nodeType === NodeType._ELEMENT_NODE
                ) {
                  animate!.enter(node as Element, target); // append at end
                } else {
                  target.appendChild(node);
                }
              });

              if (animationEnabled) scopeParam.$flushQueue();
              break;
            }

            case "afterend": {
              const parent = target.parentNode;

              if (!parent) break;
              const { nextSibling } = target;

              [...nodes].reverse().forEach((node) => {
                if (
                  animationEnabled &&
                  node.nodeType === NodeType._ELEMENT_NODE
                ) {
                  animate!.enter(
                    node as Element,
                    parent as Element,
                    nextSibling as Element,
                  ); // insert after target
                } else {
                  parent.insertBefore(node, nextSibling);
                }
              });

              if (animationEnabled) scopeParam.$flushQueue();
              break;
            }

            case "delete":
              if (animationEnabled) {
                animate!.leave(target).done(() => {
                  removeElement(target); // safety: actually remove in case $animate.leave didn't
                  scopeParam.$flushQueue();
                });
                scopeParam.$flushQueue();
              } else {
                removeElement(target);
              }
              break;

            case "none":
              break;

            case "innerHTML":
            default:
              if (animationEnabled) {
                if (
                  content &&
                  !isArray(content) &&
                  content.nodeType !== NodeType._TEXT_NODE
                ) {
                  animate!.leave(content as Element).done(() => {
                    content = nodes[0] as ChildNode;
                    animate!.enter(nodes[0] as Element, target);
                    scopeParam.$flushQueue();
                  });
                  scopeParam.$flushQueue();
                } else {
                  content = nodes[0] as ChildNode;

                  if (
                    content &&
                    !isArray(content) &&
                    content.nodeType === NodeType._TEXT_NODE
                  ) {
                    emptyElement(target);
                    target.replaceChildren(...nodes);
                  } else {
                    animate!.enter(nodes[0] as Element, target);
                    scopeParam.$flushQueue();
                  }
                }
              } else {
                emptyElement(target);
                target.replaceChildren(...nodes);
              }
              break;
          }
        }

        async function handleStreamResponse(
          stream: ReadableStream<Uint8Array>,
          swap: SwapModeType,
        ): Promise<void> {
          await $stream.consumeText(stream, {
            signal: destroyController.signal,
            onChunk(chunk) {
              if (chunk) handleSwapResponse(chunk, swap, scope, attrs, element);
            },
          });
        }

        function createRequestConfig(): RequestShortcutConfigWithHeaders {
          const config: RequestShortcutConfigWithHeaders = {};

          if (attrs.enctype) {
            config.headers = {
              "Content-Type": attrs.enctype,
            };
          }

          if (
            attrs.responseType === "stream" ||
            isDefined(attrs.stream) ||
            isDefined(attrs.responseStream)
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
          if (!isString(attrs.sseEvents)) return [];

          return attrs.sseEvents
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

          const nextSwap = data.swap || swap;

          const previousTarget = attrs.target;

          if (!dispatchSseEvent("message", { data, event, source })) {
            source.close();

            return;
          }

          if (isDefined(html)) {
            if (data.target) attrs.target = data.target;

            try {
              handleSwapResponse(
                isString(html) || isObject(html) ? html : String(html),
                nextSwap,
                scope,
                attrs,
                element,
              );
              dispatchSseEvent("swapped", { data, event, source });
            } finally {
              if (data.target) {
                if (isDefined(previousTarget)) {
                  attrs.target = previousTarget;
                } else {
                  delete attrs.target;
                }
              }
            }
          }
        }

        element.addEventListener(eventName, async (event: Event) => {
          if ((element as HTMLButtonElement).disabled) return;

          if (tag === "form") event.preventDefault();
          const swap = (attrs.swap as SwapModeType) || "innerHTML";

          const url = attrs[attrName];

          if (!url) {
            $log.warn(`${attrName}: no URL specified`);

            return;
          }

          const handler = (res: ng.HttpResponse<any>) => {
            if (isDefined(attrs.loading)) {
              attrs.$set("loading", false);
            }

            if (isDefined(attrs.loadingClass)) {
              attrs.$removeClass(attrs.loadingClass);
            }

            const html = res.data;

            if (
              Http._OK <= res.status &&
              res.status <= Http._MultipleChoices - 1
            ) {
              if (isDefined(attrs.success)) {
                $parse(attrs.success)(scope, { $res: html });
              }

              if (isDefined(attrs.stateSuccess)) {
                $state.go(attrs.stateSuccess);
              }
            } else if (
              Http._BadRequest <= res.status &&
              res.status <= Http._ErrorMax
            ) {
              if (isDefined(attrs.error)) {
                $parse(attrs.error)(scope, { $res: html });
              }

              if (isDefined(attrs.stateError)) {
                $state.go(attrs.stateError);
              }
            }

            if ($stream.isReadableStream(html)) {
              handleStreamResponse(html, swap).catch((error: unknown) => {
                $log.error(`${attrName}: stream error`, error);
              });
            } else if (isObject(html)) {
              if (attrs.target) {
                $parse(attrs.target)._assign?.(scope, html);
              } else {
                scope.$merge(html);
              }
            } else if (isString(html)) {
              handleSwapResponse(html, swap, scope, attrs, element);
            }
          };

          if (isDefined(attrs.delay)) {
            await wait(parseInt(attrs.delay) | 0);
          }

          if (scope._destroyed) return;

          if (throttled) return;

          if (isDefined(attrs.throttle)) {
            throttled = true;
            attrs.$set("throttled", true);
            setTimeout(() => {
              attrs.$set("throttled", false);
              throttled = false;
            }, parseInt(attrs.throttle));
          }

          if (isDefined(attrs.loading)) {
            attrs.$set("loading", true);
          }

          if (isDefined(attrs.loadingClass)) {
            attrs.$addClass(attrs.loadingClass);
          }

          if (method === "post" || method === "put") {
            let data: any;

            const config = createRequestConfig();

            if (attrs.enctype) {
              data = toKeyValue(collectFormData(element));
            } else {
              data = collectFormData(element);
            }
            $http[method](url, data, config).then(handler).catch(handler);
          } else {
            if (method === "get" && attrs.ngSse) {
              const sseUrl = url;

              const sourceRef: { current?: ng.SseConnection } = {};

              const config: ng.SseConfig = {
                withCredentials: attrs.withCredentials === "true",
                eventTypes: parseSseEventTypes(),
                transformMessage: (data: string) => {
                  try {
                    return JSON.parse(data);
                  } catch {
                    return data;
                  }
                },
                onOpen: () => {
                  $log.info(`${attrName}: SSE connection opened to ${sseUrl}`);

                  if (!dispatchSseEvent("open", { url: sseUrl })) {
                    sourceRef.current?.close();

                    return;
                  }

                  if (isDefined(attrs.loading)) attrs.$set("loading", false);

                  if (isDefined(attrs.loadingClass))
                    attrs.$removeClass(attrs.loadingClass);
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
                    handleSseProtocolMessage(data, swap, messageEvent, source);

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

                  const res = { status: 200, data };

                  handler(res as ng.HttpResponse<HttpResponsePayload>);
                  dispatchSseEvent("swapped", {
                    data,
                    event: messageEvent,
                    source,
                  });
                },
                onError: (err: any) => {
                  const source = sourceRef.current;

                  dispatchSseEvent("error", { error: err, source });
                  $log.error(`${attrName}: SSE error`, err);
                  const res = { status: 500, data: err };

                  handler(res as ng.HttpResponse<HttpResponsePayload>);
                },
                onReconnect: (count: number) => {
                  $log.info(`ngSse: reconnected ${count} time(s)`);

                  if (attrs.onReconnect)
                    $parse(attrs.onReconnect)(scope, { $count: count });
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
        });

        if (eventName === "load") {
          element.dispatchEvent(new Event("load"));
        }
      },
    };
  };
}
