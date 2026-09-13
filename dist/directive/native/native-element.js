import { _native, _parse, _exceptionHandler, _window } from '../../injection-tokens.js';
import { nativeElements } from '../../runtime/native-elements.js';
import { isObject } from '../../shared/utils.js';

const bindings = new WeakMap();
const rootSchedules = new WeakMap();
let nextNativeRootId = 1;
/** Returns the Angular directive name for a generated native HTML tag. */
function nativeElementDirectiveName(name) {
    return `ngNative${name
        .split("-")
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join("")}`;
}
/** Creates the directive used by one generated `ng-native-*` HTML element. */
function nativeElementDirective(name, native, parse, exceptionHandler, runtimeWindow) {
    const definition = definitionFor(name);
    return {
        restrict: "E",
        require: "?ngModel",
        link(scope, element, model) {
            const propsExpression = readAttribute(element, "props");
            const binding = {
                element,
                name,
                scope,
                model,
                props: propsExpression ? parse(propsExpression) : undefined,
                childrenByKey: new Map(),
            };
            bindings.set(element, binding);
            element.setAttribute("data-native-element", name);
            queueMicrotask(() => {
                if (!element.isConnected)
                    return;
                if (nearestNativeParent(element)) {
                    scheduleNativeRoot(element);
                    return;
                }
                mountNativeRoot(binding, native, parse, exceptionHandler, runtimeWindow);
            });
            if (model && "value" in definition.properties) {
                const previousRender = model.render.bind(model);
                model.render = () => {
                    previousRender();
                    scheduleNativeRoot(element);
                };
                scope.on("$destroy", () => {
                    model.render = previousRender;
                });
            }
            scope.on("$destroy", () => {
                bindings.delete(element);
            });
        },
    };
}
nativeElementDirective.$inject = [_native, _parse, _exceptionHandler, _window];
function mountNativeRoot(root, native, parse, exceptionHandler, runtimeWindow) {
    const element = root.element;
    const id = element.id ||
        `ng-native-root-${String(root.scope.id)}-${String(nextNativeRootId++)}`;
    let mounted = false;
    let disposed = false;
    let scheduled = false;
    let lastPayload = "";
    const canReportError = () => !disposed && native.available;
    element.id = id;
    element.setAttribute("data-native-component-host", root.name);
    const render = async () => {
        const method = mounted ? "update" : "mount";
        if (disposed ||
            !native.available ||
            !native.supports("component", method) ||
            !element.isConnected) {
            return;
        }
        try {
            const descriptor = buildDescriptor(root);
            const payload = {
                id,
                name: descriptor.name,
                props: descriptor.props,
                rect: readElementRect(element, runtimeWindow),
            };
            const serialized = JSON.stringify(payload);
            if (serialized === lastPayload)
                return;
            await native.call("component", method, payload);
            mounted = true;
            lastPayload = serialized;
        }
        catch (error) {
            if (canReportError())
                exceptionHandler(error);
        }
    };
    const schedule = () => {
        if (disposed || scheduled)
            return;
        scheduled = true;
        runtimeWindow.queueMicrotask(() => {
            scheduled = false;
            void render();
        });
    };
    rootSchedules.set(element, schedule);
    const eventNames = new Set([
        "childEvent",
        ...Object.keys(definitionFor(root.name).events),
    ]);
    const eventHandler = (event) => {
        const data = event.data;
        if (data?.id !== id)
            return;
        dispatchNativeEvent(root, event, parse, exceptionHandler);
    };
    const unsubscribers = [...eventNames].map((event) => native.on("component", event, eventHandler));
    const ResizeObserverType = runtimeWindow.ResizeObserver;
    const resizeObserver = ResizeObserverType
        ? new ResizeObserverType(schedule)
        : undefined;
    const MutationObserverType = runtimeWindow.MutationObserver;
    const mutationObserver = MutationObserverType
        ? new MutationObserverType(schedule)
        : undefined;
    resizeObserver?.observe(element);
    mutationObserver?.observe(element, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
    });
    mutationObserver?.observe(runtimeWindow.document.documentElement, {
        attributes: true,
    });
    runtimeWindow.addEventListener("resize", schedule);
    runtimeWindow.addEventListener("ng:native:environment", schedule);
    root.scope.on("$destroy", () => {
        if (disposed)
            return;
        disposed = true;
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
        runtimeWindow.removeEventListener("resize", schedule);
        runtimeWindow.removeEventListener("ng:native:environment", schedule);
        rootSchedules.delete(element);
        unsubscribers.forEach((unsubscribe) => {
            unsubscribe();
        });
        if (mounted && native.available) {
            void native
                .call("component", "unmount", { id }, { timeout: 0 })
                .catch(() => undefined);
        }
    });
    schedule();
}
function buildDescriptor(binding) {
    const definition = definitionFor(binding.name);
    const evaluated = binding.props?.(binding.scope);
    const props = isObject(evaluated)
        ? { ...evaluated }
        : {};
    for (const [propertyName, property] of Object.entries(definition.properties)) {
        if (propertyName === "children")
            continue;
        const attribute = readAttribute(binding.element, kebabCase(propertyName));
        if (attribute !== undefined) {
            props[propertyName] = coerceNativeAttribute(attribute, property.type);
        }
    }
    if (binding.model && "value" in definition.properties) {
        props.value = binding.model.viewValue;
    }
    const style = readNativeStyle(binding.element, binding.name);
    props.style = style;
    if (typeof style.gap === "number" && "spacing" in definition.properties) {
        props.spacing = style.gap;
    }
    const childBindings = nativeChildren(binding.element);
    const children = childBindings.map(buildDescriptor);
    binding.childrenByKey = new Map(children.map((child, index) => [child.key, childBindings[index]]));
    if ("children" in definition.properties)
        props.children = children;
    if (binding.name === "bottom-bar") {
        props.items = Array.from(binding.element.children)
            .filter((child) => child.localName === "button")
            .map((child) => ({
            key: readAttribute(child, "key") ?? child.id,
            label: child.textContent.trim(),
            icon: readAttribute(child, "icon") ?? "",
            enabled: !child.hasAttribute("disabled"),
        }));
    }
    return {
        key: (readAttribute(binding.element, "key") ?? binding.element.id) ||
            `${binding.name}-${String(binding.scope.id)}`,
        name: binding.name,
        props,
        retain: coerceNativeAttribute(readAttribute(binding.element, "retain") ?? "false", "BOOLEAN") === true,
    };
}
const textualNativeElements = new Set([
    "badge",
    "button",
    "card",
    "chip",
    "list-item",
    "text",
    "text-field",
    "search-field",
]);
/** @internal */
function readNativeStyle(element, name) {
    const view = element.ownerDocument.defaultView;
    if (!view)
        return {};
    const computed = view.getComputedStyle(element);
    const style = {};
    const length = (property) => {
        const cssProperty = property.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
        const value = computed.getPropertyValue(cssProperty);
        if (!value.endsWith("px"))
            return undefined;
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    };
    const positiveLength = (output, property) => {
        const value = length(property);
        if (value !== undefined && value > 0)
            style[output] = value;
    };
    const color = normalizeCssColor(computed.color);
    if (color)
        style.color = color;
    const backgroundColor = normalizeCssColor(computed.backgroundColor);
    if (backgroundColor && backgroundColor !== "#00000000") {
        style.backgroundColor = backgroundColor;
    }
    const borderColor = normalizeCssColor(computed.borderTopColor);
    const borderWidth = length("borderTopWidth");
    if (borderColor && borderWidth !== undefined && borderWidth > 0) {
        style.borderColor = borderColor;
        style.borderWidth = borderWidth;
    }
    positiveLength("borderRadius", "borderTopLeftRadius");
    positiveLength("width", "width");
    positiveLength("height", "height");
    positiveLength("minWidth", "minWidth");
    positiveLength("minHeight", "minHeight");
    positiveLength("paddingTop", "paddingTop");
    positiveLength("paddingRight", "paddingRight");
    positiveLength("paddingBottom", "paddingBottom");
    positiveLength("paddingLeft", "paddingLeft");
    positiveLength("marginTop", "marginTop");
    positiveLength("marginRight", "marginRight");
    positiveLength("marginBottom", "marginBottom");
    positiveLength("marginLeft", "marginLeft");
    const gap = length(name === "row" ? "columnGap" : "rowGap");
    if (gap !== undefined && gap > 0)
        style.gap = gap;
    const opacity = Number.parseFloat(computed.opacity);
    if (Number.isFinite(opacity) && opacity < 1)
        style.opacity = opacity;
    const elevation = shadowElevation(computed.boxShadow);
    if (elevation > 0)
        style.elevation = elevation;
    if (textualNativeElements.has(name)) {
        style.fontFamily = computed.fontFamily;
        style.fontStyle = computed.fontStyle;
        style.fontWeight = computed.fontWeight;
        style.textAlign = computed.textAlign;
        positiveLength("fontSize", "fontSize");
        positiveLength("lineHeight", "lineHeight");
        const letterSpacing = length("letterSpacing");
        if (letterSpacing !== undefined && letterSpacing !== 0) {
            style.letterSpacing = letterSpacing;
        }
    }
    if (name === "image" && computed.objectFit !== "fill") {
        style.objectFit = computed.objectFit;
    }
    const accentColor = normalizeCssColor(computed.accentColor);
    if (accentColor)
        style.accentColor = accentColor;
    return style;
}
function normalizeCssColor(value) {
    if (value.startsWith("#"))
        return value;
    const srgb = /^color\(srgb\s+([^\s]+)\s+([^\s]+)\s+([^\s/]+)(?:\s*\/\s*([^\s)]+))?\s*\)$/u.exec(value);
    if (srgb) {
        const red = normalizeCssColorComponent(srgb[1]);
        const green = normalizeCssColorComponent(srgb[2]);
        const blue = normalizeCssColorComponent(srgb[3]);
        const alpha = normalizeCssColorComponent(srgb.at(4) ?? "1");
        if (red === undefined ||
            green === undefined ||
            blue === undefined ||
            alpha === undefined) {
            return undefined;
        }
        return cssColorHex([red, green, blue], alpha);
    }
    const match = /^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?\s*\)$/u.exec(value);
    if (!match)
        return undefined;
    const channels = match.slice(1, 4).map((channel) => Number(channel));
    return cssColorHex(channels, Number(match[4] || 1));
}
function normalizeCssColorComponent(value) {
    const percentage = value.endsWith("%");
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed))
        return undefined;
    return Math.min(1, Math.max(0, percentage ? parsed / 100 : parsed));
}
function cssColorHex(channels, alpha) {
    const bytes = [
        ...channels.map((channel) => Math.round(channel <= 1 ? channel * 255 : channel)),
        Math.round(alpha * 255),
    ];
    const hex = bytes
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("");
    return bytes[3] === 255
        ? `#${hex.slice(0, 6)}`
        : `#${hex.slice(6)}${hex.slice(0, 6)}`;
}
function shadowElevation(value) {
    if (value === "none")
        return 0;
    const lengths = [...value.matchAll(/(-?[\d.]+)px/gu)].map((match) => Number(match[1]));
    return Math.max(0, lengths[2] ?? 0) / 2;
}
/** Converts an interpolated HTML attribute to its generated native property type. */
function coerceNativeAttribute(value, type) {
    switch (type) {
        case "BOOLEAN":
            return value === "" || value === "true";
        case "FLOAT":
        case "INTEGER": {
            const number = Number(value);
            if (!Number.isFinite(number)) {
                throw new TypeError(`Expected a finite ${type.toLowerCase()}`);
            }
            return type === "INTEGER" ? Math.trunc(number) : number;
        }
        case "JSON":
        case "STRING_LIST":
            return JSON.parse(value);
        default:
            return value;
    }
}
function dispatchNativeEvent(root, nativeEvent, parse, exceptionHandler) {
    let current = recordValue(nativeEvent.data);
    let target = root;
    let eventName = nativeEvent.event;
    while (eventName === "childEvent") {
        const key = typeof current?.key === "string" ? current.key : "";
        const child = target.childrenByKey.get(key);
        if (!child)
            return;
        target = child;
        eventName = typeof current?.event === "string" ? current.event : "";
        current = recordValue(current?.data);
    }
    const data = current ?? nativeEvent.data;
    if (target.model && eventName === "change") {
        const value = recordValue(data)?.value;
        target.model.setViewValue(value, "change");
    }
    const expression = readAttribute(target.element, `on-${kebabCase(eventName)}`);
    if (!expression)
        return;
    try {
        parse(expression)(target.scope, { $data: data, $event: nativeEvent });
    }
    catch (error) {
        exceptionHandler(error);
    }
}
function nativeChildren(element) {
    const children = [];
    for (const child of Array.from(element.children)) {
        const htmlChild = child;
        const binding = bindings.get(htmlChild);
        if (binding)
            children.push(binding);
        else
            children.push(...nativeChildren(htmlChild));
    }
    return children;
}
function scheduleNativeRoot(element) {
    let root = element;
    let parent = nearestNativeParent(root);
    while (parent) {
        root = parent.element;
        parent = nearestNativeParent(root);
    }
    rootSchedules.get(root)?.();
}
function nearestNativeParent(element) {
    let parent = element.parentElement;
    while (parent) {
        const binding = bindings.get(parent);
        if (binding)
            return binding;
        parent = parent.parentElement;
    }
    return undefined;
}
function readAttribute(element, name) {
    return (element.getAttribute(name) ??
        element.getAttribute(`data-${name}`) ??
        undefined);
}
function definitionFor(name) {
    return nativeElements[name];
}
function recordValue(value) {
    return isObject(value) ? value : undefined;
}
function kebabCase(value) {
    return value.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
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

export { coerceNativeAttribute, nativeElementDirective, nativeElementDirectiveName, readNativeStyle };
