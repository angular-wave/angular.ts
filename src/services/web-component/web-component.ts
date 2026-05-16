import {
  _compile,
  _injector,
  _rootScope,
  _scope,
} from "../../injection-tokens.ts";
import { dealoc, getInheritedData, setScope } from "../../shared/dom.ts";
import { kebobString } from "../../shared/strings.ts";
import {
  deleteProperty,
  isFunction,
  isNumber,
  isObject,
  isString,
  stringify,
  uppercase,
} from "../../shared/utils.ts";

type WebComponentInputType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ((value: unknown) => unknown);

export interface WebComponentInputConfig {
  /** Attribute name. Defaults to the kebab-case property name. */
  attribute?: string;
  /** Attribute/property coercion function. Defaults to `String`. */
  type?: WebComponentInputType;
  /** Reflect property writes back to the DOM attribute. */
  reflect?: boolean;
  /** Initial value used when no attribute or property was provided. */
  default?: unknown;
}

export type WebComponentInput = WebComponentInputType | WebComponentInputConfig;

export type WebComponentInputs = Record<string, WebComponentInput>;

export interface WebComponentContext<T extends object = Record<string, any>> {
  /** Custom element host. */
  host: HTMLElement;
  /** Scope owned by the custom element. */
  scope: ng.Scope & T;
  /** Injector used by the AngularTS app that registered the element. */
  injector: ng.InjectorService;
  /** Render root used for template content. */
  root: HTMLElement | ShadowRoot;
  /** Shadow root when `shadow` is enabled. */
  shadowRoot?: ShadowRoot;
  /** Dispatch a composed bubbling DOM event from the host. */
  dispatch(type: string, detail?: unknown, init?: CustomEventInit): boolean;
}

export interface WebComponentOptions<T extends object = Record<string, any>> {
  /** Template compiled into the host or shadow root. */
  template?: string;
  /** Enables shadow DOM, or passes ShadowRootInit options. */
  shadow?: boolean | ShadowRootInit;
  /** Initial scope state, or a factory returning it. */
  scope?: T | (() => T);
  /** Declared DOM attributes/properties that sync into the scope. */
  inputs?: WebComponentInputs;
  /** Use an isolate child scope instead of inheriting parent properties. */
  isolate?: boolean;
  /** Called after the scope exists and the template has been linked. */
  connected?: (context: WebComponentContext<T>) => undefined | (() => void);
  /** Called before the scope is destroyed. */
  disconnected?: (context: WebComponentContext<T>) => void;
  /** Called after an observed input attribute changes. */
  attributeChanged?: (
    name: string,
    oldValue: string | null,
    newValue: string | null,
    context: WebComponentContext<T>,
  ) => void;
}

export interface ElementScopeOptions {
  /** Explicit parent scope. Defaults to nearest inherited DOM scope. */
  parentScope?: ng.Scope;
  /** Use an isolate child scope. */
  isolate?: boolean;
}

export interface WebComponentService {
  /** Define a scoped custom element. */
  define<T extends object = Record<string, any>>(
    name: string,
    options: WebComponentOptions<T>,
  ): CustomElementConstructor;
  /** Create and attach a normal AngularTS child scope for a custom element. */
  createElementScope<T extends object = Record<string, any>>(
    host: HTMLElement,
    initialState?: T,
    options?: ElementScopeOptions,
  ): ng.Scope & T;
}

interface InputDefinition {
  attribute: string;
  default?: unknown;
  property: string;
  reflect: boolean;
  type: WebComponentInputType;
}

type PendingValues = Record<string, unknown>;

const pendingValueStore = new WeakMap<HTMLElement, PendingValues>();

/** Provider for scoped custom element integration. */
export class WebComponentProvider {
  /** Default options merged into every custom element definition. */
  defaults: Partial<WebComponentOptions> = {};

  $get = [
    _injector,
    _rootScope,
    _compile,
    (
      injector: ng.InjectorService,
      rootScope: ng.Scope,
      compile: ng.CompileService,
    ): WebComponentService => {
      const createElementScope = <T extends object = Record<string, any>>(
        host: HTMLElement,
        initialState: T = {} as T,
        options: ElementScopeOptions = {},
      ): ng.Scope & T => {
        const parentScope = (options.parentScope ||
          getInheritedData(host, _scope) ||
          getInheritedData(host.parentNode || host, _scope) ||
          rootScope) as ng.Scope;

        const scope = options.isolate
          ? parentScope.$newIsolate(initialState as ng.Scope)
          : parentScope.$new(initialState as ng.Scope);

        setScope(host, scope);

        return scope as ng.Scope & T;
      };

      return {
        createElementScope,
        define: <T extends object = Record<string, any>>(
          name: string,
          options: WebComponentOptions<T>,
        ) => {
          const existing = customElements.get(name);

          if (existing) return existing;

          const mergedOptions = {
            ...this.defaults,
            ...options,
          } as WebComponentOptions<T>;

          const inputs = normalizeInputs(mergedOptions.inputs);

          const elementClass = createWebComponentClass(
            name,
            inputs,
            mergedOptions,
            injector,
            compile,
            createElementScope,
          );

          customElements.define(name, elementClass);

          return elementClass;
        },
      };
    },
  ];
}

function createWebComponentClass<T extends object>(
  name: string,
  inputs: InputDefinition[],
  options: WebComponentOptions<T>,
  injector: ng.InjectorService,
  compile: ng.CompileService,
  createElementScope: WebComponentService["createElementScope"],
): CustomElementConstructor {
  const attributes = inputs.map((input) => input.attribute);

  const scopes = new WeakMap<HTMLElement, ng.Scope & T>();

  const contexts = new WeakMap<HTMLElement, WebComponentContext<T>>();

  const destroyTimers = new WeakMap<
    HTMLElement,
    ReturnType<typeof setTimeout>
  >();

  const cleanupFns = new WeakMap<HTMLElement, () => void>();

  const queuedConnects = new WeakSet<HTMLElement>();

  const reflectingAttributes = new WeakMap<HTMLElement, Set<string>>();

  class AngularTsWebComponent extends HTMLElement {
    static get observedAttributes(): string[] {
      return attributes;
    }

    connectedCallback(): void {
      const destroyTimer = destroyTimers.get(this);

      if (destroyTimer) {
        clearTimeout(destroyTimer);
        destroyTimers.delete(this);
      }

      if (queuedConnects.has(this)) return;

      queuedConnects.add(this);
      queueMicrotask(() => {
        queuedConnects.delete(this);

        if (!this.isConnected) return;
        connectHost(this);
      });
    }

    disconnectedCallback(): void {
      const timer = setTimeout(() => {
        destroyTimers.delete(this);

        if (this.isConnected) return;
        disconnectHost(this);
      }, 0);

      destroyTimers.set(this, timer);
    }

    attributeChangedCallback(
      attribute: string,
      oldValue: string | null,
      newValue: string | null,
    ): void {
      if (oldValue === newValue) return;

      const reflected = reflectingAttributes.get(this);

      if (reflected?.has(attribute)) return;

      const input = inputs.find(
        (candidate) => candidate.attribute === attribute,
      );

      if (!input) return;

      writeInput(
        this,
        input,
        coerceAttributeValue(input, newValue),
        scopes.get(this),
      );

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
      get(this: HTMLElement) {
        const scope = scopes.get(this);

        if (scope) return (scope as Record<string, unknown>)[input.property];

        return getPendingValues(this)[input.property];
      },
      set(this: HTMLElement, value: unknown) {
        const nextValue = coercePropertyValue(input, value);

        writeInput(this, input, nextValue, scopes.get(this));

        if (input.reflect) {
          reflectInput(this, input, nextValue, reflectingAttributes);
        }
      },
    });
  });

  function connectHost(host: HTMLElement): void {
    const existingScope = scopes.get(host);

    if (existingScope && !existingScope.$handler._destroyed) return;

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
  }

  function disconnectHost(host: HTMLElement): void {
    const context = contexts.get(host);

    const scope = scopes.get(host);

    if (!scope) return;

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

function normalizeInputs(inputs: WebComponentInputs = {}): InputDefinition[] {
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

function resolveInitialState<T extends object>(
  state: T | (() => T) | undefined,
): T {
  if (!state) return {} as T;

  return isFunction(state) ? state() : { ...state };
}

function resolveRenderRoot(
  host: HTMLElement,
  shadow: WebComponentOptions["shadow"],
): HTMLElement | ShadowRoot {
  if (!shadow) return host;

  if (host.shadowRoot) return host.shadowRoot;

  const init = isObject(shadow) ? shadow : ({ mode: "open" } as ShadowRootInit);

  return host.attachShadow(init);
}

function createContext<T extends object>(
  host: HTMLElement,
  scope: ng.Scope & T,
  injector: ng.InjectorService,
  root: HTMLElement | ShadowRoot,
): WebComponentContext<T> {
  return {
    host,
    injector,
    root,
    scope,
    shadowRoot: root instanceof ShadowRoot ? root : undefined,
    dispatch(type: string, detail?: unknown, init: CustomEventInit = {}) {
      return host.dispatchEvent(
        new CustomEvent(type, {
          bubbles: true,
          composed: true,
          ...init,
          detail,
        }),
      );
    },
  };
}

function applyInputDefaults(
  host: HTMLElement,
  inputs: InputDefinition[],
): void {
  inputs.forEach((input) => {
    if (!("default" in input)) return;

    if (host.hasAttribute(input.attribute)) return;

    const pending = getPendingValues(host);

    if (input.property in pending) return;

    pending[input.property] = input.default;
  });
}

function upgradeOwnProperties(
  host: HTMLElement,
  inputs: InputDefinition[],
): void {
  inputs.forEach((input) => {
    if (!Object.prototype.hasOwnProperty.call(host, input.property)) return;

    const hostRecord = host as unknown as Record<string, unknown>;

    const value = hostRecord[input.property];

    deleteProperty(hostRecord, input.property);
    hostRecord[input.property] = value;
  });
}

function applyAttributes(
  host: HTMLElement,
  inputs: InputDefinition[],
  scope: ng.Scope,
): void {
  inputs.forEach((input) => {
    if (!host.hasAttribute(input.attribute)) return;

    writeInput(
      host,
      input,
      coerceAttributeValue(input, host.getAttribute(input.attribute)),
      scope,
    );
  });
}

function applyPendingValues(
  host: HTMLElement,
  inputs: InputDefinition[],
  scope: ng.Scope,
): void {
  const pending = getPendingValues(host);

  inputs.forEach((input) => {
    if (!(input.property in pending)) return;

    (scope as Record<string, unknown>)[input.property] =
      pending[input.property];
  });
}

function writeInput(
  host: HTMLElement,
  input: InputDefinition,
  value: unknown,
  scope?: ng.Scope,
): void {
  if (scope) {
    scope[input.property] = value;

    return;
  }

  getPendingValues(host)[input.property] = value;
}

function getPendingValues(host: HTMLElement): PendingValues {
  let pending = pendingValueStore.get(host);

  if (!pending) {
    pending = {};
    pendingValueStore.set(host, pending);
  }

  return pending;
}

function reflectInput(
  host: HTMLElement,
  input: InputDefinition,
  value: unknown,
  reflectingAttributes: WeakMap<HTMLElement, Set<string>>,
): void {
  let reflected = reflectingAttributes.get(host);

  if (!reflected) {
    reflected = new Set();
    reflectingAttributes.set(host, reflected);
  }

  reflected.add(input.attribute);

  try {
    if (input.type === Boolean) {
      host.toggleAttribute(input.attribute, !!value);
    } else if (value === null || value === undefined) {
      host.removeAttribute(input.attribute);
    } else {
      host.setAttribute(input.attribute, stringify(value));
    }
  } finally {
    reflected.delete(input.attribute);
  }
}

function coerceAttributeValue(
  input: InputDefinition,
  value: string | null,
): unknown {
  if (input.type === Boolean) return value !== null;

  if (input.type === Number) return value === null ? undefined : Number(value);

  if (input.type === String) return value ?? "";

  return input.type(value);
}

function coercePropertyValue(input: InputDefinition, value: unknown): unknown {
  if (input.type === Boolean) return !!value;

  if (input.type === Number) {
    if (value === null || value === undefined || value === "") return undefined;

    if (isNumber(value)) return value;

    return Number(value);
  }

  if (input.type === String) {
    if (value === null || value === undefined) return "";

    if (isString(value)) return value;

    return stringify(value);
  }

  return input.type(value);
}

function renderTemplate(
  root: HTMLElement | ShadowRoot,
  host: HTMLElement,
  scope: ng.Scope,
  template: string | undefined,
  compile: ng.CompileService,
): void {
  if (!template) return;

  clearRenderedContent(root);

  const linked = compile(template)(scope, undefined, {
    _futureParentElement: host,
  });

  appendLinkedNodes(root, linked);
}

function appendLinkedNodes(
  root: HTMLElement | ShadowRoot,
  linked: Element | Node | ChildNode | Node[] | null | undefined,
): void {
  if (!linked) return;

  if (Array.isArray(linked)) {
    linked.forEach((node) => root.appendChild(node));

    return;
  }

  root.appendChild(linked);
}

function clearRenderedContent(root: HTMLElement | ShadowRoot): void {
  dealoc(root.children as HTMLCollectionOf<Element>);
  root.replaceChildren();
}

function customElementClassName(name: string): string {
  return name
    .split("-")
    .map((part) => uppercase(part.charAt(0)) + part.slice(1))
    .join("");
}
