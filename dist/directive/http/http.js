import { _http, _compile, _log, _parse, _state, _sse, _injector } from '../../injection-tokens.js';
import { Http } from '../../services/http/http.js';
import { NodeType } from '../../shared/node.js';
import { emptyElement, removeElement, createDocumentFragment } from '../../shared/dom.js';
import { createLazyAnimate } from '../../animations/lazy-animate.js';
import { isDefined, callBackAfterFirst, wait, toKeyValue, isString, isInstanceOf, isObject, arrayFrom, isArray } from '../../shared/utils.js';
import { getEventNameForElement } from '../events/event-name.js';

/**
 * Possible values for `data-swap` attribute
 */
const SwapMode = {
    /** (default) Replaces the contents inside the element */
    innerHTML: "innerHTML",
    /** Replaces the entire element, including the tag itself */
    outerHTML: "outerHTML",
    /** Inserts plain text (without parsing HTML) */
    textContent: "textContent",
    /** Inserts HTML immediately before the element itself */
    beforebegin: "beforebegin",
    /** Inserts HTML inside the element, before its first child */
    afterbegin: "afterbegin",
    /** Inserts HTML inside the element, after its last child */
    beforeend: "beforeend",
    /** Inserts HTML immediately after the element itself */
    afterend: "afterend",
    /** Removes the element entirely */
    delete: "delete",
    /** Performs no insertion (no-op) */
    none: "none",
};
/** Creates a directive factory wrapper for one HTTP method attribute. */
function defineDirective(method, attrOverride) {
    const attrName = attrOverride || `ng${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    const directive = createHttpDirective(method, attrName);
    directive.$inject = [_http, _compile, _log, _parse, _state, _sse, _injector];
    return directive;
}
const ngGetDirective = defineDirective("get");
const ngDeleteDirective = defineDirective("delete");
const ngPostDirective = defineDirective("post");
const ngPutDirective = defineDirective("put");
const ngSseDirective = defineDirective("get", "ngSse");
/** Creates an HTTP directive factory that supports GET, DELETE, POST, and PUT. */
function createHttpDirective(method, attrName) {
    /** Builds the runtime directive instance with HTTP, SSE, compile, and routing helpers. */
    return function ($http, $compile, $log, $parse, $state, $sse, $injector) {
        const getAnimate = createLazyAnimate($injector);
        /** Collects form data from the element or its associated form. */
        function collectFormData(element) {
            let form = null;
            const tag = element.tagName.toLowerCase();
            if (tag === "form") {
                form = element;
            }
            else if ("form" in element && element.form) {
                const { form: associatedForm } = element;
                form = associatedForm;
            }
            else if (element.hasAttribute("form")) {
                const formId = element.getAttribute("form");
                if (formId) {
                    const maybeForm = document.getElementById(formId);
                    if (maybeForm && maybeForm.tagName.toLowerCase() === "form") {
                        form = maybeForm;
                    }
                }
            }
            if (!form) {
                if ("name" in element &&
                    isString(element.name) &&
                    element.name.length > 0) {
                    if (isInstanceOf(element, HTMLInputElement) ||
                        isInstanceOf(element, HTMLTextAreaElement) ||
                        isInstanceOf(element, HTMLSelectElement)) {
                        const key = element.name;
                        const { value } = element;
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
                let content;
                if (isDefined(attrs.latch)) {
                    attrs.$observe("latch", callBackAfterFirst(() => element.dispatchEvent(new Event(eventName))));
                }
                let throttled = false;
                let intervalId;
                if (isDefined(attrs.interval)) {
                    element.dispatchEvent(new Event(eventName));
                    intervalId = setInterval(() => element.dispatchEvent(new Event(eventName)), parseInt(attrs.interval) || 1000);
                }
                /**
                 * Handles DOM manipulation based on a swap strategy and server-rendered HTML.
                 */
                function handleSwapResponse(html, swap, scopeParam, attrsParam, elementParam) {
                    let animationEnabled = false;
                    if (attrsParam.animate) {
                        animationEnabled = true;
                    }
                    const animate = animationEnabled ? getAnimate() : undefined;
                    let nodes = [];
                    if (!["textcontent", "delete", "none"].includes(swap)) {
                        if (!html)
                            return;
                        const compiled = $compile(String(html))(scopeParam);
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
                            if (!parent)
                                return;
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
                            animate.leave(target).done(() => {
                                const insertedNodes = arrayFrom(frag.childNodes);
                                // Insert each node in order
                                for (const x of insertedNodes) {
                                    if (x.nodeType === NodeType._ELEMENT_NODE) {
                                        // Animate elements
                                        animate.enter(x, parent, placeholder);
                                    }
                                    else {
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
                                animate.leave(target).done(() => {
                                    target.textContent = html;
                                    animate.enter(target, target.parentNode);
                                    scopeParam.$flushQueue();
                                });
                                scopeParam.$flushQueue();
                            }
                            else {
                                target.textContent = html;
                            }
                            break;
                        case "beforebegin": {
                            const parent = target.parentNode;
                            if (!parent)
                                break;
                            nodes.forEach((node) => {
                                if (animationEnabled &&
                                    node.nodeType === NodeType._ELEMENT_NODE) {
                                    animate.enter(node, parent, target); // insert before target
                                }
                                else {
                                    parent.insertBefore(node, target);
                                }
                            });
                            if (animationEnabled)
                                scopeParam.$flushQueue();
                            break;
                        }
                        case "afterbegin": {
                            const { firstChild } = target;
                            [...nodes].reverse().forEach((node) => {
                                if (animationEnabled &&
                                    node.nodeType === NodeType._ELEMENT_NODE) {
                                    animate.enter(node, target, firstChild); // insert before first child
                                }
                                else {
                                    target.insertBefore(node, firstChild);
                                }
                            });
                            if (animationEnabled)
                                scopeParam.$flushQueue();
                            break;
                        }
                        case "beforeend": {
                            nodes.forEach((node) => {
                                if (animationEnabled &&
                                    node.nodeType === NodeType._ELEMENT_NODE) {
                                    animate.enter(node, target); // append at end
                                }
                                else {
                                    target.appendChild(node);
                                }
                            });
                            if (animationEnabled)
                                scopeParam.$flushQueue();
                            break;
                        }
                        case "afterend": {
                            const parent = target.parentNode;
                            if (!parent)
                                break;
                            const { nextSibling } = target;
                            [...nodes].reverse().forEach((node) => {
                                if (animationEnabled &&
                                    node.nodeType === NodeType._ELEMENT_NODE) {
                                    animate.enter(node, parent, nextSibling); // insert after target
                                }
                                else {
                                    parent.insertBefore(node, nextSibling);
                                }
                            });
                            if (animationEnabled)
                                scopeParam.$flushQueue();
                            break;
                        }
                        case "delete":
                            if (animationEnabled) {
                                animate.leave(target).done(() => {
                                    removeElement(target); // safety: actually remove in case $animate.leave didn't
                                    scopeParam.$flushQueue();
                                });
                                scopeParam.$flushQueue();
                            }
                            else {
                                removeElement(target);
                            }
                            break;
                        case "none":
                            break;
                        case "innerHTML":
                        default:
                            if (animationEnabled) {
                                if (content &&
                                    !isArray(content) &&
                                    content.nodeType !== NodeType._TEXT_NODE) {
                                    animate.leave(content).done(() => {
                                        content = nodes[0];
                                        animate.enter(nodes[0], target);
                                        scopeParam.$flushQueue();
                                    });
                                    scopeParam.$flushQueue();
                                }
                                else {
                                    content = nodes[0];
                                    if (content &&
                                        !isArray(content) &&
                                        content.nodeType === NodeType._TEXT_NODE) {
                                        emptyElement(target);
                                        target.replaceChildren(...nodes);
                                    }
                                    else {
                                        animate.enter(nodes[0], target);
                                        scopeParam.$flushQueue();
                                    }
                                }
                            }
                            else {
                                emptyElement(target);
                                target.replaceChildren(...nodes);
                            }
                            break;
                    }
                }
                element.addEventListener(eventName, async (event) => {
                    if (element.disabled)
                        return;
                    if (tag === "form")
                        event.preventDefault();
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
                        if (Http._OK <= res.status &&
                            res.status <= Http._MultipleChoices - 1) {
                            if (isDefined(attrs.success)) {
                                $parse(attrs.success)(scope, { $res: html });
                            }
                            if (isDefined(attrs.stateSuccess)) {
                                $state.go(attrs.stateSuccess);
                            }
                        }
                        else if (Http._BadRequest <= res.status &&
                            res.status <= Http._ErrorMax) {
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
                            }
                            else {
                                scope.$merge(html);
                            }
                        }
                        else if (isString(html)) {
                            handleSwapResponse(html, swap, scope, attrs, element);
                        }
                    };
                    if (isDefined(attrs.delay)) {
                        await wait(parseInt(attrs.delay) | 0);
                    }
                    if (throttled)
                        return;
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
                        const config = {};
                        if (attrs.enctype) {
                            config.headers = {
                                "Content-Type": attrs.enctype,
                            };
                            data = toKeyValue(collectFormData(element));
                        }
                        else {
                            data = collectFormData(element);
                        }
                        $http[method](url, data, config).then(handler).catch(handler);
                    }
                    else {
                        if (method === "get" && attrs.ngSse) {
                            const sseUrl = url;
                            const config = {
                                withCredentials: attrs.withCredentials === "true",
                                transformMessage: (data) => {
                                    try {
                                        return JSON.parse(data);
                                    }
                                    catch {
                                        return data;
                                    }
                                },
                                onOpen: () => {
                                    $log.info(`${attrName}: SSE connection opened to ${sseUrl}`);
                                    if (isDefined(attrs.loading))
                                        attrs.$set("loading", false);
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
                        }
                        else {
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

export { SwapMode, createHttpDirective, ngDeleteDirective, ngGetDirective, ngPostDirective, ngPutDirective, ngSseDirective };
