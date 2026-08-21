import { _compile, _exceptionHandler } from '../../injection-tokens.js';
import { getCacheData, addElementDisposer } from '../../shared/dom.js';
import { isFunction, isArray } from '../../shared/utils.js';
import { observeScopeExpression, createScope } from '../scope/scope.js';
import { addCompiledFragmentDisposer, getCompiledFragmentRecord } from './incremental-fragment.js';

const PROGRAMMATIC_VIEW_MARKER = "ng-programmatic-view";
const PROGRAMMATIC_VIEW_TEMPLATE = `<!--${PROGRAMMATIC_VIEW_MARKER}-->`;
const bindingMetadata = Symbol("programmatic-view-binding");
const attributeGroup = Symbol("programmatic-view-attributes");
const propertyGroup = Symbol("programmatic-view-properties");
function markBinding(value, metadata) {
    Object.defineProperty(value, bindingMetadata, { value: metadata });
    return value;
}
function getBindingMetadata(value) {
    return isFunction(value)
        ? value[bindingMetadata]
        : undefined;
}
/** Marks a listener explicitly and optionally supplies native listener options. */
function event(listener, options) {
    const wrapper = function (value) {
        if (isFunction(listener)) {
            Reflect.apply(listener, this, [value]);
        }
        else {
            listener.handleEvent(value);
        }
    };
    return markBinding(wrapper, { _kind: "event", _options: options });
}
/** Forces the enclosed values to use DOM attribute semantics. */
function attrs(values) {
    return { [attributeGroup]: values };
}
/** Assigns the enclosed values as literal DOM properties. */
function props(values) {
    return { [propertyGroup]: values };
}
/**
 * Creates a keyed reactive collection. Existing DOM is retained while items
 * with stable keys move or change identity. Renderers receive an item reader so
 * nested reactive bindings follow same-key replacements.
 */
function each(read, key, render) {
    const binding = {
        _read: read,
        _key: key,
        _render: render,
    };
    const wrapper = () => {
        const items = read();
        return items === null || items === undefined
            ? []
            : Array.from(items, (item) => render(() => item));
    };
    return markBinding(wrapper, { _kind: "keyed-child", _binding: binding });
}
const pendingBindings = new WeakMap();
const tagProxyCache = new Map();
function addPendingBinding(node, binding) {
    let bindings = pendingBindings.get(node);
    if (!bindings) {
        bindings = [];
        pendingBindings.set(node, bindings);
    }
    bindings.push(binding);
}
function isProperties(value) {
    if (!value || typeof value !== "object" || value instanceof Node) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function isPropertyGroup(value) {
    return Boolean(value &&
        typeof value === "object" &&
        (attributeGroup in value || propertyGroup in value));
}
function setDomProperty(element, name, value) {
    if (name in element && Reflect.set(element, name, value)) {
        return;
    }
    if (value === null || value === undefined || value === false) {
        element.removeAttribute(name);
        return;
    }
    element.setAttribute(name, value === true
        ? ""
        : typeof value === "string"
            ? value
            : String(value));
}
const booleanAttributes = new Set([
    "allowfullscreen",
    "async",
    "autofocus",
    "autoplay",
    "checked",
    "controls",
    "default",
    "defer",
    "disabled",
    "formnovalidate",
    "hidden",
    "inert",
    "ismap",
    "itemscope",
    "loop",
    "multiple",
    "muted",
    "nomodule",
    "novalidate",
    "open",
    "playsinline",
    "readonly",
    "required",
    "reversed",
    "selected",
]);
const deferredStaticProperties = new Set(["innerhtml", "outerhtml", "srcdoc"]);
function setDomAttribute(element, name, value) {
    if (value === null ||
        value === undefined ||
        (value === false && booleanAttributes.has(name.toLowerCase()))) {
        element.removeAttribute(name);
        return;
    }
    element.setAttribute(name, value === true && booleanAttributes.has(name.toLowerCase())
        ? ""
        : String(value));
}
function setExplicitDomProperty(element, name, value) {
    if (!Reflect.set(element, name, value)) {
        throw new TypeError(`DOM property '${name}' cannot be assigned.`);
    }
}
function setDomValue(element, name, value, target) {
    if (target === "attribute") {
        setDomAttribute(element, name, value);
    }
    else if (target === "property") {
        setExplicitDomProperty(element, name, value);
    }
    else {
        setDomProperty(element, name, value);
    }
}
function applyProperty(element, propertyName, propertyValue, target) {
    if (target === "property") {
        if (deferredStaticProperties.has(propertyName.toLowerCase())) {
            addPendingBinding(element, {
                _kind: "static-property",
                _name: propertyName,
                _value: propertyValue,
                _target: target,
            });
        }
        else {
            setExplicitDomProperty(element, propertyName, propertyValue);
        }
        return;
    }
    const metadata = getBindingMetadata(propertyValue);
    const normalizedEventProperty = propertyName.startsWith("on")
        ? `on${propertyName.slice(2).toLowerCase()}`
        : "";
    const explicitEvent = metadata?._kind === "event";
    const conventionalEvent = Boolean(target === "auto" &&
        normalizedEventProperty &&
        normalizedEventProperty in element);
    if (explicitEvent || conventionalEvent) {
        if (propertyValue !== null &&
            propertyValue !== undefined &&
            !isFunction(propertyValue) &&
            !(typeof propertyValue === "object" &&
                typeof propertyValue.handleEvent === "function")) {
            throw new TypeError(`Event property '${propertyName}' must be an event listener.`);
        }
        if (propertyValue !== null && propertyValue !== undefined) {
            addPendingBinding(element, {
                _kind: "event",
                _name: explicitEvent
                    ? propertyName.startsWith("on")
                        ? propertyName.slice(2).toLowerCase()
                        : propertyName
                    : normalizedEventProperty.slice(2),
                _listener: propertyValue,
                _options: metadata?._kind === "event" ? metadata._options : undefined,
            });
        }
    }
    else if (isFunction(propertyValue)) {
        addPendingBinding(element, {
            _kind: "property",
            _name: propertyName,
            _read: propertyValue,
            _target: target === "auto" ? "property" : target,
        });
    }
    else if (deferredStaticProperties.has(propertyName.toLowerCase())) {
        addPendingBinding(element, {
            _kind: "static-property",
            _name: propertyName,
            _value: propertyValue,
            _target: target,
        });
    }
    else {
        setDomValue(element, propertyName, propertyValue, target);
    }
}
function materializeChild(value, nodes) {
    if (isArray(value)) {
        for (let index = 0; index < value.length; index++) {
            materializeChild(value[index], nodes);
        }
        return;
    }
    if (value instanceof DocumentFragment) {
        const children = Array.from(value.childNodes);
        for (let index = 0; index < children.length; index++) {
            nodes.push(children[index]);
        }
        return;
    }
    if (value instanceof Node) {
        nodes.push(value);
        return;
    }
    if (isFunction(value)) {
        const metadata = getBindingMetadata(value);
        if (metadata?._kind === "keyed-child") {
            const anchor = document.createComment("ng-view-each");
            addPendingBinding(anchor, {
                _kind: "keyed-child",
                _binding: metadata._binding,
            });
            nodes.push(anchor);
            return;
        }
    }
    if (isFunction(value)) {
        const anchor = document.createComment("ng-view-binding");
        addPendingBinding(anchor, {
            _kind: "child",
            _read: value,
        });
        nodes.push(anchor);
        return;
    }
    if (value !== null && value !== undefined && value !== false) {
        nodes.push(document.createTextNode(String(value)));
    }
}
function materializeComponentView(value) {
    const nodes = [];
    materializeChild(value, nodes);
    return nodes;
}
function appendChildren(element, children) {
    for (let index = 0; index < children.length; index++) {
        const nodes = materializeComponentView(children[index]);
        for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
            element.appendChild(nodes[nodeIndex]);
        }
    }
}
function createTag(namespaceUri, name, ...args) {
    const properties = isProperties(args[0]) ? args[0] : undefined;
    const children = properties ? args.slice(1) : args;
    const customElementName = properties?.is;
    const element = namespaceUri
        ? document.createElementNS(namespaceUri, name, customElementName ? { is: customElementName } : undefined)
        : document.createElement(name, customElementName ? { is: customElementName } : undefined);
    if (properties) {
        for (const [propertyName, propertyValue] of Object.entries(properties)) {
            if (propertyName === "is")
                continue;
            applyProperty(element, propertyName, propertyValue, "auto");
        }
        if (isPropertyGroup(properties)) {
            const attributeValues = properties[attributeGroup];
            const propertyValues = properties[propertyGroup];
            if (attributeValues) {
                for (const [name, value] of Object.entries(attributeValues)) {
                    applyProperty(element, name, value, "attribute");
                }
            }
            if (propertyValues) {
                for (const [name, value] of Object.entries(propertyValues)) {
                    applyProperty(element, name, value, "property");
                }
            }
        }
    }
    appendChildren(element, children);
    return element;
}
function tag(name, ...args) {
    return createTag(undefined, name, ...args);
}
/** Creates one namespaced element without parsing markup. */
function tagNS(namespaceUri, name, ...args) {
    return createTag(namespaceUri, name, ...args);
}
function getTagProxy(namespaceUri) {
    const cacheKey = namespaceUri ?? "";
    const cached = tagProxyCache.get(cacheKey);
    if (cached)
        return cached;
    const tagFunctions = new Map();
    const proxy = new Proxy(Object.create(null), {
        get(_target, property) {
            if (typeof property !== "string")
                return undefined;
            if (property === "then")
                return undefined;
            let tagFunction = tagFunctions.get(property);
            if (!tagFunction) {
                tagFunction = (...args) => createTag(namespaceUri, property, ...args);
                tagFunctions.set(property, tagFunction);
            }
            return tagFunction;
        },
    });
    tagProxyCache.set(cacheKey, proxy);
    return proxy;
}
const htmlTags = getTagProxy();
const tags = new Proxy(((namespaceUri) => getTagProxy(namespaceUri)), {
    get(_target, property) {
        if (property === "then")
            return undefined;
        return Reflect.get(htmlTags, property);
    },
});
function uniqueRecords(nodes) {
    const records = [];
    const seen = new Set();
    for (let index = 0; index < nodes.length; index++) {
        const record = getCompiledFragmentRecord(nodes[index]);
        if (record && !seen.has(record)) {
            seen.add(record);
            records.push(record);
        }
    }
    return records;
}
function disposeLinkedChildren(children) {
    const disposedRecords = new Set();
    for (let index = children.length - 1; index >= 0; index--) {
        const child = children[index];
        for (let recordIndex = child._records.length - 1; recordIndex >= 0; recordIndex--) {
            const record = child._records[recordIndex];
            if (!record.disposed && !disposedRecords.has(record)) {
                disposedRecords.add(record);
                record.dispose();
            }
        }
        for (let nodeIndex = child._nodes.length - 1; nodeIndex >= 0; nodeIndex--) {
            const node = child._nodes[nodeIndex];
            node.parentNode?.removeChild(node);
        }
    }
    children.length = 0;
}
function linkChildValue(value, parent, anchor, runtime) {
    return linkMaterializedChildren(materializeComponentView(value), parent, anchor, runtime);
}
function linkMaterializedChildren(rawNodes, parent, anchor, runtime) {
    const children = [];
    for (let index = 0; index < rawNodes.length; index++) {
        const rawNode = rawNodes[index];
        parent.insertBefore(rawNode, anchor);
        const linkedNodes = runtime._linkNode(rawNode, parent, anchor);
        for (let nodeIndex = 0; nodeIndex < linkedNodes.length; nodeIndex++) {
            const linkedNode = linkedNodes[nodeIndex];
            parent.insertBefore(linkedNode, anchor);
            activateProgrammaticBindings([linkedNode], runtime);
        }
        children.push({
            _nodes: linkedNodes,
            _records: uniqueRecords(linkedNodes),
        });
    }
    return children;
}
function activateChildBinding(anchor, read, runtime) {
    const linkedChildren = [];
    const stop = observeScopeExpression(runtime._scope, read, (value) => {
        const parent = anchor.parentNode;
        if (!parent)
            return;
        if (linkedChildren.length === 1 &&
            linkedChildren[0]._nodes.length === 1 &&
            linkedChildren[0]._nodes[0] instanceof Text &&
            value !== null &&
            value !== undefined &&
            value !== false &&
            !isFunction(value) &&
            !isArray(value) &&
            !(value instanceof Node)) {
            linkedChildren[0]._nodes[0].data = String(value);
            return;
        }
        disposeLinkedChildren(linkedChildren);
        linkedChildren.push(...linkChildValue(value, parent, anchor, runtime));
    });
    return () => {
        stop();
        disposeLinkedChildren(linkedChildren);
    };
}
function activateKeyedChildBinding(anchor, binding, runtime) {
    let states = new Map();
    const stop = observeScopeExpression(runtime._scope, binding._read, (value) => {
        const parent = anchor.parentNode;
        if (!parent)
            return;
        const items = value === null || value === undefined
            ? []
            : Array.from(value);
        const descriptors = [];
        const descriptorByKey = new Map();
        for (let index = 0; index < items.length; index++) {
            const item = items[index];
            const key = binding._key(item);
            if (descriptorByKey.has(key)) {
                throw new TypeError(`Duplicate programmatic view key '${String(key)}'.`);
            }
            descriptorByKey.set(key, item);
            const previous = states.get(key);
            const holder = previous
                ? previous._holder
                : createScope({ value: item }, runtime._scope._handler);
            descriptors.push({
                _key: key,
                _value: item,
                _holder: holder,
                _nodes: previous
                    ? []
                    : materializeComponentView(binding._render(() => holder.value)),
            });
        }
        const nextStates = new Map();
        for (const [key, state] of states) {
            if (!descriptorByKey.has(key)) {
                disposeLinkedChildren(state._children);
            }
        }
        for (let index = 0; index < descriptors.length; index++) {
            const descriptor = descriptors[index];
            const previous = states.get(descriptor._key);
            const children = previous
                ? previous._children
                : linkMaterializedChildren(descriptor._nodes, parent, anchor, runtime);
            if (previous && !Object.is(previous._value, descriptor._value)) {
                descriptor._holder.value = descriptor._value;
            }
            const state = {
                _key: descriptor._key,
                _value: descriptor._value,
                _holder: descriptor._holder,
                _children: children,
            };
            nextStates.set(state._key, state);
        }
        states = nextStates;
        let cursor = anchor;
        const orderedStates = Array.from(states.values());
        for (let stateIndex = orderedStates.length - 1; stateIndex >= 0; stateIndex--) {
            const children = orderedStates[stateIndex]._children;
            for (let childIndex = children.length - 1; childIndex >= 0; childIndex--) {
                const nodes = children[childIndex]._nodes;
                for (let nodeIndex = nodes.length - 1; nodeIndex >= 0; nodeIndex--) {
                    const node = nodes[nodeIndex];
                    if (node.nextSibling !== cursor)
                        parent.insertBefore(node, cursor);
                    cursor = node;
                }
            }
        }
    });
    return () => {
        stop();
        for (const state of states.values()) {
            disposeLinkedChildren(state._children);
        }
        states.clear();
    };
}
function activateNodeBindings(node, runtime, disposers) {
    const bindings = pendingBindings.get(node);
    if (bindings) {
        pendingBindings.delete(node);
        for (let index = 0; index < bindings.length; index++) {
            const binding = bindings[index];
            if (binding._kind === "event") {
                const eventTarget = node;
                const listener = function (eventValue) {
                    try {
                        if (isFunction(binding._listener)) {
                            Reflect.apply(binding._listener, this, [eventValue]);
                        }
                        else {
                            binding._listener.handleEvent(eventValue);
                        }
                    }
                    catch (error) {
                        runtime._exceptionHandler(error);
                    }
                };
                eventTarget.addEventListener(binding._name, listener, binding._options);
                disposers.push(() => {
                    eventTarget.removeEventListener(binding._name, listener, binding._options);
                });
            }
            else if (binding._kind === "static-property") {
                try {
                    const sanitizedValue = runtime._sanitizeProperty(node, binding._name, binding._value);
                    setDomValue(node, binding._name, sanitizedValue, binding._target);
                }
                catch (error) {
                    runtime._exceptionHandler(error);
                }
            }
            else if (binding._kind === "property") {
                let hasValue = false;
                let previousValue;
                disposers.push(observeScopeExpression(runtime._scope, binding._read, (value) => {
                    const sanitizedValue = runtime._sanitizeProperty(node, binding._name, value);
                    if (hasValue && Object.is(previousValue, sanitizedValue))
                        return;
                    hasValue = true;
                    previousValue = sanitizedValue;
                    setDomValue(node, binding._name, sanitizedValue, binding._target);
                }));
            }
            else if (binding._kind === "child") {
                disposers.push(activateChildBinding(node, binding._read, runtime));
            }
            else {
                disposers.push(activateKeyedChildBinding(node, binding._binding, runtime));
            }
        }
    }
    const childNodes = Array.from(node.childNodes);
    for (let index = 0; index < childNodes.length; index++) {
        activateNodeBindings(childNodes[index], runtime, disposers);
    }
}
function activateProgrammaticBindings(nodes, runtime) {
    const disposers = [];
    for (let index = 0; index < nodes.length; index++) {
        activateNodeBindings(nodes[index], runtime, disposers);
    }
    const dispose = () => {
        for (let index = disposers.length - 1; index >= 0; index--) {
            disposers[index]();
        }
        disposers.length = 0;
    };
    const release = runtime._ownDisposer(dispose);
    disposers.push(release);
    const owner = uniqueRecords(nodes).at(0);
    if (owner)
        addCompiledFragmentDisposer(owner, dispose);
    return dispose;
}
function findMarker(element) {
    for (let node = element.firstChild; node; node = node.nextSibling) {
        if (node instanceof Comment &&
            node.data.trim() === PROGRAMMATIC_VIEW_MARKER) {
            return node;
        }
    }
    return undefined;
}
function normalizeLinkResult(result) {
    return isArray(result) ? result : [result];
}
function createProgrammaticDirectiveCompile(options) {
    return (() => {
        const pre = (scope, element, requiredControllers, transclude) => {
            const marker = findMarker(element);
            if (!marker) {
                throw new Error(`Programmatic component '${options.name}' has no view marker.`);
            }
            if (!options.hasRequire) {
                transclude = requiredControllers;
                requiredControllers = undefined;
            }
            const controller = getCacheData(element, `$${options.name}Controller`);
            const $compile = options.injector.get(_compile);
            const $exceptionHandler = options.injector.get(_exceptionHandler);
            const cleanups = [];
            let destroyed = false;
            const disposeView = () => {
                destroyed = true;
                for (let index = cleanups.length - 1; index >= 0; index--) {
                    try {
                        cleanups[index]();
                    }
                    catch (error) {
                        $exceptionHandler(error);
                    }
                }
                cleanups.length = 0;
            };
            cleanups.push(addElementDisposer(element, disposeView));
            cleanups.push(scope.on("$destroy", disposeView));
            const context = {
                controller,
                required: requiredControllers,
                scope,
                element,
                transclude,
                onDestroy(cleanup) {
                    if (!isFunction(cleanup)) {
                        throw new TypeError("Programmatic view cleanup must be a function.");
                    }
                    if (destroyed) {
                        try {
                            cleanup();
                        }
                        catch (error) {
                            $exceptionHandler(error);
                        }
                        return () => { };
                    }
                    const entry = () => {
                        cleanup();
                    };
                    cleanups.push(entry);
                    let active = true;
                    return () => {
                        if (!active)
                            return;
                        active = false;
                        const index = cleanups.indexOf(entry);
                        if (index !== -1)
                            cleanups.splice(index, 1);
                    };
                },
            };
            const value = Reflect.apply(options.view, controller ?? null, [
                context,
            ]);
            const rawNodes = materializeComponentView(value);
            const bindingDisposers = new Set();
            cleanups.push(() => {
                for (const dispose of Array.from(bindingDisposers))
                    dispose();
                bindingDisposers.clear();
            });
            const runtime = {
                _scope: scope,
                _sanitizeProperty: options.sanitizeProperty,
                _exceptionHandler: $exceptionHandler,
                /** @internal Registers a binding disposer owned by this view. */
                _ownDisposer(disposer) {
                    bindingDisposers.add(disposer);
                    return () => {
                        bindingDisposers.delete(disposer);
                    };
                },
                /** @internal Links one generated node against the owning scope. */
                _linkNode(node, parent) {
                    try {
                        const linked = $compile(node)(scope, undefined, {
                            _futureParentElement: parent,
                            _ownsNodes: true,
                        });
                        return normalizeLinkResult(linked);
                    }
                    catch (error) {
                        node.parentNode?.removeChild(node);
                        $exceptionHandler(error);
                        return [];
                    }
                },
            };
            const boundary = marker.nextSibling;
            linkMaterializedChildren(rawNodes, element, boundary, runtime);
        };
        const post = (_scope, element) => {
            findMarker(element)?.remove();
        };
        return { pre, post };
    });
}
const createProgrammaticComponentCompile = createProgrammaticDirectiveCompile;
function sanitizeProgrammaticSrcset(value, valueOf, trustMediaUrl) {
    const unwrapped = valueOf(value);
    if (!unwrapped)
        return unwrapped;
    if (typeof unwrapped !== "string") {
        throw new TypeError("A programmatic srcset binding must produce a string.");
    }
    return unwrapped
        .split(",")
        .map((candidate) => {
        const trimmed = candidate.trim();
        const separator = trimmed.search(/\s/);
        const url = separator === -1 ? trimmed : trimmed.slice(0, separator);
        const descriptor = separator === -1 ? "" : trimmed.slice(separator);
        return `${String(trustMediaUrl(url))}${descriptor}`;
    })
        .join(", ");
}

export { PROGRAMMATIC_VIEW_MARKER, PROGRAMMATIC_VIEW_TEMPLATE, attrs, createProgrammaticComponentCompile, createProgrammaticDirectiveCompile, each, event, materializeComponentView, props, sanitizeProgrammaticSrcset, tag, tagNS, tags };
