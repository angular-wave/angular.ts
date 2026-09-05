import { _compile, _exceptionHandler } from '../../injection-tokens.js';
import { getCacheData, addElementDisposer, dealoc } from '../../shared/dom.js';
import { isFunction, isArray } from '../../shared/utils.js';
import { observeScopeExpression, createScope, getArrayMutationMeta } from '../scope/scope.js';
import { addCompiledFragmentDisposer, getCompiledFragmentRecord, disposeCompiledFragmentRecords } from './incremental-fragment.js';
import { planKeyedReconciliation } from './keyed-reconciler.js';

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
function each(read, key, render) {
    const binding = {
        _read: read,
        _key: key,
        _render: render,
    };
    const wrapper = () => {
        const items = read();
        if (items === null || items === undefined)
            return [];
        const children = [];
        for (const item of items) {
            children.push(render(() => item));
        }
        return children;
    };
    return markBinding(wrapper, {
        _kind: "keyed-child",
        _binding: binding,
    });
}
function firstKeyedStateNode(state) {
    for (let index = 0; index < state._children.length; index++) {
        const nodes = state._children[index]._nodes;
        if (nodes.length > 0)
            return nodes[0];
    }
    return undefined;
}
function lastKeyedStateNode(state) {
    for (let index = state._children.length - 1; index >= 0; index--) {
        const nodes = state._children[index]._nodes;
        if (nodes.length > 0)
            return nodes[nodes.length - 1];
    }
    return undefined;
}
function detachKeyedStateRange(states, anchor) {
    let firstState;
    let lastState;
    for (const state of states) {
        if (!firstState || state._index < firstState._index)
            firstState = state;
        if (!lastState || state._index > lastState._index)
            lastState = state;
    }
    if (!firstState || !lastState)
        return;
    const firstNode = firstKeyedStateNode(firstState);
    const lastNode = lastKeyedStateNode(lastState);
    const parent = firstNode?.parentNode;
    if (!firstNode || !lastNode || !parent || parent !== lastNode.parentNode) {
        return;
    }
    if (firstNode === parent.firstChild &&
        lastNode.nextSibling === anchor &&
        anchor.nextSibling === null) {
        parent.replaceChildren(anchor);
        return;
    }
    const range = document.createRange();
    range.setStartBefore(firstNode);
    range.setEndAfter(lastNode);
    range.deleteContents();
}
function moveKeyedStateBefore(parent, state, before) {
    for (let childIndex = 0; childIndex < state._children.length; childIndex++) {
        const nodes = state._children[childIndex]._nodes;
        for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
            parent.insertBefore(nodes[nodeIndex], before);
        }
    }
}
const pendingBindings = new WeakMap();
const tagProxyCache = new Map();
function addPendingBinding(node, binding) {
    const bindings = pendingBindings.get(node);
    if (!bindings) {
        pendingBindings.set(node, binding);
        return;
    }
    if (isArray(bindings)) {
        bindings.push(binding);
    }
    else {
        pendingBindings.set(node, [bindings, binding]);
    }
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
            _target: target === "auto" && propertyName !== "class" ? "property" : target,
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
    if (value !== null && value !== undefined && typeof value !== "boolean") {
        nodes.push(document.createTextNode(String(value)));
    }
}
function materializeProgrammaticView(value) {
    const nodes = [];
    materializeChild(value, nodes);
    return nodes;
}
function appendChildren(element, children, startIndex) {
    const nodes = [];
    for (let index = startIndex; index < children.length; index++) {
        materializeChild(children[index], nodes);
    }
    for (let index = 0; index < nodes.length; index++) {
        element.appendChild(nodes[index]);
    }
}
function createTag(namespaceUri, name, ...args) {
    const properties = isProperties(args[0]) ? args[0] : undefined;
    const customElementName = properties?.is;
    const element = namespaceUri
        ? document.createElementNS(namespaceUri, name, customElementName ? { is: customElementName } : undefined)
        : document.createElement(name, customElementName ? { is: customElementName } : undefined);
    if (properties) {
        const propertyNames = Object.keys(properties);
        for (let index = 0; index < propertyNames.length; index++) {
            const propertyName = propertyNames[index];
            if (propertyName === "is")
                continue;
            applyProperty(element, propertyName, properties[propertyName], "auto");
        }
        if (isPropertyGroup(properties)) {
            const attributeValues = properties[attributeGroup];
            const propertyValues = properties[propertyGroup];
            if (attributeValues) {
                const names = Object.keys(attributeValues);
                for (let index = 0; index < names.length; index++) {
                    const name = names[index];
                    applyProperty(element, name, attributeValues[name], "attribute");
                }
            }
            if (propertyValues) {
                const names = Object.keys(propertyValues);
                for (let index = 0; index < names.length; index++) {
                    const name = names[index];
                    applyProperty(element, name, propertyValues[name], "property");
                }
            }
        }
    }
    appendChildren(element, args, properties ? 1 : 0);
    return element;
}
function tag(name, ...args) {
    return createTag(undefined, name, ...args);
}
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
const htmlTags = /* @__PURE__ */ getTagProxy();
const tags = /* @__PURE__ */ new Proxy(((namespaceUri) => getTagProxy(namespaceUri)), {
    get(_target, property) {
        if (property === "then")
            return undefined;
        return Reflect.get(htmlTags, property);
    },
});
/** Direct, tree-shakable factories for every supported HTML element. */
// HTMLElementTagNameMap
const a = (...args) => createTag(undefined, "a", ...args);
const abbr = (...args) => createTag(undefined, "abbr", ...args);
const address = (...args) => createTag(undefined, "address", ...args);
const area = (...args) => createTag(undefined, "area", ...args);
const article = (...args) => createTag(undefined, "article", ...args);
const aside = (...args) => createTag(undefined, "aside", ...args);
const audio = (...args) => createTag(undefined, "audio", ...args);
const b = (...args) => createTag(undefined, "b", ...args);
const base = (...args) => createTag(undefined, "base", ...args);
const bdi = (...args) => createTag(undefined, "bdi", ...args);
const bdo = (...args) => createTag(undefined, "bdo", ...args);
const blockquote = (...args) => createTag(undefined, "blockquote", ...args);
const body = (...args) => createTag(undefined, "body", ...args);
const br = (...args) => createTag(undefined, "br", ...args);
const button = (...args) => createTag(undefined, "button", ...args);
const canvas = (...args) => createTag(undefined, "canvas", ...args);
const caption = (...args) => createTag(undefined, "caption", ...args);
const cite = (...args) => createTag(undefined, "cite", ...args);
const code = (...args) => createTag(undefined, "code", ...args);
const col = (...args) => createTag(undefined, "col", ...args);
const colgroup = (...args) => createTag(undefined, "colgroup", ...args);
const data = (...args) => createTag(undefined, "data", ...args);
const datalist = (...args) => createTag(undefined, "datalist", ...args);
const dd = (...args) => createTag(undefined, "dd", ...args);
const del = (...args) => createTag(undefined, "del", ...args);
const details = (...args) => createTag(undefined, "details", ...args);
const dfn = (...args) => createTag(undefined, "dfn", ...args);
const dialog = (...args) => createTag(undefined, "dialog", ...args);
const div = (...args) => createTag(undefined, "div", ...args);
const dl = (...args) => createTag(undefined, "dl", ...args);
const dt = (...args) => createTag(undefined, "dt", ...args);
const em = (...args) => createTag(undefined, "em", ...args);
const embed = (...args) => createTag(undefined, "embed", ...args);
const fieldset = (...args) => createTag(undefined, "fieldset", ...args);
const figcaption = (...args) => createTag(undefined, "figcaption", ...args);
const figure = (...args) => createTag(undefined, "figure", ...args);
const footer = (...args) => createTag(undefined, "footer", ...args);
const form = (...args) => createTag(undefined, "form", ...args);
const h1 = (...args) => createTag(undefined, "h1", ...args);
const h2 = (...args) => createTag(undefined, "h2", ...args);
const h3 = (...args) => createTag(undefined, "h3", ...args);
const h4 = (...args) => createTag(undefined, "h4", ...args);
const h5 = (...args) => createTag(undefined, "h5", ...args);
const h6 = (...args) => createTag(undefined, "h6", ...args);
const head = (...args) => createTag(undefined, "head", ...args);
const header = (...args) => createTag(undefined, "header", ...args);
const hgroup = (...args) => createTag(undefined, "hgroup", ...args);
const hr = (...args) => createTag(undefined, "hr", ...args);
const html = (...args) => createTag(undefined, "html", ...args);
const i = (...args) => createTag(undefined, "i", ...args);
const iframe = (...args) => createTag(undefined, "iframe", ...args);
const img = (...args) => createTag(undefined, "img", ...args);
const input = (...args) => createTag(undefined, "input", ...args);
const ins = (...args) => createTag(undefined, "ins", ...args);
const kbd = (...args) => createTag(undefined, "kbd", ...args);
const label = (...args) => createTag(undefined, "label", ...args);
const legend = (...args) => createTag(undefined, "legend", ...args);
const li = (...args) => createTag(undefined, "li", ...args);
const link = (...args) => createTag(undefined, "link", ...args);
const main = (...args) => createTag(undefined, "main", ...args);
const map = (...args) => createTag(undefined, "map", ...args);
const mark = (...args) => createTag(undefined, "mark", ...args);
const menu = (...args) => createTag(undefined, "menu", ...args);
const meta = (...args) => createTag(undefined, "meta", ...args);
const meter = (...args) => createTag(undefined, "meter", ...args);
const nav = (...args) => createTag(undefined, "nav", ...args);
const noscript = (...args) => createTag(undefined, "noscript", ...args);
const object = (...args) => createTag(undefined, "object", ...args);
const ol = (...args) => createTag(undefined, "ol", ...args);
const optgroup = (...args) => createTag(undefined, "optgroup", ...args);
const option = (...args) => createTag(undefined, "option", ...args);
const output = (...args) => createTag(undefined, "output", ...args);
const p = (...args) => createTag(undefined, "p", ...args);
const picture = (...args) => createTag(undefined, "picture", ...args);
const pre = (...args) => createTag(undefined, "pre", ...args);
const progress = (...args) => createTag(undefined, "progress", ...args);
const q = (...args) => createTag(undefined, "q", ...args);
const rp = (...args) => createTag(undefined, "rp", ...args);
const rt = (...args) => createTag(undefined, "rt", ...args);
const ruby = (...args) => createTag(undefined, "ruby", ...args);
const s = (...args) => createTag(undefined, "s", ...args);
const samp = (...args) => createTag(undefined, "samp", ...args);
const script = (...args) => createTag(undefined, "script", ...args);
const search = (...args) => createTag(undefined, "search", ...args);
const section = (...args) => createTag(undefined, "section", ...args);
const select = (...args) => createTag(undefined, "select", ...args);
const slot = (...args) => createTag(undefined, "slot", ...args);
const small = (...args) => createTag(undefined, "small", ...args);
const source = (...args) => createTag(undefined, "source", ...args);
const span = (...args) => createTag(undefined, "span", ...args);
const strong = (...args) => createTag(undefined, "strong", ...args);
const style = (...args) => createTag(undefined, "style", ...args);
const sub = (...args) => createTag(undefined, "sub", ...args);
const summary = (...args) => createTag(undefined, "summary", ...args);
const sup = (...args) => createTag(undefined, "sup", ...args);
const table = (...args) => createTag(undefined, "table", ...args);
const tbody = (...args) => createTag(undefined, "tbody", ...args);
const td = (...args) => createTag(undefined, "td", ...args);
const template = (...args) => createTag(undefined, "template", ...args);
const textarea = (...args) => createTag(undefined, "textarea", ...args);
const tfoot = (...args) => createTag(undefined, "tfoot", ...args);
const th = (...args) => createTag(undefined, "th", ...args);
const thead = (...args) => createTag(undefined, "thead", ...args);
const time = (...args) => createTag(undefined, "time", ...args);
const title = (...args) => createTag(undefined, "title", ...args);
const tr = (...args) => createTag(undefined, "tr", ...args);
const track = (...args) => createTag(undefined, "track", ...args);
const u = (...args) => createTag(undefined, "u", ...args);
const ul = (...args) => createTag(undefined, "ul", ...args);
const varTag = (...args) => createTag(undefined, "var", ...args);
const video = (...args) => createTag(undefined, "video", ...args);
const wbr = (...args) => createTag(undefined, "wbr", ...args);
// HTMLElementDeprecatedTagNameMap
const acronym = (...args) => createTag(undefined, "acronym", ...args);
const applet = (...args) => createTag(undefined, "applet", ...args);
const basefont = (...args) => createTag(undefined, "basefont", ...args);
const bgsound = (...args) => createTag(undefined, "bgsound", ...args);
const big = (...args) => createTag(undefined, "big", ...args);
const blink = (...args) => createTag(undefined, "blink", ...args);
const center = (...args) => createTag(undefined, "center", ...args);
const dir = (...args) => createTag(undefined, "dir", ...args);
const font = (...args) => createTag(undefined, "font", ...args);
const frame = (...args) => createTag(undefined, "frame", ...args);
const frameset = (...args) => createTag(undefined, "frameset", ...args);
const isindex = (...args) => createTag(undefined, "isindex", ...args);
const keygen = (...args) => createTag(undefined, "keygen", ...args);
const listing = (...args) => createTag(undefined, "listing", ...args);
const marquee = (...args) => createTag(undefined, "marquee", ...args);
const menuitem = (...args) => createTag(undefined, "menuitem", ...args);
const multicol = (...args) => createTag(undefined, "multicol", ...args);
const nextid = (...args) => createTag(undefined, "nextid", ...args);
const nobr = (...args) => createTag(undefined, "nobr", ...args);
const noembed = (...args) => createTag(undefined, "noembed", ...args);
const noframes = (...args) => createTag(undefined, "noframes", ...args);
const param = (...args) => createTag(undefined, "param", ...args);
const plaintext = (...args) => createTag(undefined, "plaintext", ...args);
const rb = (...args) => createTag(undefined, "rb", ...args);
const rtc = (...args) => createTag(undefined, "rtc", ...args);
const spacer = (...args) => createTag(undefined, "spacer", ...args);
const strike = (...args) => createTag(undefined, "strike", ...args);
const tt = (...args) => createTag(undefined, "tt", ...args);
const xmp = (...args) => createTag(undefined, "xmp", ...args);
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
function disposeLinkedChildrenGroups(groups) {
    const disposedRecords = new Set();
    const records = [];
    for (let groupIndex = groups.length - 1; groupIndex >= 0; groupIndex--) {
        const children = groups[groupIndex];
        for (let index = children.length - 1; index >= 0; index--) {
            const child = children[index];
            child._disposeBindings();
            for (let recordIndex = child._records.length - 1; recordIndex >= 0; recordIndex--) {
                const record = child._records[recordIndex];
                if (!record.disposed && !disposedRecords.has(record)) {
                    disposedRecords.add(record);
                    records.push(record);
                }
            }
        }
    }
    disposeCompiledFragmentRecords(records);
    for (let groupIndex = groups.length - 1; groupIndex >= 0; groupIndex--) {
        const children = groups[groupIndex];
        for (let index = children.length - 1; index >= 0; index--) {
            const child = children[index];
            for (let nodeIndex = child._nodes.length - 1; nodeIndex >= 0; nodeIndex--) {
                const node = child._nodes[nodeIndex];
                if (node instanceof Element)
                    dealoc(node);
                node.parentNode?.removeChild(node);
            }
        }
        children.length = 0;
    }
}
function disposeLinkedChildren(children) {
    disposeLinkedChildrenGroups([children]);
}
function linkChildValue(value, parent, anchor, runtime) {
    return linkMaterializedChildren(materializeProgrammaticView(value), parent, anchor, runtime);
}
function linkMaterializedChildren(rawNodes, parent, anchor, runtime) {
    const children = [];
    for (let index = 0; index < rawNodes.length; index++) {
        const rawNode = rawNodes[index];
        parent.insertBefore(rawNode, anchor);
        const linkedNodes = runtime._linkNode(rawNode, parent, anchor);
        let cursor = anchor;
        let alreadyPlaced = true;
        for (let nodeIndex = linkedNodes.length - 1; nodeIndex >= 0; nodeIndex--) {
            const linkedNode = linkedNodes[nodeIndex];
            if (linkedNode.parentNode !== parent ||
                linkedNode.nextSibling !== cursor) {
                alreadyPlaced = false;
                break;
            }
            cursor = linkedNode;
        }
        for (let nodeIndex = 0; nodeIndex < linkedNodes.length; nodeIndex++) {
            const linkedNode = linkedNodes[nodeIndex];
            if (!alreadyPlaced)
                parent.insertBefore(linkedNode, anchor);
        }
        children.push({
            _nodes: linkedNodes,
            _records: uniqueRecords(linkedNodes),
            _disposeBindings: activateProgrammaticBindings(linkedNodes, runtime),
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
    }, false);
    return () => {
        stop();
        disposeLinkedChildren(linkedChildren);
    };
}
function activateKeyedChildBinding(anchor, binding, runtime) {
    let states = new Map();
    let observedItems = [];
    let stablePrefixLength = 0;
    let removedIndex = -1;
    let swappedIndexes;
    let observedArray;
    let lastSeenArrayMutationVersion = 0;
    const stop = observeScopeExpression(runtime._scope, () => {
        const value = binding._read();
        if (value === null || value === undefined) {
            stablePrefixLength = 0;
            removedIndex = -1;
            swappedIndexes = undefined;
            observedArray = undefined;
            if (observedItems.length !== 0)
                observedItems = [];
            return observedItems;
        }
        if (isArray(value)) {
            const length = value.length;
            const mutationMeta = observedArray === value ? getArrayMutationMeta(value) : undefined;
            if (mutationMeta &&
                mutationMeta._version > lastSeenArrayMutationVersion &&
                mutationMeta._previousLength === observedItems.length &&
                mutationMeta._currentLength === length) {
                lastSeenArrayMutationVersion = mutationMeta._version;
                if (mutationMeta._kind === "swap") {
                    stablePrefixLength = mutationMeta._swapFromIndex;
                    removedIndex = -1;
                    swappedIndexes = [
                        mutationMeta._swapFromIndex,
                        mutationMeta._swapToIndex,
                    ];
                    observedItems = value.slice();
                    return observedItems;
                }
                if (mutationMeta._kind === "splice" &&
                    mutationMeta._deleteCount === 0 &&
                    mutationMeta._index === mutationMeta._previousLength) {
                    stablePrefixLength = mutationMeta._previousLength;
                    removedIndex = -1;
                    swappedIndexes = undefined;
                    observedItems = value.slice();
                    return observedItems;
                }
                if (mutationMeta._kind === "splice" &&
                    mutationMeta._deleteCount === 1 &&
                    mutationMeta._insertCount === 0) {
                    stablePrefixLength = mutationMeta._index;
                    removedIndex = mutationMeta._index;
                    swappedIndexes = undefined;
                    observedItems = value.slice();
                    return observedItems;
                }
            }
            let index = 0;
            while (index < length &&
                index < observedItems.length &&
                Object.is(observedItems[index], value[index])) {
                index++;
            }
            stablePrefixLength = index;
            removedIndex = -1;
            swappedIndexes = undefined;
            if (index === length && index === observedItems.length) {
                return observedItems;
            }
            if (observedItems.length === length + 1 &&
                index < observedItems.length) {
                let suffixIndex = index;
                while (suffixIndex < length &&
                    Object.is(observedItems[suffixIndex + 1], value[suffixIndex])) {
                    suffixIndex++;
                }
                if (suffixIndex === length)
                    removedIndex = index;
            }
            else if (observedItems.length === length && index < length) {
                let secondIndex = index + 1;
                while (secondIndex < length &&
                    Object.is(observedItems[secondIndex], value[secondIndex])) {
                    secondIndex++;
                }
                if (secondIndex < length &&
                    Object.is(observedItems[index], value[secondIndex]) &&
                    Object.is(observedItems[secondIndex], value[index])) {
                    let suffixIndex = secondIndex + 1;
                    while (suffixIndex < length &&
                        Object.is(observedItems[suffixIndex], value[suffixIndex])) {
                        suffixIndex++;
                    }
                    if (suffixIndex === length) {
                        swappedIndexes = [index, secondIndex];
                    }
                }
            }
            observedItems = value.slice();
            observedArray = value;
            return observedItems;
        }
        let nextItems;
        let index = 0;
        stablePrefixLength = 0;
        removedIndex = -1;
        swappedIndexes = undefined;
        observedArray = undefined;
        for (const item of value) {
            if (nextItems) {
                nextItems.push(item);
            }
            else if (index >= observedItems.length ||
                !Object.is(observedItems[index], item)) {
                nextItems = observedItems.slice(0, index);
                nextItems.push(item);
            }
            index++;
        }
        if (nextItems) {
            observedItems = nextItems;
        }
        else if (index !== observedItems.length) {
            observedItems = observedItems.slice(0, index);
        }
        return observedItems;
    }, (value) => {
        const parent = anchor.parentNode;
        if (!parent)
            return;
        const items = value;
        const retainedLength = states.size;
        const indexToRemove = removedIndex;
        const indexesToSwap = swappedIndexes;
        removedIndex = -1;
        swappedIndexes = undefined;
        if (indexesToSwap && retainedLength === items.length) {
            const leftIndex = indexesToSwap[0];
            const rightIndex = indexesToSwap[1];
            let leftState;
            let rightState;
            for (const state of states.values()) {
                if (state._index === leftIndex)
                    leftState = state;
                else if (state._index === rightIndex)
                    rightState = state;
                if (leftState && rightState)
                    break;
            }
            const leftStart = leftState && firstKeyedStateNode(leftState);
            const rightEnd = rightState && lastKeyedStateNode(rightState);
            if (leftState && rightState && leftStart && rightEnd) {
                const afterRight = rightEnd.nextSibling;
                moveKeyedStateBefore(parent, rightState, leftStart);
                moveKeyedStateBefore(parent, leftState, afterRight);
                rightState._index = leftIndex;
                leftState._index = rightIndex;
                return;
            }
        }
        if (indexToRemove >= 0 && retainedLength === items.length + 1) {
            let removedState;
            for (const state of states.values()) {
                if (state._index === indexToRemove) {
                    removedState = state;
                }
                else if (state._index > indexToRemove) {
                    state._index--;
                }
            }
            if (removedState) {
                disposeLinkedChildren(removedState._children);
                states.delete(removedState._key);
                return;
            }
        }
        if (stablePrefixLength === 0 && retainedLength > 0 && items.length > 0) {
            const replacementKeys = new Array(items.length);
            const seenReplacementKeys = new Set();
            let isDisjointReplacement = true;
            for (let index = 0; index < items.length; index++) {
                const key = binding._key(items[index]);
                if (seenReplacementKeys.has(key)) {
                    throw new TypeError(`Duplicate programmatic view key '${String(key)}'.`);
                }
                if (states.has(key)) {
                    isDisjointReplacement = false;
                    break;
                }
                seenReplacementKeys.add(key);
                replacementKeys[index] = key;
            }
            if (isDisjointReplacement) {
                const replacements = new Array(items.length);
                for (let index = 0; index < items.length; index++) {
                    const item = items[index];
                    const holder = createScope({ value: item }, runtime._scope._handler);
                    replacements[index] = {
                        _holder: holder,
                        _nodes: materializeProgrammaticView(binding._render(() => holder.value)),
                    };
                }
                const removedChildren = new Array(retainedLength);
                let removedIndex = 0;
                for (const state of states.values()) {
                    removedChildren[removedIndex++] = state._children;
                }
                detachKeyedStateRange(states.values(), anchor);
                disposeLinkedChildrenGroups(removedChildren);
                states = new Map();
                for (let index = 0; index < items.length; index++) {
                    const item = items[index];
                    const key = replacementKeys[index];
                    const replacement = replacements[index];
                    const children = linkMaterializedChildren(replacement._nodes, parent, anchor, runtime);
                    states.set(key, {
                        _key: key,
                        _value: item,
                        _holder: replacement._holder,
                        _children: children,
                        _index: index,
                    });
                }
                return;
            }
        }
        if (stablePrefixLength === retainedLength &&
            items.length > retainedLength) {
            const appendedLength = items.length - retainedLength;
            const appendedKeys = new Array(appendedLength);
            const seenAppendedKeys = new Set();
            for (let index = retainedLength; index < items.length; index++) {
                const key = binding._key(items[index]);
                if (states.has(key) || seenAppendedKeys.has(key)) {
                    throw new TypeError(`Duplicate programmatic view key '${String(key)}'.`);
                }
                seenAppendedKeys.add(key);
                appendedKeys[index - retainedLength] = key;
            }
            for (let index = retainedLength; index < items.length; index++) {
                const item = items[index];
                const key = appendedKeys[index - retainedLength];
                const holder = createScope({ value: item }, runtime._scope._handler);
                const children = linkMaterializedChildren(materializeProgrammaticView(binding._render(() => holder.value)), parent, anchor, runtime);
                states.set(key, {
                    _key: key,
                    _value: item,
                    _holder: holder,
                    _children: children,
                    _index: index,
                });
            }
            return;
        }
        const plan = planKeyedReconciliation(items, states, binding._key, (state) => state._index, (item) => {
            const holder = createScope({ value: item }, runtime._scope._handler);
            return {
                _holder: holder,
                _nodes: materializeProgrammaticView(binding._render(() => holder.value)),
            };
        });
        const nextStates = new Map();
        const removedChildren = plan.removed.map((state) => state._children);
        if (plan.entries.length === 0) {
            detachKeyedStateRange(states.values(), anchor);
        }
        disposeLinkedChildrenGroups(removedChildren);
        for (let index = 0; index < plan.entries.length; index++) {
            const descriptor = plan.entries[index];
            let state;
            if (descriptor.kind === "reused") {
                state = descriptor.previous;
                if (!Object.is(state._value, descriptor.value)) {
                    state._holder.value = descriptor.value;
                }
            }
            else {
                state = {
                    _key: descriptor.key,
                    _value: descriptor.value,
                    _holder: descriptor.created._holder,
                    _children: linkMaterializedChildren(descriptor.created._nodes, parent, anchor, runtime),
                    _index: index,
                };
            }
            state._value = descriptor.value;
            state._index = index;
            nextStates.set(state._key, state);
        }
        states = nextStates;
        let lastPreviousIndex = -1;
        let sawNewState = false;
        let needsPlacement = false;
        for (let index = 0; index < plan.entries.length; index++) {
            const indexInPrevious = plan.entries[index].previousIndex;
            if (indexInPrevious < 0) {
                sawNewState = true;
            }
            else {
                if (indexInPrevious < lastPreviousIndex || sawNewState) {
                    needsPlacement = true;
                }
                lastPreviousIndex = indexInPrevious;
            }
        }
        if (!needsPlacement)
            return;
        let cursor = anchor;
        const orderedStates = Array.from(states.values());
        const stableIndexes = plan.stable;
        for (let stateIndex = orderedStates.length - 1; stateIndex >= 0; stateIndex--) {
            const children = orderedStates[stateIndex]._children;
            const move = stableIndexes[stateIndex] === 0;
            for (let childIndex = children.length - 1; childIndex >= 0; childIndex--) {
                const nodes = children[childIndex]._nodes;
                for (let nodeIndex = nodes.length - 1; nodeIndex >= 0; nodeIndex--) {
                    const node = nodes[nodeIndex];
                    if (move && node.nextSibling !== cursor) {
                        parent.insertBefore(node, cursor);
                    }
                    cursor = node;
                }
            }
        }
    }, false);
    return () => {
        stop();
        disposeLinkedChildrenGroups(Array.from(states.values(), (state) => state._children));
        states.clear();
    };
}
function activateNodeBindings(node, runtime, disposers) {
    const bindings = pendingBindings.get(node);
    if (bindings) {
        pendingBindings.delete(node);
        const multipleBindings = isArray(bindings);
        const bindingCount = multipleBindings ? bindings.length : 1;
        for (let index = 0; index < bindingCount; index++) {
            const binding = multipleBindings ? bindings[index] : bindings;
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
                }, false));
            }
            else if (binding._kind === "child") {
                disposers.push(activateChildBinding(node, binding._read, runtime));
            }
            else {
                disposers.push(activateKeyedChildBinding(node, binding._binding, runtime));
            }
        }
    }
    const childNodes = node.childNodes;
    if (childNodes.length === 0)
        return;
    if (childNodes.length === 1) {
        activateNodeBindings(childNodes[0], runtime, disposers);
        return;
    }
    const snapshot = Array.from(childNodes);
    for (let index = 0; index < snapshot.length; index++) {
        activateNodeBindings(snapshot[index], runtime, disposers);
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
                host: element,
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
            const rawNodes = materializeProgrammaticView(value);
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
                        const linkOptions = {
                            _futureParentElement: parent,
                            _ownsNodes: true,
                        };
                        const directlyLinked = $compile._linkProgrammaticNode
                            ? $compile._linkProgrammaticNode(node, scope, linkOptions)
                            : $compile(node)(scope, undefined, linkOptions);
                        if (directlyLinked === null)
                            return [node];
                        return normalizeLinkResult(directlyLinked);
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

export { PROGRAMMATIC_VIEW_MARKER, PROGRAMMATIC_VIEW_TEMPLATE, a, abbr, acronym, address, applet, area, article, aside, attrs, audio, b, base, basefont, bdi, bdo, bgsound, big, blink, blockquote, body, br, button, canvas, caption, center, cite, code, col, colgroup, createProgrammaticComponentCompile, createProgrammaticDirectiveCompile, data, datalist, dd, del, details, dfn, dialog, dir, div, dl, dt, each, em, embed, event, fieldset, figcaption, figure, font, footer, form, frame, frameset, h1, h2, h3, h4, h5, h6, head, header, hgroup, hr, html, i, iframe, img, input, ins, isindex, kbd, keygen, label, legend, li, link, listing, main, map, mark, marquee, materializeProgrammaticView, menu, menuitem, meta, meter, multicol, nav, nextid, nobr, noembed, noframes, noscript, object, ol, optgroup, option, output, p, param, picture, plaintext, pre, progress, props, q, rb, rp, rt, rtc, ruby, s, samp, sanitizeProgrammaticSrcset, script, search, section, select, slot, small, source, spacer, span, strike, strong, style, sub, summary, sup, table, tag, tagNS, tags, tbody, td, template, textarea, tfoot, th, thead, time, title, tr, track, tt, u, ul, varTag, video, wbr, xmp };
