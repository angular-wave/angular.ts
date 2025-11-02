import { $injectTokens as $ } from "../../injection-tokens.js";
import {
  callBackAfterFirst,
  isDefined,
  isObject,
  toKeyValue,
  wait,
} from "../../shared/utils.js";

/**
 * @param {"get" | "delete" | "post" | "put"} method - HTTP method applied to request
 * @param {string} [attrOverride] - Custom name to use for the attribute
 * @returns {ng.DirectiveFactory}
 */
function defineDirective(method, attrOverride) {
  const attrName =
    attrOverride || "ng" + method.charAt(0).toUpperCase() + method.slice(1);
  const directive = createHttpDirective(method, attrName);
  directive["$inject"] = [
    $.$http,
    $.$compile,
    $.$log,
    $.$parse,
    $.$state,
    $.$sse,
    $.$animate,
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
export function getEventNameForElement(element) {
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
export function createHttpDirective(method, attrName) {
  let content = undefined;

  /**
   * @param {ng.HttpService} $http
   * @param {ng.CompileService} $compile
   * @param {ng.LogService} $log
   * @param {ng.ParseService} $parse
   * @param {ng.StateService} $state
   * @param {ng.SseService} $sse
   * @returns {ng.Directive}
   */
  return function ($http, $compile, $log, $parse, $state, $sse, $animate) {
    /**
     * Handles DOM manipulation based on a swap strategy and server-rendered HTML.
     *
     * @param {string | Object} html - The HTML string or object returned from the server.
     * @param {import("./interface.ts").SwapModeType} swap
     * @param {ng.Scope} scope
     * @param {ng.Attributes} attrs
     * @param {Element} element
     */
    function handleSwapResponse(html, swap, scope, attrs, element) {
      let animationEnabled = false;
      if (attrs.animate) {
        animationEnabled = true;
      }
      let nodes = [];
      if (!["textcontent", "delete", "none"].includes(swap)) {
        if (!html) return;

        if (isObject(html)) {
          if (attrs.target) {
            scope.$eval(`${attrs.target} = ${JSON.stringify(html)}`);
          } else {
            scope.$merge(html);
          }
          return;
        }

        const compiled = $compile(html)(scope);
        nodes =
          compiled instanceof DocumentFragment
            ? Array.from(compiled.childNodes)
            : [compiled];
      }

      const targetSelector = attrs["target"];
      const target = targetSelector
        ? document.querySelector(targetSelector)
        : element;

      if (!target) {
        $log.warn(`${attrName}: target "${targetSelector}" not found`);
        return;
      }

      switch (swap) {
        case "innerHTML":
          if (animationEnabled) {
            if (content) {
              $animate.leave(content).done(() => {
                content = nodes[0];
                $animate.enter(nodes[0], target);
                scope.$flushQueue();
              });
              scope.$flushQueue();
            } else {
              content = nodes[0];
              $animate.enter(nodes[0], target);
              scope.$flushQueue();
            }
          } else {
            target.replaceChildren(...nodes);
          }
          break;

        case "outerHTML": {
          const parent = target.parentNode;
          if (!parent) return;
          const frag = document.createDocumentFragment();
          nodes.forEach((n) => frag.appendChild(n));
          if (animationEnabled) {
            const placeholder = document.createComment("placeholder");
            target.parentNode.insertBefore(placeholder, target.nextSibling);
            $animate.leave(target).done(() => {
              const insertedNodes = Array.from(frag.childNodes);
              insertedNodes.forEach((n) =>
                $animate.enter(n, parent, placeholder),
              );
              content = insertedNodes;
              scope.$flushQueue();
            });
            scope.$flushQueue();
          } else {
            parent.replaceChild(frag, target);
          }
          break;
        }

        case "textContent":
          target.textContent = html;
          break;

        case "beforebegin":
          nodes.forEach((node) => target.parentNode.insertBefore(node, target));
          break;

        case "afterbegin":
          nodes
            .slice()
            .reverse()
            .forEach((node) => target.insertBefore(node, target.firstChild));
          break;

        case "beforeend":
          nodes.forEach((node) => target.appendChild(node));
          break;

        case "afterend":
          nodes
            .slice()
            .reverse()
            .forEach((node) =>
              target.parentNode.insertBefore(node, target.nextSibling),
            );
          break;

        case "delete":
          target.remove();
          break;

        case "none":
          break;

        default:
          target.replaceChildren(...nodes);
          break;
      }
    }

    /**
     * Collects form data from the element or its associated form.
     *
     * @param {HTMLElement} element
     * @returns {Object<string, any>}
     */
    function collectFormData(element) {
      /** @type {HTMLFormElement | null} */
      let form = null;

      const tag = element.tagName.toLowerCase();

      if (tag === "form") {
        form = /** @type {HTMLFormElement} */ (element);
      } else if ("form" in element && element.form) {
        form = /** @type {HTMLFormElement} */ (element.form);
      } else if (element.hasAttribute("form")) {
        const formId = element.getAttribute("form");
        if (formId) {
          const maybeForm = document.getElementById(formId);
          if (maybeForm && maybeForm.tagName.toLowerCase() === "form") {
            form = /** @type {HTMLFormElement} */ (maybeForm);
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
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement
          ) {
            const key = element.name;
            const value = element.value;
            return { [key]: value };
          }
        }
        return {};
      }

      const formData = new FormData(form);
      const data = {};
      formData.forEach((value, key) => {
        data[key] = value;
      });
      return data;
    }

    return {
      restrict: "A",
      link(scope, element, attrs) {
        const eventName = attrs.trigger || getEventNameForElement(element);
        const tag = element.tagName.toLowerCase();

        if (isDefined(attrs.latch)) {
          attrs.$observe(
            "latch",
            callBackAfterFirst(() =>
              element.dispatchEvent(new Event(eventName)),
            ),
          );
        }

        let throttled = false;
        let intervalId;

        if (isDefined(attrs["interval"])) {
          element.dispatchEvent(new Event(eventName));
          intervalId = setInterval(
            () => element.dispatchEvent(new Event(eventName)),
            parseInt(attrs.interval) || 1000,
          );
        }

        element.addEventListener(eventName, async (event) => {
          if (/** @type {HTMLButtonElement} */ (element).disabled) return;
          if (tag === "form") event.preventDefault();
          const swap = attrs.swap || "innerHTML";
          const url = attrs[attrName];
          if (!url) {
            $log.warn(`${attrName}: no URL specified`);
            return;
          }

          const handler = (res) => {
            if (isDefined(attrs.loading)) {
              attrs.$set("loading", false);
            }

            if (isDefined(attrs.loadingClass)) {
              attrs.$removeClass(attrs.loadingClass);
            }

            const html = res.data;
            if (200 <= res.status && res.status <= 299) {
              if (isDefined(attrs.success)) {
                $parse(attrs.success)(scope, { $res: html });
              }

              if (isDefined(attrs.stateSuccess)) {
                $state.go(attrs.stateSuccess);
              }
            } else if (400 <= res.status && res.status <= 599) {
              if (isDefined(attrs.error)) {
                $parse(attrs.error)(scope, { $res: html });
              }

              if (isDefined(attrs.stateError)) {
                $state.go(attrs.stateError);
              }
            }

            // simplified call (no long parameter list)
            handleSwapResponse(html, swap, scope, attrs, element);
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

          if (isDefined(attrs["loading"])) {
            attrs.$set("loading", true);
          }

          if (isDefined(attrs["loadingClass"])) {
            attrs.$addClass(attrs.loadingClass);
          }

          if (method === "post" || method === "put") {
            let data;
            const config = {};
            if (attrs.enctype) {
              config.headers = {
                "Content-Type": attrs["enctype"],
              };
              data = toKeyValue(collectFormData(element));
            } else {
              data = collectFormData(element);
            }
            $http[method](url, data, config).then(handler).catch(handler);
          } else {
            if (method === "get" && attrs.ngSse) {
              const sseUrl = url;
              const config = {
                withCredentials: attrs.withCredentials === "true",
                transformMessage: (data) => {
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
                onMessage: (data) => {
                  const res = { status: 200, data };
                  handler(res);
                },
                onError: (err) => {
                  $log.error(`${attrName}: SSE error`, err);
                  const res = { status: 500, data: err };
                  handler(res);
                },
                onReconnect: (count) => {
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

        if (eventName == "load") {
          element.dispatchEvent(new Event("load"));
        }
      },
    };
  };
}
