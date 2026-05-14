import { _injector, _rootScope, _compile, _scope } from '../../injection-tokens.js';
import { getInheritedData, setScope, dealoc } from '../../shared/dom.js';
import { kebobString } from '../../shared/strings.js';
import { isFunction, isNumber, isString, stringify, uppercase, deleteProperty, isObject } from '../../shared/utils.js';

const pendingValueStore = new WeakMap();
/** Provider for scoped custom element integration. */
class WebComponentProvider {
    constructor() {
        /** Default options merged into every custom element definition. */
        this.defaults = {};
        this.$get = [
            _injector,
            _rootScope,
            _compile,
            (injector, rootScope, compile) => {
                const createElementScope = (host, initialState = {}, options = {}) => {
                    const parentScope = (options.parentScope ||
                        getInheritedData(host, _scope) ||
                        getInheritedData(host.parentNode || host, _scope) ||
                        rootScope);
                    const scope = options.isolate
                        ? parentScope.$newIsolate(initialState)
                        : parentScope.$new(initialState);
                    setScope(host, scope);
                    return scope;
                };
                return {
                    createElementScope,
                    define: (name, options) => {
                        const existing = customElements.get(name);
                        if (existing)
                            return existing;
                        const mergedOptions = {
                            ...this.defaults,
                            ...options,
                        };
                        const inputs = normalizeInputs(mergedOptions.inputs);
                        const elementClass = createWebComponentClass(name, inputs, mergedOptions, injector, compile, createElementScope);
                        customElements.define(name, elementClass);
                        return elementClass;
                    },
                };
            },
        ];
    }
}
function createWebComponentClass(name, inputs, options, injector, compile, createElementScope) {
    const attributes = inputs.map((input) => input.attribute);
    const scopes = new WeakMap();
    const contexts = new WeakMap();
    const destroyTimers = new WeakMap();
    const cleanupFns = new WeakMap();
    const queuedConnects = new WeakSet();
    const reflectingAttributes = new WeakMap();
    class AngularTsWebComponent extends HTMLElement {
        static get observedAttributes() {
            return attributes;
        }
        connectedCallback() {
            const destroyTimer = destroyTimers.get(this);
            if (destroyTimer) {
                clearTimeout(destroyTimer);
                destroyTimers.delete(this);
            }
            if (queuedConnects.has(this))
                return;
            queuedConnects.add(this);
            queueMicrotask(() => {
                queuedConnects.delete(this);
                if (!this.isConnected)
                    return;
                connectHost(this);
            });
        }
        disconnectedCallback() {
            const timer = setTimeout(() => {
                destroyTimers.delete(this);
                if (this.isConnected)
                    return;
                disconnectHost(this);
            }, 0);
            destroyTimers.set(this, timer);
        }
        attributeChangedCallback(attribute, oldValue, newValue) {
            if (oldValue === newValue)
                return;
            const reflected = reflectingAttributes.get(this);
            if (reflected?.has(attribute))
                return;
            const input = inputs.find((candidate) => candidate.attribute === attribute);
            if (!input)
                return;
            writeInput(this, input, coerceAttributeValue(input, newValue), scopes.get(this));
            const context = contexts.get(this);
            if (context) {
                options.attributeChanged?.(attribute, oldValue, newValue, context);
            }
        }
    }
    inputs.forEach((input) => {
        Object.defineProperty(AngularTsWebComponent.prototype, input.property, {
            configurable: true,
            enumerable: true,
            get() {
                const scope = scopes.get(this);
                if (scope)
                    return scope[input.property];
                return getPendingValues(this)[input.property];
            },
            set(value) {
                const nextValue = coercePropertyValue(input, value);
                writeInput(this, input, nextValue, scopes.get(this));
                if (input.reflect) {
                    reflectInput(this, input, nextValue, reflectingAttributes);
                }
            },
        });
    });
    function connectHost(host) {
        const existingScope = scopes.get(host);
        if (existingScope && !existingScope.$handler._destroyed)
            return;
        const renderRoot = resolveRenderRoot(host, options.shadow);
        const initialState = resolveInitialState(options.scope);
        const scope = createElementScope(host, initialState, {
            isolate: options.isolate,
        });
        const context = createContext(host, scope, injector, renderRoot);
        scopes.set(host, scope);
        contexts.set(host, context);
        applyInputDefaults(host, inputs);
        upgradeOwnProperties(host, inputs);
        applyAttributes(host, inputs, scope);
        applyPendingValues(host, inputs, scope);
        renderTemplate(renderRoot, host, scope, options.template, compile);
        const cleanup = options.connected?.(context);
        if (isFunction(cleanup)) {
            cleanupFns.set(host, cleanup);
        }
        if (isFunction(scope.$flushQueue)) {
            scope.$flushQueue();
        }
    }
    function disconnectHost(host) {
        const context = contexts.get(host);
        const scope = scopes.get(host);
        if (!scope)
            return;
        const cleanup = cleanupFns.get(host);
        cleanup?.();
        cleanupFns.delete(host);
        if (context) {
            options.disconnected?.(context);
        }
        if (!scope.$handler._destroyed) {
            scope.$destroy();
        }
        scopes.delete(host);
        contexts.delete(host);
        clearRenderedContent(resolveRenderRoot(host, options.shadow));
    }
    Object.defineProperty(AngularTsWebComponent, "name", {
        value: customElementClassName(name),
    });
    return AngularTsWebComponent;
}
function normalizeInputs(inputs = {}) {
    return Object.keys(inputs).map((property) => {
        const input = inputs[property];
        if (isFunction(input)) {
            return {
                attribute: kebobString(property),
                property,
                reflect: false,
                type: input,
            };
        }
        const config = input;
        return {
            attribute: config.attribute || kebobString(property),
            default: config.default,
            property,
            reflect: !!config.reflect,
            type: config.type || String,
        };
    });
}
function resolveInitialState(state) {
    if (!state)
        return {};
    return isFunction(state) ? state() : { ...state };
}
function resolveRenderRoot(host, shadow) {
    if (!shadow)
        return host;
    if (host.shadowRoot)
        return host.shadowRoot;
    const init = isObject(shadow) ? shadow : { mode: "open" };
    return host.attachShadow(init);
}
function createContext(host, scope, injector, root) {
    return {
        host,
        injector,
        root,
        scope,
        shadowRoot: root instanceof ShadowRoot ? root : undefined,
        dispatch(type, detail, init = {}) {
            return host.dispatchEvent(new CustomEvent(type, {
                bubbles: true,
                composed: true,
                ...init,
                detail,
            }));
        },
    };
}
function applyInputDefaults(host, inputs) {
    inputs.forEach((input) => {
        if (!("default" in input))
            return;
        if (host.hasAttribute(input.attribute))
            return;
        const pending = getPendingValues(host);
        if (input.property in pending)
            return;
        pending[input.property] = input.default;
    });
}
function upgradeOwnProperties(host, inputs) {
    inputs.forEach((input) => {
        if (!Object.prototype.hasOwnProperty.call(host, input.property))
            return;
        const hostRecord = host;
        const value = hostRecord[input.property];
        deleteProperty(hostRecord, input.property);
        hostRecord[input.property] = value;
    });
}
function applyAttributes(host, inputs, scope) {
    inputs.forEach((input) => {
        if (!host.hasAttribute(input.attribute))
            return;
        writeInput(host, input, coerceAttributeValue(input, host.getAttribute(input.attribute)), scope);
    });
}
function applyPendingValues(host, inputs, scope) {
    const pending = getPendingValues(host);
    inputs.forEach((input) => {
        if (!(input.property in pending))
            return;
        scope[input.property] =
            pending[input.property];
    });
}
function writeInput(host, input, value, scope) {
    if (scope) {
        scope[input.property] = value;
        if (isFunction(scope.$flushQueue)) {
            scope.$flushQueue();
        }
        return;
    }
    getPendingValues(host)[input.property] = value;
}
function getPendingValues(host) {
    let pending = pendingValueStore.get(host);
    if (!pending) {
        pending = {};
        pendingValueStore.set(host, pending);
    }
    return pending;
}
function reflectInput(host, input, value, reflectingAttributes) {
    let reflected = reflectingAttributes.get(host);
    if (!reflected) {
        reflected = new Set();
        reflectingAttributes.set(host, reflected);
    }
    reflected.add(input.attribute);
    try {
        if (input.type === Boolean) {
            host.toggleAttribute(input.attribute, !!value);
        }
        else if (value === null || value === undefined) {
            host.removeAttribute(input.attribute);
        }
        else {
            host.setAttribute(input.attribute, stringify(value));
        }
    }
    finally {
        reflected.delete(input.attribute);
    }
}
function coerceAttributeValue(input, value) {
    if (input.type === Boolean)
        return value !== null;
    if (input.type === Number)
        return value === null ? undefined : Number(value);
    if (input.type === String)
        return value ?? "";
    return input.type(value);
}
function coercePropertyValue(input, value) {
    if (input.type === Boolean)
        return !!value;
    if (input.type === Number) {
        if (value === null || value === undefined || value === "")
            return undefined;
        if (isNumber(value))
            return value;
        return Number(value);
    }
    if (input.type === String) {
        if (value === null || value === undefined)
            return "";
        if (isString(value))
            return value;
        return stringify(value);
    }
    return input.type(value);
}
function renderTemplate(root, host, scope, template, compile) {
    if (!template)
        return;
    clearRenderedContent(root);
    const linked = compile(template)(scope, undefined, {
        _futureParentElement: host,
    });
    appendLinkedNodes(root, linked);
}
function appendLinkedNodes(root, linked) {
    if (!linked)
        return;
    if (Array.isArray(linked)) {
        linked.forEach((node) => root.appendChild(node));
        return;
    }
    root.appendChild(linked);
}
function clearRenderedContent(root) {
    dealoc(root.children);
    root.replaceChildren();
}
function customElementClassName(name) {
    return name
        .split("-")
        .map((part) => uppercase(part.charAt(0)) + part.slice(1))
        .join("");
}

export { WebComponentProvider };
