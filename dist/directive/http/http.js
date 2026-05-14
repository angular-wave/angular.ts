import { _http, _compile, _log, _parse, _state, _sse, _injector, _stream } from '../../injection-tokens.js';
import { Http } from '../../services/http/http.js';
import { createLazyAnimate } from '../../animations/lazy-animate.js';
import { uppercase, isDefined, callBackAfterFirst, wait, toKeyValue, isString, isInstanceOf, isObject } from '../../shared/utils.js';
import { getEventNameForElement } from '../events/event-name.js';
import { isRealtimeProtocolMessage, getRealtimeProtocolContent } from '../realtime/protocol.js';
export { SwapMode } from '../realtime/protocol.js';
import { createRealtimeSwapHandler } from '../realtime/swap.js';

/** Creates a directive factory wrapper for one HTTP method attribute. */
function defineDirective(method, attrOverride) {
    const attrName = attrOverride || `ng${uppercase(method.charAt(0))}${method.slice(1)}`;
    const directive = createHttpDirective(method, attrName);
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
const ngGetDirective = defineDirective("get");
const ngDeleteDirective = defineDirective("delete");
const ngPostDirective = defineDirective("post");
const ngPutDirective = defineDirective("put");
const ngSseDirective = defineDirective("get", "ngSse");
/** Creates an HTTP directive factory that supports GET, DELETE, POST, and PUT. */
function createHttpDirective(method, attrName) {
    /** Builds the runtime directive instance with HTTP, SSE, compile, and routing helpers. */
    return function ($http, $compile, $log, $parse, $state, $sse, $injector, $stream) {
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
                    if (maybeForm?.tagName.toLowerCase() === "form") {
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
                if (isDefined(attrs.latch)) {
                    attrs.$observe("latch", callBackAfterFirst(() => element.dispatchEvent(new Event(eventName))));
                }
                let throttled = false;
                let intervalId;
                let resolveDestroy;
                const destroyPromise = new Promise((resolve) => {
                    resolveDestroy = resolve;
                });
                const destroyController = new AbortController();
                scope.$on("$destroy", () => {
                    resolveDestroy?.();
                    resolveDestroy = undefined;
                    destroyController.abort("scope destroyed");
                    if (intervalId)
                        clearInterval(intervalId);
                });
                if (isDefined(attrs.interval)) {
                    element.dispatchEvent(new Event(eventName));
                    intervalId = setInterval(() => element.dispatchEvent(new Event(eventName)), parseInt(attrs.interval) || 1000);
                }
                const handleSwapResponse = createRealtimeSwapHandler({
                    $compile,
                    $log,
                    getAnimate,
                    scope,
                    attrs,
                    element,
                    logPrefix: attrName,
                });
                async function handleStreamResponse(stream, swap) {
                    await $stream.consumeText(stream, {
                        signal: destroyController.signal,
                        onChunk(chunk) {
                            if (chunk)
                                handleSwapResponse(chunk, swap);
                        },
                    });
                }
                function createRequestConfig() {
                    const config = {};
                    if (attrs.enctype) {
                        config.headers = {
                            "Content-Type": attrs.enctype,
                        };
                    }
                    if (attrs.responseType === "stream" ||
                        isDefined(attrs.stream) ||
                        isDefined(attrs.responseStream)) {
                        config.responseType = "stream";
                    }
                    config.timeout = destroyPromise;
                    return config;
                }
                function dispatchSseEvent(name, detail) {
                    return element.dispatchEvent(new CustomEvent(`ng:sse:${name}`, {
                        bubbles: true,
                        cancelable: true,
                        detail,
                    }));
                }
                function parseSseEventTypes() {
                    if (!isString(attrs.sseEvents))
                        return [];
                    return attrs.sseEvents
                        .split(",")
                        .map((eventType) => eventType.trim())
                        .filter(Boolean);
                }
                function handleSseProtocolMessage(data, swap, event, source) {
                    const html = getRealtimeProtocolContent(data);
                    const nextSwap = data.swap || swap;
                    if (!dispatchSseEvent("message", { data, event, source })) {
                        source.close();
                        return;
                    }
                    if (isDefined(html)) {
                        handleSwapResponse(isString(html) || isObject(html) ? html : String(html), nextSwap, { targetSelector: data.target });
                        dispatchSseEvent("swapped", { data, event, source });
                    }
                }
                element.addEventListener(eventName, (event) => {
                    void (async () => {
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
                                    void $state.go(attrs.stateSuccess);
                                }
                            }
                            else if (Http._BadRequest <= res.status &&
                                res.status <= Http._ErrorMax) {
                                if (isDefined(attrs.error)) {
                                    $parse(attrs.error)(scope, { $res: html });
                                }
                                if (isDefined(attrs.stateError)) {
                                    void $state.go(attrs.stateError);
                                }
                            }
                            if ($stream.isReadableStream(html)) {
                                handleStreamResponse(html, swap).catch((error) => {
                                    $log.error(`${attrName}: stream error`, error);
                                });
                            }
                            else if (isObject(html)) {
                                if (attrs.target) {
                                    $parse(attrs.target)._assign?.(scope, html);
                                }
                                else {
                                    scope.$merge(html);
                                }
                            }
                            else if (isString(html)) {
                                handleSwapResponse(html, swap);
                            }
                        };
                        if (isDefined(attrs.delay)) {
                            await wait(parseInt(attrs.delay) | 0);
                        }
                        if (scope._destroyed)
                            return;
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
                            const config = createRequestConfig();
                            if (attrs.enctype) {
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
                                const sourceRef = {};
                                const config = {
                                    withCredentials: attrs.withCredentials === "true",
                                    eventTypes: parseSseEventTypes(),
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
                                        if (!dispatchSseEvent("open", { url: sseUrl })) {
                                            sourceRef.current?.close();
                                            return;
                                        }
                                        if (isDefined(attrs.loading))
                                            attrs.$set("loading", false);
                                        if (isDefined(attrs.loadingClass))
                                            attrs.$removeClass(attrs.loadingClass);
                                    },
                                    onEvent: ({ data, event: messageEvent, type, }) => {
                                        const source = sourceRef.current;
                                        if (!source)
                                            return;
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
                                            if (!isRealtimeProtocolMessage(data))
                                                return;
                                        }
                                        if (isRealtimeProtocolMessage(data)) {
                                            handleSseProtocolMessage(data, swap, messageEvent, source);
                                            return;
                                        }
                                        if (!dispatchSseEvent("message", {
                                            data,
                                            event: messageEvent,
                                            source,
                                        })) {
                                            source.close();
                                            return;
                                        }
                                        const res = { status: 200, data };
                                        handler(res);
                                        dispatchSseEvent("swapped", {
                                            data,
                                            event: messageEvent,
                                            source,
                                        });
                                    },
                                    onError: (err) => {
                                        const source = sourceRef.current;
                                        dispatchSseEvent("error", { error: err, source });
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
                                sourceRef.current = source;
                                scope.$on("$destroy", () => {
                                    $log.info(`${attrName}: closing SSE connection`);
                                    dispatchSseEvent("close", { source });
                                    source.close();
                                });
                            }
                            else {
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

export { createHttpDirective, ngDeleteDirective, ngGetDirective, ngPostDirective, ngPutDirective, ngSseDirective };
