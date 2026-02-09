import { $injectTokens as $t } from "../../injection-tokens.js";
import { Http } from "../../services/http/http.js";
import { NodeType } from "../../shared/node.js";
import {
  callBackAfterFirst,
  isDefined,
  isInstanceOf,
  isObject,
  isString,
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
    attrOverride || `ng${method.charAt(0).toUpperCase()}${method.slice(1)}`;

  const directive = /** @type {ng.DirectiveFactory & Function} */ (
    createHttpDirective(method, attrName)
  );

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
  return function ($http, $compile, $log, $parse, $state, $sse, $animate) {
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
        // eslint-disable-next-line prefer-destructuring
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

      /** @type {Record<string, any>} */
      const data = {};

      formData.forEach((value, key) => {
        data[key] = value;
      });

      return data;
    }

    return /** @type {ng.Directive} */ ({
      restrict: "A",
      link(scope, element, attrs) {
        const eventName = attrs.trigger || getEventNameForElement(element);

        const tag = element.tagName.toLowerCase();

        /**
         * @type {Element | ChildNode[] | undefined}
         */
        let content = undefined;

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
          html,
          swap,
          scopeParam,
          attrsParam,
          elementParam,
        ) {
          let animationEnabled = false;

          if (attrsParam.animate) {
            animationEnabled = true;
          }
          /**
           * @type {ChildNode[]|*[]}
           */
          let nodes = [];

          if (!["textcontent", "delete", "none"].includes(swap)) {
            if (!html) return;
            const compiled = $compile(/** @type {string} */ (html))(scopeParam);

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
                      /** @type {Element} */ (x),
                      /** @type {Element} */ (parent),
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
                  target.textContent = /** @type {string} */ (html);
                  $animate.enter(
                    target,
                    /** @type {Element} */ (target.parentNode),
                  );
                  scopeParam.$flushQueue();
                });

                scopeParam.$flushQueue();
              } else {
                target.textContent = /** @type {string} */ (html);
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
                  $animate.enter(node, /** @type {Element} */ (parent), target); // insert before target
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
                    node,
                    target,
                    /** @type {Element} */ (firstChild),
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
                  $animate.enter(node, target); // append at end
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
                    node,
                    /** @type {Element} */ (parent),
                    /** @type {Element} */ (nextSibling),
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
                  /** @type {HTMLElement} */ (content).nodeType !==
                    NodeType._TEXT_NODE
                ) {
                  $animate
                    .leave(/** @type {HTMLElement} */ (content))
                    .done(() => {
                      content = nodes[0];
                      $animate.enter(nodes[0], target);
                      scopeParam.$flushQueue();
                    });
                  scopeParam.$flushQueue();
                } else {
                  content = nodes[0];

                  if (
                    /** @type {HTMLElement} */ (content).nodeType ===
                    NodeType._TEXT_NODE
                  ) {
                    target.replaceChildren(...nodes);
                  } else {
                    $animate.enter(nodes[0], target);
                    scopeParam.$flushQueue();
                  }
                }
              } else {
                target.replaceChildren(...nodes);
              }
              break;
          }
        }

        element.addEventListener(eventName, async (event) => {
          if (/** @type {HTMLButtonElement} */ (element).disabled) return;

          if (tag === "form") event.preventDefault();
          const swap =
            /** @type {import("./interface.ts").SwapModeType} */ (attrs.swap) ||
            "innerHTML";

          const url = attrs[attrName];

          if (!url) {
            $log.warn(`${attrName}: no URL specified`);

            return;
          }

          const handler = /** @param {ng.HttpResponse<string|Object>} res */ (
            res,
          ) => {
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
            let data;

            /** @type {ng.RequestShortcutConfig} */
            const config = {};

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

                  handler(/** @type {ng.HttpResponse<Object>} */ (res));
                },
                onError: (err) => {
                  $log.error(`${attrName}: SSE error`, err);
                  const res = { status: 500, data: err };

                  handler(/** @type {ng.HttpResponse<Object>} */ (res));
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

        if (eventName === "load") {
          element.dispatchEvent(new Event("load"));
        }
      },
    });
  };
}
