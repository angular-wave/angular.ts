import { $injectTokens as $t } from "../../injection-tokens.ts";
import { Http } from "../../services/http/http.ts";
import { NodeType } from "../../shared/node.ts";
import {
  callBackAfterFirst,
  isDefined,
  isInstanceOf,
  isObject,
  isString,
  toKeyValue,
  wait,
} from "../../shared/utils.ts";

type HttpDirectiveMethod = "get" | "delete" | "post" | "put";
type HttpDirectiveElement = HTMLElement & {
  form?: HTMLFormElement | null;
  name?: string;
  value?: string;
  disabled?: boolean;
};
type HttpResponsePayload = string | object;
type SwapNodes = Array<Node | ChildNode>;
type RequestShortcutConfigWithHeaders = ng.RequestShortcutConfig & {
  headers?: Record<string, string>;
};

/**
 * @param {"get" | "delete" | "post" | "put"} method - HTTP method applied to request
 * @param {string} [attrOverride] - Custom name to use for the attribute
 * @returns {ng.DirectiveFactory}
 */
function defineDirective(
  method: HttpDirectiveMethod,
  attrOverride?: string,
): ng.DirectiveFactory {
  const attrName =
    attrOverride || `ng${method.charAt(0).toUpperCase()}${method.slice(1)}`;

  const directive = createHttpDirective(
    method,
    attrName,
  ) as ng.DirectiveFactory & {
    $inject?: string[];
  };

  directive.$inject = [
    $t._http,
    $t._compile,
    $t._log,
    $t._parse,
    $t._state,
    $t._sse,
    $t._animate,
  ];

  return directive;
}

/** @type {ng.DirectiveFactory} */
export const ngGetDirective = defineDirective("get");

/** @type {ng.DirectiveFactory} */
export const ngDeleteDirective = defineDirective("delete");

/** @type {ng.DirectiveFactory} */
export const ngPostDirective = defineDirective("post");

/** @type {ng.DirectiveFactory} */
export const ngPutDirective = defineDirective("put");

/** @type {ng.DirectiveFactory} */
export const ngSseDirective = defineDirective("get", "ngSse");

/**
 * Selects DOM event to listen for based on the element type.
 *
 * @param {Element} element - The DOM element to inspect.
 * @returns {"click" | "change" | "submit"} The name of the event to listen for.
 */
export function getEventNameForElement(
  element: Element,
): "click" | "change" | "submit" {
  const tag = element.tagName.toLowerCase();

  if (["input", "textarea", "select"].includes(tag)) {
    return "change";
  } else if (tag === "form") {
    return "submit";
  }

  return "click";
}

/**
 * Creates an HTTP directive factory that supports GET, DELETE, POST, PUT.
 *
 * @param {"get" | "delete" | "post" | "put"} method - HTTP method to use.
 * @param {string} attrName - Attribute name containing the URL.
 * @returns {ng.DirectiveFactory}
 */
export function createHttpDirective(
  method: HttpDirectiveMethod,
  attrName: string,
): ng.DirectiveFactory {
  /**
   * @param {ng.HttpService} $http
   * @param {ng.CompileService} $compile
   * @param {ng.LogService} $log
   * @param {ng.ParseService} $parse
   * @param {ng.StateService} $state
   * @param {ng.SseService} $sse
   * @param {ng.AnimateService} $animate
   * @returns {ng.Directive}
   */
  return function (
    $http: ng.HttpService,
    $compile: ng.CompileService,
    $log: ng.LogService,
    $parse: ng.ParseService,
    $state: ng.StateService,
    $sse: ng.SseService,
    $animate: ng.AnimateService,
  ): ng.Directive {
    /**
     * Collects form data from the element or its associated form.
     *
     * @param {HTMLElement} element
     * @returns {Object<string, any>}
     */
    function collectFormData(
      element: HttpDirectiveElement,
    ): Record<string, any> {
      /** @type {HTMLFormElement | null} */
      let form = null;

      const tag = element.tagName.toLowerCase();

      if (tag === "form") {
        form = /** @type {HTMLFormElement} */ element;
      } else if ("form" in element && element.form) {
        // eslint-disable-next-line prefer-destructuring
        form = /** @type {HTMLFormElement} */ element.form;
      } else if (element.hasAttribute("form")) {
        const formId = element.getAttribute("form");

        if (formId) {
          const maybeForm = document.getElementById(formId);

          if (maybeForm && maybeForm.tagName.toLowerCase() === "form") {
            form = /** @type {HTMLFormElement} */ maybeForm;
          }
        }
      }

      if (!form) {
        if (
          "name" in element &&
          typeof element.name === "string" &&
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

      const formData = new FormData(form as HTMLFormElement);

      /** @type {Record<string, FormDataEntryValue>} */
      const data: Record<string, FormDataEntryValue> = {};

      formData.forEach((value, key) => {
        data[key] = value;
      });

      return data;
    }

    return /** @type {ng.Directive} */ {
      restrict: "A",
      link(
        scope: ng.Scope,
        element: HttpDirectiveElement,
        attrs: ng.Attributes & Record<string, any>,
      ) {
        const eventName = attrs.trigger || getEventNameForElement(element);

        const tag = element.tagName.toLowerCase();

        /**
         * @type {ChildNode | ChildNode[] | undefined}
         */
        let content: ChildNode | ChildNode[] | undefined = undefined;

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

        if (isDefined(attrs.interval)) {
          element.dispatchEvent(new Event(eventName));
          intervalId = setInterval(
            () => element.dispatchEvent(new Event(eventName)),
            parseInt(attrs.interval) || 1000,
          );
        }

        /**
         * Handles DOM manipulation based on a swap strategy and server-rendered HTML.
         *
         * @param {string | Object} html - The HTML string or JSON object returned from the server.
         * @param {import("./interface.ts").SwapModeType} swap
         * @param {ng.Scope} scopeParam
         * @param {ng.Attributes} attrsParam
         * @param {Element} elementParam
         */
        function handleSwapResponse(
          html: string | object,
          swap: import("./interface.ts").SwapModeType,
          scopeParam: ng.Scope,
          attrsParam: ng.Attributes & Record<string, any>,
          elementParam: Element,
        ): void {
          let animationEnabled = false;

          if (attrsParam.animate) {
            animationEnabled = true;
          }
          /**
           * @type {ChildNode[]|*[]}
           */
          let nodes: SwapNodes = [];

          if (!["textcontent", "delete", "none"].includes(swap)) {
            if (!html) return;
            const compiled = $compile(String(html))(scopeParam) as
              | DocumentFragment
              | ChildNode;

            nodes =
              compiled instanceof DocumentFragment
                ? Array.from(compiled.childNodes)
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
              const frag = document.createDocumentFragment();

              nodes.forEach((x) => frag.appendChild(x));

              if (!animationEnabled) {
                parent.replaceChild(frag, target);
                break;
              }

              const placeholder = document.createElement("span");

              placeholder.style.display = "none";
              parent.insertBefore(placeholder, target.nextSibling);

              $animate.leave(target).done(() => {
                const insertedNodes = Array.from(frag.childNodes);

                // Insert each node in order
                for (const x of insertedNodes) {
                  if (x.nodeType === NodeType._ELEMENT_NODE) {
                    // Animate elements
                    $animate.enter(
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
                $animate.leave(target).done(() => {
                  target.textContent = /** @type {string} */ html;
                  $animate.enter(
                    target,
                    /** @type {Element} */ target.parentNode,
                  );
                  scopeParam.$flushQueue();
                });

                scopeParam.$flushQueue();
              } else {
                target.textContent = /** @type {string} */ html;
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
                  $animate.enter(node as Element, parent as Element, target); // insert before target
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
                  $animate.enter(
                    node as Element,
                    target,
                    /** @type {Element} */ firstChild,
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
                  $animate.enter(node as Element, target); // append at end
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
                  $animate.enter(
                    node as Element,
                    parent as Element,
                    /** @type {Element} */ nextSibling,
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
                $animate.leave(target).done(() => {
                  target.remove(); // safety: actually remove in case $animate.leave didn't
                  scopeParam.$flushQueue();
                });
                scopeParam.$flushQueue();
              } else {
                target.remove();
              }
              break;

            case "none":
              break;

            case "innerHTML":
            default:
              if (animationEnabled) {
                if (
                  content &&
                  !Array.isArray(content) &&
                  content.nodeType !== NodeType._TEXT_NODE
                ) {
                  $animate.leave(content as Element).done(() => {
                    content = nodes[0] as ChildNode;
                    $animate.enter(nodes[0] as Element, target);
                    scopeParam.$flushQueue();
                  });
                  scopeParam.$flushQueue();
                } else {
                  content = nodes[0] as ChildNode;

                  if (
                    content &&
                    !Array.isArray(content) &&
                    content.nodeType === NodeType._TEXT_NODE
                  ) {
                    target.replaceChildren(...nodes);
                  } else {
                    $animate.enter(nodes[0] as Element, target);
                    scopeParam.$flushQueue();
                  }
                }
              } else {
                target.replaceChildren(...nodes);
              }
              break;
          }
        }

        element.addEventListener(eventName, async (event: Event) => {
          if ((element as HTMLButtonElement).disabled) return;

          if (tag === "form") event.preventDefault();
          const swap =
            /** @type {import("./interface.ts").SwapModeType} */ attrs.swap ||
            "innerHTML";

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

            if (isObject(html)) {
              if (attrs.target) {
                scope.$eval(`${attrs.target} = ${JSON.stringify(html)}`);
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

            const config: RequestShortcutConfigWithHeaders = {};

            if (attrs.enctype) {
              config.headers = {
                "Content-Type": attrs.enctype,
              };
              data = toKeyValue(collectFormData(element));
            } else {
              data = collectFormData(element);
            }
            $http[method](url, data, config).then(handler).catch(handler);
          } else {
            if (method === "get" && attrs.ngSse) {
              const sseUrl = url;

              /** @type {ng.SseConfig} */
              const config = {
                withCredentials: attrs.withCredentials === "true",
                transformMessage: (data: string) => {
                  try {
                    return JSON.parse(data);
                  } catch {
                    return data;
                  }
                },
                onOpen: () => {
                  $log.info(`${attrName}: SSE connection opened to ${sseUrl}`);

                  if (isDefined(attrs.loading)) attrs.$set("loading", false);

                  if (isDefined(attrs.loadingClass))
                    attrs.$removeClass(attrs.loadingClass);
                },
                onMessage: (data: any) => {
                  const res = { status: 200, data };

                  handler(res as ng.HttpResponse<HttpResponsePayload>);
                },
                onError: (err: any) => {
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

              scope.$on("$destroy", () => {
                $log.info(`${attrName}: closing SSE connection`);
                source.close();
              });
            } else {
              $http[method](url).then(handler).catch(handler);
            }
          }
        });

        if (intervalId) {
          scope.$on("$destroy", () => clearInterval(intervalId));
        }

        if (eventName === "load") {
          element.dispatchEvent(new Event("load"));
        }
      },
    };
  };
}
