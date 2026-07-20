import { _scope } from '../../injection-tokens.js';
import { setScope, dealoc, getInheritedData } from '../../shared/dom.js';
import { kebobString } from '../../shared/strings.js';
import { isFunction, isInstanceOf, hasOwn, deleteProperty, isObject, isArray, uppercase, isNumber, isString, stringify } from '../../shared/utils.js';

/** Native custom element base class backed by an AngularTS child scope. */
/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
class ScopeElement extends HTMLElement {
    static get observedAttributes() {
        return getScopeElementInputs(this).map((input) => input.attribute);
    }
    connectedCallback() {
        queueScopeElementConnect(this);
    }
    disconnectedCallback() {
        queueScopeElementDisconnect(this);
    }
    attributeChangedCallback(attribute, oldValue, newValue) {
        syncScopeElementAttribute(this, attribute, oldValue, newValue);
    }
    /** Dispatch a composed bubbling DOM event from this custom element. */
    dispatch(type, detail, init = {}) {
        return this.dispatchEvent(new CustomEvent(type, {
            bubbles: true,
            composed: true,
            ...init,
            detail,
        }));
    }
}
const pendingValueStore = new WeakMap();
const scopeElementDefinitions = new WeakMap();
const scopeElementInputs = new WeakMap();
const scopeElementScopes = new WeakMap();
const scopeElementContexts = new WeakMap();
const scopeElementDestroyTimers = new WeakMap();
const scopeElementCleanupFns = new WeakMap();
const queuedScopeElementConnects = new WeakSet();
const scopeElementReflectingAttributes = new WeakMap();
/** @internal */
function createWebComponentRuntimeState() {
    return {
        defaults: {},
        definitions: new Set(),
        hosts: new Set(),
        scopes: new Set(),
        destroyed: false,
    };
}
/** @internal */
function applyWebComponentConfiguration(state, config) {
    if (config.defaults !== undefined) {
        state.defaults = {
            ...state.defaults,
            ...config.defaults,
        };
    }
}
/** @internal */
function destroyWebComponentRuntimeState(state) {
    if (state.destroyed)
        return;
    state.destroyed = true;
    for (const host of Array.from(state.hosts)) {
        const timer = scopeElementDestroyTimers.get(host);
        if (timer) {
            clearTimeout(timer);
            scopeElementDestroyTimers.delete(host);
        }
        disconnectScopeElement(host);
    }
    for (const scope of Array.from(state.scopes)) {
        if (!scope.$handler._destroyed)
            scope.$destroy();
    }
    for (const definition of state.definitions) {
        scopeElementDefinitions.delete(definition);
        scopeElementInputs.delete(definition);
    }
    state.definitions.clear();
    state.hosts.clear();
    state.scopes.clear();
}
/** @internal */
function createWebComponentService(injector, rootScope, compile, state) {
    const assertActive = () => {
        if (state.destroyed) {
            throw new Error("Cannot use $webComponent after runtime teardown");
        }
    };
    const createElementScope = (host, initialState = {}, options = {}) => {
        assertActive();
        const parentScope = (options.parentScope ??
            getInheritedData(host, _scope) ??
            getInheritedData(host.parentNode ?? host, _scope) ??
            rootScope);
        const scope = options.isolate
            ? parentScope.$newIsolate(initialState)
            : parentScope.$new(initialState);
        state.scopes.add(scope);
        scope.$on("$destroy", () => {
            state.scopes.delete(scope);
        });
        setScope(host, scope);
        return scope;
    };
    return {
        createElementScope,
        defineAppComponent: (name, options) => {
            assertActive();
            const mergedOptions = {
                ...state.defaults,
                ...options,
            };
            return defineAppComponent(name, mergedOptions, injector, compile, createElementScope, state);
        },
        defineElement: (name, elementClass) => {
            assertActive();
            return defineScopeElement(name, elementClass, resolveScopeElementOptions(elementClass), injector, compile, createElementScope, state);
        },
    };
}
function defineAppComponent(name, options, injector, compile, createElementScope, state) {
    class AngularTsAppComponent extends ScopeElement {
        connected() {
            const context = getScopeElementContext(this);
            return options.connected?.(context);
        }
        disconnected() {
            const context = getScopeElementContext(this);
            if (context)
                options.disconnected?.(context);
        }
        attributeChanged(name, oldValue, newValue) {
            const context = getScopeElementContext(this);
            if (context)
                options.attributeChanged?.(name, oldValue, newValue, context);
        }
    }
    AngularTsAppComponent.template = options.template;
    AngularTsAppComponent.shadow = options.shadow;
    AngularTsAppComponent.scope = options.scope;
    AngularTsAppComponent.inputs = options.inputs;
    AngularTsAppComponent.isolate = options.isolate;
    Object.defineProperty(AngularTsAppComponent, "name", {
        value: customElementClassName(name),
    });
    return defineScopeElement(name, AngularTsAppComponent, options, injector, compile, createElementScope, state);
}
function defineScopeElement(name, elementClass, options, injector, compile, createElementScope, state) {
    const existing = customElements.get(name);
    if (existing)
        return existing;
    const inputs = normalizeInputs(options.inputs);
    scopeElementDefinitions.set(elementClass, {
        compile,
        createElementScope,
        injector,
        inputs,
        options: options,
        state,
    });
    scopeElementInputs.set(elementClass, inputs);
    state.definitions.add(elementClass);
    installScopeElementInputs(elementClass, inputs);
    customElements.define(name, elementClass);
    return elementClass;
}
function resolveScopeElementOptions(elementClass) {
    return {
        inputs: elementClass.inputs,
        isolate: elementClass.isolate,
        scope: elementClass.scope,
        shadow: elementClass.shadow,
        template: elementClass.template,
    };
}
function getScopeElementInputs(elementClass) {
    return (scopeElementInputs.get(elementClass) ?? normalizeInputs(elementClass.inputs));
}
function installScopeElementInputs(elementClass, inputs) {
    inputs.forEach((input) => {
        if (hasOwn(elementClass.prototype, input.property)) {
            return;
        }
        Object.defineProperty(elementClass.prototype, input.property, {
            configurable: true,
            enumerable: true,
            get() {
                const scope = scopeElementScopes.get(this);
                if (scope)
                    return scope[input.property];
                return getPendingValues(this)[input.property];
            },
            set(value) {
                const nextValue = coercePropertyValue(input, value);
                writeInput(this, input, nextValue, scopeElementScopes.get(this));
                if (input.reflect) {
                    reflectInput(this, input, nextValue, scopeElementReflectingAttributes);
                }
            },
        });
    });
}
function queueScopeElementConnect(host) {
    const destroyTimer = scopeElementDestroyTimers.get(host);
    if (destroyTimer) {
        clearTimeout(destroyTimer);
        scopeElementDestroyTimers.delete(host);
    }
    if (queuedScopeElementConnects.has(host))
        return;
    queuedScopeElementConnects.add(host);
    queueMicrotask(() => {
        queuedScopeElementConnects.delete(host);
        if (!host.isConnected)
            return;
        connectScopeElement(host);
    });
}
function queueScopeElementDisconnect(host) {
    const timer = setTimeout(() => {
        scopeElementDestroyTimers.delete(host);
        if (host.isConnected)
            return;
        disconnectScopeElement(host);
    }, 0);
    scopeElementDestroyTimers.set(host, timer);
}
function syncScopeElementAttribute(host, attribute, oldValue, newValue) {
    if (oldValue === newValue)
        return;
    const reflected = scopeElementReflectingAttributes.get(host);
    if (reflected?.has(attribute))
        return;
    const definition = getScopeElementDefinition(host);
    if (!definition)
        return;
    const input = definition.inputs.find((candidate) => candidate.attribute === attribute);
    if (!input)
        return;
    writeInput(host, input, coerceAttributeValue(input, newValue), scopeElementScopes.get(host));
    host.attributeChanged?.(attribute, oldValue, newValue);
}
function connectScopeElement(host) {
    const existingScope = scopeElementScopes.get(host);
    if (existingScope && !existingScope.$handler._destroyed)
        return;
    const definition = getScopeElementDefinition(host);
    if (!definition)
        return;
    const options = definition.options;
    const renderRoot = resolveRenderRoot(host, options.shadow);
    const initialState = resolveInitialState(options.scope);
    const scope = definition.createElementScope(host, initialState, {
        isolate: options.isolate,
    });
    const element = host;
    const context = createContext(host, scope, definition.injector, renderRoot);
    element.scope = scope;
    element.injector = definition.injector;
    element.root = renderRoot;
    scopeElementScopes.set(host, scope);
    scopeElementContexts.set(host, context);
    definition.state.hosts.add(host);
    applyInputDefaults(host, definition.inputs);
    upgradeOwnProperties(host, definition.inputs);
    applyAttributes(host, definition.inputs, scope);
    applyPendingValues(host, definition.inputs, scope);
    renderTemplate(renderRoot, host, scope, options.template, definition.compile);
    const cleanup = element.connected?.();
    if (isFunction(cleanup)) {
        scopeElementCleanupFns.set(host, cleanup);
    }
}
function disconnectScopeElement(host) {
    const scope = scopeElementScopes.get(host);
    if (!scope)
        return;
    const cleanup = scopeElementCleanupFns.get(host);
    cleanup?.();
    scopeElementCleanupFns.delete(host);
    const definition = getScopeElementDefinition(host);
    const context = scopeElementContexts.get(host);
    const element = host;
    element.disconnected?.();
    if (!scope.$handler._destroyed) {
        scope.$destroy();
    }
    scopeElementScopes.delete(host);
    scopeElementContexts.delete(host);
    definition?.state.hosts.delete(host);
    if (context)
        clearRenderedContent(context.root);
}
function getScopeElementDefinition(host) {
    return scopeElementDefinitions.get(host.constructor);
}
function getScopeElementContext(host) {
    return scopeElementContexts.get(host);
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
            attribute: config.attribute ?? kebobString(property),
            default: config.default,
            property,
            reflect: !!config.reflect,
            type: config.type ?? String,
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
        shadowRoot: isInstanceOf(root, ShadowRoot) ? root : undefined,
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
        if (!hasOwn(host, input.property))
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
    setScope(root, scope);
    const linked = compile(template)(scope, undefined, {
        _futureParentElement: host,
    });
    appendLinkedNodes(root, linked);
}
function appendLinkedNodes(root, linked) {
    if (!linked)
        return;
    if (isArray(linked)) {
        linked.forEach((node) => {
            root.appendChild(node);
        });
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

export { ScopeElement, applyWebComponentConfiguration, createWebComponentRuntimeState, createWebComponentService, destroyWebComponentRuntimeState };
