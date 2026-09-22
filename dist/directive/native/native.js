import { _native, _parse, _exceptionHandler, _window } from '../../injection-tokens.js';
import { addScopeEventListener } from '../../core/render/event-dispatcher.js';
import { getNormalizedAttr, setNormalizedAttr } from '../../shared/dom.js';
import { isObject } from '../../shared/utils.js';
import { getEventNameForElement } from '../events/event-name.js';
import { nativeElements } from '../../runtime/native-elements.js';
import { readNativeStyle } from './native-element.js';

/** Calls a native capability from HTML. */
function ngNativeDirective(native, parse, exceptionHandler) {
    return {
        restrict: "A",
        link(scope, element) {
            const operation = parseOperation(readAttr(element, "ngNative"));
            if (!operation)
                return;
            const paramsExpression = readAttr(element, "params");
            const params = paramsExpression ? parse(paramsExpression) : undefined;
            const result = parseOptionalExpression(element, "onResult", parse);
            const failure = parseOptionalExpression(element, "onError", parse);
            const eventName = readAttr(element, "trigger") ?? getEventNameForElement(element);
            const invoke = async (event) => {
                if (element.hasAttribute("disabled"))
                    return;
                setNormalizedAttr(element, "ariaBusy", "true");
                try {
                    const value = await native.call(operation.target, operation.method, params?.(scope, { $event: event }), { scopeId: scope.id, elementId: element.id || undefined });
                    result?.(scope, { $event: event, $result: value });
                }
                catch (error) {
                    if (failure)
                        failure(scope, { $error: error, $event: event });
                    else
                        exceptionHandler(error);
                }
                finally {
                    setNormalizedAttr(element, "ariaBusy", null);
                }
            };
            addScopeEventListener(scope, element, eventName, (event) => {
                void invoke(event);
            });
            if (eventName === "load") {
                queueMicrotask(() => {
                    if (element.isConnected)
                        element.dispatchEvent(new Event("load"));
                });
            }
        },
    };
}
ngNativeDirective.$inject = [_native, _parse, _exceptionHandler];
/** Replaces a marked HTML region with an Android or iOS native component. */
function ngNativeComponentDirective(native, parse, exceptionHandler, runtimeWindow) {
    return {
        restrict: "A",
        require: "?ngModel",
        link(scope, element, model) {
            const name = element.getAttribute("ng-native-component") ??
                element.getAttribute("data-ng-native-component") ??
                undefined;
            if (!name)
                return;
            const view = element.ownerDocument.defaultView ?? runtimeWindow;
            const id = element.id ||
                `ng-native-component-${String(scope.id)}-${String(nextComponentId++)}`;
            const propsExpression = readAttr(element, "props");
            const props = propsExpression ? parse(propsExpression) : undefined;
            const modelProperty = readAttr(element, "modelProperty") ?? "value";
            const definition = Object.values(nativeElements).find((candidate) => candidate.name === name ||
                candidate.aliases.includes(name));
            const supportsProperty = (property) => definition != null && property in definition.properties;
            let mounted = false;
            let disposed = false;
            let scheduled = 0;
            let updating = false;
            let disconnectedFrames = 0;
            let lastPayload;
            const updateState = { dirty: false };
            const needsUpdate = () => updateState.dirty;
            const canReportError = () => !disposed && native.available;
            element.id = id;
            element.setAttribute("data-native-component-host", name);
            const update = async () => {
                if (disposed || !native.available)
                    return;
                if (!element.isConnected) {
                    disconnectedFrames++;
                    if (disconnectedFrames <= 5)
                        scheduleUpdate();
                    return;
                }
                disconnectedFrames = 0;
                if (updating) {
                    updateState.dirty = true;
                    return;
                }
                updating = true;
                updateState.dirty = false;
                try {
                    const value = props?.(scope);
                    const nativeProperties = isObject(value)
                        ? { ...value }
                        : {};
                    if (model)
                        nativeProperties[modelProperty] = model.viewValue;
                    if (model && supportsProperty("enabled")) {
                        nativeProperties.enabled = !element.hasAttribute("disabled");
                    }
                    if (model && supportsProperty("required")) {
                        nativeProperties.required = element.hasAttribute("required");
                    }
                    if (model && supportsProperty("error")) {
                        nativeProperties.error = model.invalid
                            ? model.validationMessage || Object.keys(model.error).join(", ")
                            : "";
                    }
                    if (model && supportsProperty("pending")) {
                        nativeProperties.pending = model.pending !== undefined;
                    }
                    if (model && supportsProperty("readOnly")) {
                        nativeProperties.readOnly = element.hasAttribute("readonly");
                    }
                    if (model && supportsProperty("keyboardType")) {
                        nativeProperties.keyboardType =
                            readAttr(element, "inputmode") ??
                                element.getAttribute("type") ??
                                nativeProperties.keyboardType;
                    }
                    if (model && supportsProperty("imeAction")) {
                        nativeProperties.imeAction =
                            readAttr(element, "enterkeyhint") ?? nativeProperties.imeAction;
                    }
                    if (model && supportsProperty("autofillHints")) {
                        const autocomplete = element.getAttribute("autocomplete")?.trim();
                        if (autocomplete) {
                            nativeProperties.autofillHints = autocomplete.split(/\s+/u);
                        }
                    }
                    const style = readNativeStyle(element, definition?.name ?? name);
                    nativeProperties.style = style;
                    if (typeof style.gap === "number" && supportsProperty("spacing")) {
                        nativeProperties.spacing = style.gap;
                    }
                    const payload = {
                        id,
                        name,
                        props: nativeProperties,
                        rect: readElementRect(element, view),
                    };
                    const serialized = JSON.stringify(payload);
                    if (mounted && serialized === lastPayload)
                        return;
                    await native.call("component", mounted ? "update" : "mount", payload);
                    lastPayload = serialized;
                    mounted = true;
                }
                catch (error) {
                    if (canReportError())
                        exceptionHandler(error);
                }
                finally {
                    updating = false;
                    if (needsUpdate())
                        scheduleUpdate();
                }
            };
            const scheduleUpdate = () => {
                if (disposed || scheduled)
                    return;
                scheduled = view.requestAnimationFrame(() => {
                    scheduled = 0;
                    void update();
                });
            };
            const ResizeObserverType = view.ResizeObserver;
            const resizeObserver = ResizeObserverType
                ? new ResizeObserverType(scheduleUpdate)
                : undefined;
            const MutationObserverType = view.MutationObserver;
            const attributeObserver = MutationObserverType
                ? new MutationObserverType(scheduleUpdate)
                : undefined;
            const unwatch = propsExpression
                ? scope.watch(propsExpression, scheduleUpdate, true)
                : undefined;
            const previousRender = model?.render.bind(model);
            const previousIsEmpty = model?.isEmpty.bind(model);
            let nativeIsEmpty;
            const nativeRender = () => {
                previousRender?.();
                scheduleUpdate();
            };
            if (model) {
                model.render = nativeRender;
                if (name === "checkbox" || name === "switch") {
                    nativeIsEmpty = (value) => value === false || Boolean(previousIsEmpty?.(value));
                }
                else if (name === "file-picker") {
                    nativeIsEmpty = (value) => (Array.isArray(value) && value.length === 0) ||
                        Boolean(previousIsEmpty?.(value));
                }
                if (nativeIsEmpty)
                    model.isEmpty = nativeIsEmpty;
            }
            const unsubscribeModel = model
                ? native.on("component", "change", (event) => {
                    const data = event.data;
                    if (data?.id !== id)
                        return;
                    model.setViewValue(data.value, "change");
                    if (typeof data.valid === "boolean") {
                        model.setValidity("native", data.valid);
                    }
                })
                : undefined;
            const unsubscribeBlur = model
                ? native.on("component", "blur", (event) => {
                    const data = event.data;
                    if (data?.id === id)
                        model.setTouched();
                })
                : undefined;
            const dispose = () => {
                if (disposed)
                    return;
                disposed = true;
                if (scheduled)
                    view.cancelAnimationFrame(scheduled);
                resizeObserver?.disconnect();
                attributeObserver?.disconnect();
                view.removeEventListener("resize", scheduleUpdate);
                view.removeEventListener("scroll", scheduleUpdate, true);
                unwatch?.();
                unsubscribeModel?.();
                unsubscribeBlur?.();
                if (model?.render === nativeRender && previousRender) {
                    model.render = previousRender;
                }
                if (model && model.isEmpty === nativeIsEmpty && previousIsEmpty) {
                    model.isEmpty = previousIsEmpty;
                }
                if (mounted && native.available) {
                    void native
                        .call("component", "unmount", { id }, { timeout: 0 })
                        .catch(() => undefined);
                }
            };
            resizeObserver?.observe(element);
            attributeObserver?.observe(element, {
                attributes: true,
                childList: true,
                subtree: true,
            });
            attributeObserver?.observe(view.document.documentElement, {
                attributes: true,
            });
            view.addEventListener("resize", scheduleUpdate);
            view.addEventListener("scroll", scheduleUpdate, true);
            view.addEventListener("ng:native:environment", scheduleUpdate);
            scope.on("$destroy", () => {
                view.removeEventListener("ng:native:environment", scheduleUpdate);
                dispose();
            });
            scheduleUpdate();
        },
    };
}
ngNativeComponentDirective.$inject = [
    _native,
    _parse,
    _exceptionHandler,
    _window,
];
/** Runs an AngularTS expression for an event pushed by the native shell. */
function ngNativeEventDirective(native, parse, exceptionHandler) {
    return {
        restrict: "A",
        link(scope, element) {
            const event = parseEvent(readAttr(element, "ngNativeEvent"));
            const expression = readAttr(element, "onEvent");
            if (!event || !expression)
                return;
            const handler = parse(expression);
            const invoke = (nativeEvent) => {
                try {
                    handler(scope, {
                        $data: nativeEvent.data,
                        $event: nativeEvent,
                    });
                }
                catch (error) {
                    exceptionHandler(error);
                }
            };
            scope.on("$destroy", native.on(event.target, event.event, invoke));
        },
    };
}
ngNativeEventDirective.$inject = [_native, _parse, _exceptionHandler];
let nextComponentId = 1;
function readAttr(element, name) {
    return getNormalizedAttr(element, name);
}
function parseOptionalExpression(element, name, parse) {
    const expression = readAttr(element, name);
    return expression ? parse(expression) : undefined;
}
function parseOperation(value) {
    if (!value)
        return undefined;
    const separator = value.indexOf(".");
    if (separator < 1 || separator === value.length - 1)
        return undefined;
    return {
        target: value.slice(0, separator),
        method: value.slice(separator + 1),
    };
}
function parseEvent(value) {
    const operation = parseOperation(value);
    return operation
        ? { target: operation.target, event: operation.method }
        : undefined;
}
function readElementRect(element, view) {
    const rect = element.getBoundingClientRect();
    return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        pageX: rect.left + view.scrollX,
        pageY: rect.top + view.scrollY,
    };
}

export { ngNativeComponentDirective, ngNativeDirective, ngNativeEventDirective };
