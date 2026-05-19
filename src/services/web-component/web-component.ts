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

export interface WebComponentContext<
  T extends object = Record<string, unknown>,
> {
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

export interface AppComponentOptions<
  T extends object = Record<string, unknown>,
> {
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

export interface ScopeElementConstructor<
  T extends object = Record<string, unknown>,
> {
  new (): ScopeElement<T>;
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
}

/** Native custom element base class backed by an AngularTS child scope. */
/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
export abstract class ScopeElement<
  T extends object = Record<string, unknown>,
> extends HTMLElement {
  /** Scope owned by this custom element instance. */
  scope!: ng.Scope & T;
  /** Injector used by the AngularTS app that registered this element. */
  injector!: ng.InjectorService;
  /** Render root used for compiled template content. */
  root!: HTMLElement | ShadowRoot;

  static get observedAttributes(): string[] {
    return getScopeElementInputs(
      this as unknown as ScopeElementConstructor,
    ).map((input) => input.attribute);
  }

  connectedCallback(): void {
    queueScopeElementConnect(this);
  }

  disconnectedCallback(): void {
    queueScopeElementDisconnect(this);
  }

  attributeChangedCallback(
    attribute: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    syncScopeElementAttribute(this, attribute, oldValue, newValue);
  }

  /** Called after the AngularTS scope and template are connected. */
  connected?(): undefined | (() => void);

  /** Called before the AngularTS scope is destroyed. */
  disconnected?(): void;

  /** Called after an observed input attribute changes. */
  attributeChanged?(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void;

  /** Dispatch a composed bubbling DOM event from this custom element. */
  dispatch(
    type: string,
    detail?: unknown,
    init: CustomEventInit = {},
  ): boolean {
    return this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        composed: true,
        ...init,
        detail,
      }),
    );
  }
}
/* eslint-enable @typescript-eslint/no-unnecessary-type-parameters */

export interface ElementScopeOptions {
  /** Explicit parent scope. Defaults to nearest inherited DOM scope. */
  parentScope?: ng.Scope;
  /** Use an isolate child scope. */
  isolate?: boolean;
}

export interface WebComponentService {
  /** Define an options-backed application host custom element. */
  defineAppComponent<T extends object = Record<string, unknown>>(
    name: string,
    options: AppComponentOptions<T>,
  ): CustomElementConstructor;
  /** Define a native custom element backed by an AngularTS child scope. */
  defineElement<T extends object = Record<string, unknown>>(
    name: string,
    elementClass: ScopeElementConstructor<T>,
  ): CustomElementConstructor;
  /** Create and attach a normal AngularTS child scope for a custom element. */
  createElementScope<T extends object = Record<string, unknown>>(
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

type AnyScopeElementConstructor = ScopeElementConstructor;

interface ScopeElementDefinition {
  compile: ng.CompileService;
  createElementScope: WebComponentService["createElementScope"];
  injector: ng.InjectorService;
  inputs: InputDefinition[];
  options: AppComponentOptions;
}

const scopeElementDefinitions = new WeakMap<
  AnyScopeElementConstructor,
  ScopeElementDefinition
>();

const scopeElementInputs = new WeakMap<
  AnyScopeElementConstructor,
  InputDefinition[]
>();

const scopeElementScopes = new WeakMap<HTMLElement, ng.Scope>();

const scopeElementContexts = new WeakMap<HTMLElement, WebComponentContext>();

const scopeElementDestroyTimers = new WeakMap<
  HTMLElement,
  ReturnType<typeof setTimeout>
>();

const scopeElementCleanupFns = new WeakMap<HTMLElement, () => void>();

const queuedScopeElementConnects = new WeakSet<HTMLElement>();

const scopeElementReflectingAttributes = new WeakMap<
  HTMLElement,
  Set<string>
>();

/** Provider for scoped custom element integration. */
export class WebComponentProvider {
  /** Default options merged into every app component definition. */
  defaults: Partial<AppComponentOptions> = {};

  $get = [
    _injector,
    _rootScope,
    _compile,
    (
      injector: ng.InjectorService,
      rootScope: ng.Scope,
      compile: ng.CompileService,
    ): WebComponentService => {
      const createElementScope = <T extends object = Record<string, unknown>>(
        host: HTMLElement,
        initialState: T = {} as T,
        options: ElementScopeOptions = {},
      ): ng.Scope & T => {
        const parentScope = (options.parentScope ??
          getInheritedData(host, _scope) ??
          getInheritedData(host.parentNode ?? host, _scope) ??
          rootScope) as ng.Scope;

        const scope = options.isolate
          ? parentScope.$newIsolate(initialState as ng.Scope)
          : parentScope.$new(initialState as ng.Scope);

        setScope(host, scope);

        return scope as ng.Scope & T;
      };

      return {
        createElementScope,
        defineAppComponent: <T extends object = Record<string, unknown>>(
          name: string,
          options: AppComponentOptions<T>,
        ) => {
          const mergedOptions = {
            ...this.defaults,
            ...options,
          } as AppComponentOptions<T>;

          return defineAppComponent(
            name,
            mergedOptions,
            injector,
            compile,
            createElementScope,
          );
        },
        defineElement: <T extends object = Record<string, unknown>>(
          name: string,
          elementClass: ScopeElementConstructor<T>,
        ) => {
          return defineScopeElement(
            name,
            elementClass,
            resolveScopeElementOptions(elementClass),
            injector,
            compile,
            createElementScope,
          );
        },
      };
    },
  ];
}

function defineAppComponent<T extends object>(
  name: string,
  options: AppComponentOptions<T>,
  injector: ng.InjectorService,
  compile: ng.CompileService,
  createElementScope: WebComponentService["createElementScope"],
): CustomElementConstructor {
  class AngularTsAppComponent extends ScopeElement<T> {
    static template = options.template;
    static shadow = options.shadow;
    static scope = options.scope;
    static inputs = options.inputs;
    static isolate = options.isolate;

    connected(): undefined | (() => void) {
      const context = getScopeElementContext(this) as WebComponentContext<T>;

      return options.connected?.(context);
    }

    disconnected(): void {
      const context = getScopeElementContext(this) as
        | WebComponentContext<T>
        | undefined;

      if (context) options.disconnected?.(context);
    }

    attributeChanged(
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ): void {
      const context = getScopeElementContext(this) as
        | WebComponentContext<T>
        | undefined;

      if (context)
        options.attributeChanged?.(name, oldValue, newValue, context);
    }
  }

  Object.defineProperty(AngularTsAppComponent, "name", {
    value: customElementClassName(name),
  });

  return defineScopeElement(
    name,
    AngularTsAppComponent,
    options,
    injector,
    compile,
    createElementScope,
  );
}

function defineScopeElement<T extends object>(
  name: string,
  elementClass: ScopeElementConstructor<T>,
  options: AppComponentOptions<T>,
  injector: ng.InjectorService,
  compile: ng.CompileService,
  createElementScope: WebComponentService["createElementScope"],
): CustomElementConstructor {
  const existing = customElements.get(name);

  if (existing) return existing;

  const inputs = normalizeInputs(options.inputs);

  scopeElementDefinitions.set(elementClass as AnyScopeElementConstructor, {
    compile,
    createElementScope,
    injector,
    inputs,
    options: options as AppComponentOptions,
  });
  scopeElementInputs.set(elementClass as AnyScopeElementConstructor, inputs);
  installScopeElementInputs(elementClass as ScopeElementConstructor, inputs);

  customElements.define(name, elementClass);

  return elementClass;
}

function resolveScopeElementOptions<T extends object>(
  elementClass: ScopeElementConstructor<T>,
): AppComponentOptions<T> {
  return {
    inputs: elementClass.inputs,
    isolate: elementClass.isolate,
    scope: elementClass.scope,
    shadow: elementClass.shadow,
    template: elementClass.template,
  };
}

function getScopeElementInputs(
  elementClass: ScopeElementConstructor,
): InputDefinition[] {
  return (
    scopeElementInputs.get(elementClass) ?? normalizeInputs(elementClass.inputs)
  );
}

function installScopeElementInputs(
  elementClass: ScopeElementConstructor,
  inputs: InputDefinition[],
): void {
  inputs.forEach((input) => {
    if (
      Object.prototype.hasOwnProperty.call(
        elementClass.prototype,
        input.property,
      )
    ) {
      return;
    }

    Object.defineProperty(elementClass.prototype, input.property, {
      configurable: true,
      enumerable: true,
      get(this: HTMLElement) {
        const scope = scopeElementScopes.get(this);

        if (scope) return (scope as Record<string, unknown>)[input.property];

        return getPendingValues(this)[input.property];
      },
      set(this: HTMLElement, value: unknown) {
        const nextValue = coercePropertyValue(input, value);

        writeInput(this, input, nextValue, scopeElementScopes.get(this));

        if (input.reflect) {
          reflectInput(
            this,
            input,
            nextValue,
            scopeElementReflectingAttributes,
          );
        }
      },
    });
  });
}

function queueScopeElementConnect(host: HTMLElement): void {
  const destroyTimer = scopeElementDestroyTimers.get(host);

  if (destroyTimer) {
    clearTimeout(destroyTimer);
    scopeElementDestroyTimers.delete(host);
  }

  if (queuedScopeElementConnects.has(host)) return;

  queuedScopeElementConnects.add(host);
  queueMicrotask(() => {
    queuedScopeElementConnects.delete(host);

    if (!host.isConnected) return;
    connectScopeElement(host);
  });
}

function queueScopeElementDisconnect(host: HTMLElement): void {
  const timer = setTimeout(() => {
    scopeElementDestroyTimers.delete(host);

    if (host.isConnected) return;
    disconnectScopeElement(host);
  }, 0);

  scopeElementDestroyTimers.set(host, timer);
}

function syncScopeElementAttribute(
  host: HTMLElement,
  attribute: string,
  oldValue: string | null,
  newValue: string | null,
): void {
  if (oldValue === newValue) return;

  const reflected = scopeElementReflectingAttributes.get(host);

  if (reflected?.has(attribute)) return;

  const definition = getScopeElementDefinition(host);

  const input = definition.inputs.find(
    (candidate) => candidate.attribute === attribute,
  );

  if (!input) return;

  writeInput(
    host,
    input,
    coerceAttributeValue(input, newValue),
    scopeElementScopes.get(host),
  );

  (host as ScopeElement).attributeChanged?.(attribute, oldValue, newValue);
}

function connectScopeElement(host: HTMLElement): void {
  const existingScope = scopeElementScopes.get(host);

  if (existingScope && !existingScope.$handler._destroyed) return;

  const definition = getScopeElementDefinition(host);

  const options = definition.options;

  const renderRoot = resolveRenderRoot(host, options.shadow);

  const initialState = resolveInitialState(options.scope);

  const scope = definition.createElementScope(host, initialState, {
    isolate: options.isolate,
  });

  const element = host as ScopeElement;

  const context = createContext(host, scope, definition.injector, renderRoot);

  element.scope = scope;
  element.injector = definition.injector;
  element.root = renderRoot;
  scopeElementScopes.set(host, scope);
  scopeElementContexts.set(host, context);
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

function disconnectScopeElement(host: HTMLElement): void {
  const scope = scopeElementScopes.get(host);

  if (!scope) return;

  const cleanup = scopeElementCleanupFns.get(host);

  cleanup?.();
  scopeElementCleanupFns.delete(host);

  const element = host as ScopeElement;

  element.disconnected?.();

  if (!scope.$handler._destroyed) {
    scope.$destroy();
  }

  const definition = getScopeElementDefinition(host);

  scopeElementScopes.delete(host);
  scopeElementContexts.delete(host);
  clearRenderedContent(resolveRenderRoot(host, definition.options.shadow));
}

function getScopeElementDefinition(host: HTMLElement): ScopeElementDefinition {
  const definition = scopeElementDefinitions.get(
    host.constructor as AnyScopeElementConstructor,
  );

  if (!definition) {
    throw new Error(
      `Custom element ${host.localName} was not registered with $webComponent`,
    );
  }

  return definition;
}

function getScopeElementContext(
  host: HTMLElement,
): WebComponentContext | undefined {
  return scopeElementContexts.get(host);
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
      attribute: config.attribute ?? kebobString(property),
      default: config.default,
      property,
      reflect: !!config.reflect,
      type: config.type ?? String,
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
  shadow: AppComponentOptions["shadow"],
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
  setScope(root, scope);

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
    linked.forEach((node) => {
      root.appendChild(node);
    });

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
