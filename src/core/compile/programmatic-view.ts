import { _compile, _exceptionHandler } from "../../injection-tokens.ts";
import type {
  ComponentView,
  ComponentViewChild,
  DirectiveView,
  DirectiveViewContext,
} from "../../interface.ts";
import { addElementDisposer, getCacheData } from "../../shared/dom.ts";
import { isArray, isFunction } from "../../shared/utils.ts";
import { createScope, observeScopeExpression } from "../scope/scope.ts";
import {
  addCompiledFragmentDisposer,
  getCompiledFragmentRecord,
  type CompiledFragmentRecord,
} from "./incremental-fragment.ts";

export const PROGRAMMATIC_VIEW_MARKER = "ng-programmatic-view";

export const PROGRAMMATIC_VIEW_TEMPLATE = `<!--${PROGRAMMATIC_VIEW_MARKER}-->`;

/**
 * Property, attribute, event listener, or reactive property reader accepted by
 * a programmatic view tag factory.
 */
export type ComponentViewPropertyValue = unknown;

/**
 * Property map passed as the first argument to a programmatic view tag.
 * `on*` functions become listeners, other functions become reactive readers,
 * native setters receive property values, and remaining names use attributes.
 * Spread `attrs(...)` into this map to force attribute behavior. `props(...)`
 * assigns its enclosed values literally, including function values.
 */
type ComponentViewEventProperties = Partial<{
  [Name in keyof GlobalEventHandlersEventMap as `on${Name}`]:
    | ((event: GlobalEventHandlersEventMap[Name]) => unknown)
    | EventListenerObject;
}>;

/** Typed DOM properties plus arbitrary attribute and custom-element values. */
export type ComponentViewProperties<TElement extends Element = Element> =
  Partial<{
    [Name in keyof TElement]: TElement[Name] | (() => TElement[Name]);
  }> &
    ComponentViewEventProperties &
    Record<string, ComponentViewPropertyValue> & {
      is?: string;
    };

type DomBindingTarget = "auto" | "attribute" | "property";

const bindingMetadata = Symbol("programmatic-view-binding");
const attributeGroup = Symbol("programmatic-view-attributes");
const propertyGroup = Symbol("programmatic-view-properties");

type ViewBindingMetadata =
  | {
      readonly _kind: "event";
      readonly _options: AddEventListenerOptions | boolean | undefined;
    }
  | {
      readonly _kind: "keyed-child";
      readonly _binding: KeyedBinding<unknown>;
    };

type ViewBindingFunction<T> = (() => T) & {
  readonly [bindingMetadata]?: ViewBindingMetadata;
};

interface PropertyGroup {
  readonly [attributeGroup]?: ComponentViewProperties;
  readonly [propertyGroup]?: ComponentViewProperties;
}

interface KeyedBinding<T> {
  readonly _read: () => Iterable<T> | null | undefined;
  readonly _key: (item: T) => PropertyKey;
  readonly _render: (item: () => T) => ComponentViewChild;
}

function markBinding<T extends object>(
  value: T,
  metadata: ViewBindingMetadata,
): T {
  Object.defineProperty(value, bindingMetadata, { value: metadata });

  return value;
}

function getBindingMetadata(value: unknown): ViewBindingMetadata | undefined {
  return isFunction(value)
    ? (value as ViewBindingFunction<unknown>)[bindingMetadata]
    : undefined;
}

/** Marks a listener explicitly and optionally supplies native listener options. */
export function event(
  listener: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions | boolean,
): EventListener {
  const wrapper: EventListener = function (this: EventTarget, value: Event) {
    if (isFunction(listener)) {
      Reflect.apply(listener, this, [value]);
    } else {
      listener.handleEvent(value);
    }
  };

  return markBinding(wrapper, { _kind: "event", _options: options });
}

/** Forces the enclosed values to use DOM attribute semantics. */
export function attrs(
  values: ComponentViewProperties,
): ComponentViewProperties {
  return { [attributeGroup]: values } as ComponentViewProperties;
}

/** Assigns the enclosed values as literal DOM properties. */
export function props(
  values: ComponentViewProperties,
): ComponentViewProperties {
  return { [propertyGroup]: values } as ComponentViewProperties;
}

/**
 * Creates a keyed reactive collection. Existing DOM is retained while items
 * with stable keys move or change identity. Renderers receive an item reader so
 * nested reactive bindings follow same-key replacements.
 */
export function each<T>(
  read: () => Iterable<T> | null | undefined,
  key: (item: T) => PropertyKey,
  render: (item: () => T) => ComponentViewChild,
): () => ComponentViewChild {
  const binding: KeyedBinding<unknown> = {
    _read: read as unknown as KeyedBinding<unknown>["_read"],
    _key: key as unknown as KeyedBinding<unknown>["_key"],
    _render: render as unknown as KeyedBinding<unknown>["_render"],
  };
  const wrapper = (): ComponentViewChild => {
    const items = read();

    if (items === null || items === undefined) return [];

    const children: ComponentViewChild[] = [];

    for (const item of items) {
      children.push(render(() => item));
    }

    return children;
  };

  return markBinding(wrapper, { _kind: "keyed-child", _binding: binding });
}

/** Factory that creates one real DOM element without parsing HTML. */
export type ComponentViewTag<TElement extends Element = HTMLElement> = (
  first?: ComponentViewProperties<TElement> | ComponentViewChild,
  ...children: readonly ComponentViewChild[]
) => TElement;

/**
 * Typed HTML tag factories. Calling the object with a namespace URI returns
 * factories for namespaced elements such as SVG and MathML.
 */
export type ComponentViewTags = Readonly<{
  [Name in keyof HTMLElementTagNameMap]: ComponentViewTag<
    HTMLElementTagNameMap[Name]
  >;
}> &
  ((
    namespaceUri: string,
  ) => Readonly<Record<string, ComponentViewTag<Element>>>);

interface PropertyBinding {
  readonly _kind: "property";
  readonly _name: string;
  readonly _read: () => unknown;
  readonly _target: DomBindingTarget;
}

interface StaticPropertyBinding {
  readonly _kind: "static-property";
  readonly _name: string;
  readonly _value: unknown;
  readonly _target: DomBindingTarget;
}

interface EventBinding {
  readonly _kind: "event";
  readonly _name: string;
  readonly _listener: EventListenerOrEventListenerObject;
  readonly _options: AddEventListenerOptions | boolean | undefined;
}

interface ChildBinding {
  readonly _kind: "child";
  readonly _read: () => ComponentViewChild;
}

interface KeyedChildBinding {
  readonly _kind: "keyed-child";
  readonly _binding: KeyedBinding<unknown>;
}

type PendingBinding =
  | PropertyBinding
  | StaticPropertyBinding
  | EventBinding
  | ChildBinding
  | KeyedChildBinding;

interface LinkedChildState {
  readonly _nodes: Node[];
  readonly _records: CompiledFragmentRecord[];
}

interface KeyedChildState {
  readonly _key: PropertyKey;
  readonly _value: unknown;
  readonly _holder: { value: unknown };
  readonly _children: LinkedChildState[];
}

interface ProgrammaticBindingRuntime {
  readonly _scope: ng.Scope;
  readonly _sanitizeProperty: (
    element: Element,
    propertyName: string,
    value: unknown,
  ) => unknown;
  readonly _linkNode: (node: Node, parent: Node, before: Node | null) => Node[];
  readonly _exceptionHandler: (error: unknown) => void;
  readonly _ownDisposer: (disposer: () => void) => () => void;
}

export interface ProgrammaticDirectiveCompileOptions {
  readonly name: string;
  readonly view: ComponentView | DirectiveView;
  readonly hasRequire?: boolean;
  readonly injector: ng.InjectorService;
  readonly sanitizeProperty: ProgrammaticBindingRuntime["_sanitizeProperty"];
}

const pendingBindings = new WeakMap<Node, PendingBinding[]>();

const tagProxyCache = new Map<
  string,
  Readonly<Record<string, ComponentViewTag<Element>>>
>();

function addPendingBinding(node: Node, binding: PendingBinding): void {
  let bindings = pendingBindings.get(node);

  if (!bindings) {
    bindings = [];
    pendingBindings.set(node, bindings);
  }

  bindings.push(binding);
}

function isProperties(value: unknown): value is ComponentViewProperties {
  if (!value || typeof value !== "object" || value instanceof Node) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as object | null;

  return prototype === Object.prototype || prototype === null;
}

function isPropertyGroup(value: unknown): value is PropertyGroup {
  return Boolean(
    value &&
    typeof value === "object" &&
    (attributeGroup in value || propertyGroup in value),
  );
}

function setDomProperty(element: Element, name: string, value: unknown): void {
  if (name in element && Reflect.set(element, name, value)) {
    return;
  }

  if (value === null || value === undefined || value === false) {
    element.removeAttribute(name);
    return;
  }

  element.setAttribute(
    name,
    value === true
      ? ""
      : typeof value === "string"
        ? value
        : String(value as number | boolean | bigint),
  );
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

function setDomAttribute(element: Element, name: string, value: unknown): void {
  if (
    value === null ||
    value === undefined ||
    (value === false && booleanAttributes.has(name.toLowerCase()))
  ) {
    element.removeAttribute(name);
    return;
  }

  element.setAttribute(
    name,
    value === true && booleanAttributes.has(name.toLowerCase())
      ? ""
      : String(value as string | number | boolean | bigint),
  );
}

function setExplicitDomProperty(
  element: Element,
  name: string,
  value: unknown,
): void {
  if (!Reflect.set(element, name, value)) {
    throw new TypeError(`DOM property '${name}' cannot be assigned.`);
  }
}

function setDomValue(
  element: Element,
  name: string,
  value: unknown,
  target: DomBindingTarget,
): void {
  if (target === "attribute") {
    setDomAttribute(element, name, value);
  } else if (target === "property") {
    setExplicitDomProperty(element, name, value);
  } else {
    setDomProperty(element, name, value);
  }
}

function applyProperty(
  element: Element,
  propertyName: string,
  propertyValue: unknown,
  target: DomBindingTarget,
): void {
  if (target === "property") {
    if (deferredStaticProperties.has(propertyName.toLowerCase())) {
      addPendingBinding(element, {
        _kind: "static-property",
        _name: propertyName,
        _value: propertyValue,
        _target: target,
      });
    } else {
      setExplicitDomProperty(element, propertyName, propertyValue);
    }

    return;
  }

  const metadata = getBindingMetadata(propertyValue);
  const normalizedEventProperty = propertyName.startsWith("on")
    ? `on${propertyName.slice(2).toLowerCase()}`
    : "";
  const explicitEvent = metadata?._kind === "event";
  const conventionalEvent = Boolean(
    target === "auto" &&
    normalizedEventProperty &&
    normalizedEventProperty in element,
  );

  if (explicitEvent || conventionalEvent) {
    if (
      propertyValue !== null &&
      propertyValue !== undefined &&
      !isFunction(propertyValue) &&
      !(
        typeof propertyValue === "object" &&
        typeof (propertyValue as EventListenerObject).handleEvent === "function"
      )
    ) {
      throw new TypeError(
        `Event property '${propertyName}' must be an event listener.`,
      );
    }

    if (propertyValue !== null && propertyValue !== undefined) {
      addPendingBinding(element, {
        _kind: "event",
        _name: explicitEvent
          ? propertyName.startsWith("on")
            ? propertyName.slice(2).toLowerCase()
            : propertyName
          : normalizedEventProperty.slice(2),
        _listener: propertyValue as EventListenerOrEventListenerObject,
        _options: metadata?._kind === "event" ? metadata._options : undefined,
      });
    }
  } else if (isFunction(propertyValue)) {
    addPendingBinding(element, {
      _kind: "property",
      _name: propertyName,
      _read: propertyValue as () => unknown,
      _target: target === "auto" ? "property" : target,
    });
  } else if (deferredStaticProperties.has(propertyName.toLowerCase())) {
    addPendingBinding(element, {
      _kind: "static-property",
      _name: propertyName,
      _value: propertyValue,
      _target: target,
    });
  } else {
    setDomValue(element, propertyName, propertyValue, target);
  }
}

function materializeChild(value: ComponentViewChild, nodes: Node[]): void {
  if (isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      materializeChild(value[index] as ComponentViewChild, nodes);
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
      _read: value as () => ComponentViewChild,
    });
    nodes.push(anchor);
    return;
  }

  if (value !== null && value !== undefined && value !== false) {
    nodes.push(
      document.createTextNode(
        String(value as string | number | boolean | bigint),
      ),
    );
  }
}

export function materializeComponentView(value: ComponentViewChild): Node[] {
  const nodes: Node[] = [];

  materializeChild(value, nodes);

  return nodes;
}

function appendChildren(
  element: Element,
  children: readonly ComponentViewChild[],
): void {
  for (let index = 0; index < children.length; index++) {
    const nodes = materializeComponentView(children[index]);

    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      element.appendChild(nodes[nodeIndex]);
    }
  }
}

function createTag(
  namespaceUri: string | undefined,
  name: string,
  ...args: readonly (ComponentViewProperties | ComponentViewChild)[]
): Element {
  const properties = isProperties(args[0]) ? args[0] : undefined;
  const children = properties ? args.slice(1) : args;
  const customElementName = properties?.is;
  const element = namespaceUri
    ? document.createElementNS(
        namespaceUri,
        name,
        customElementName ? { is: customElementName } : undefined,
      )
    : document.createElement(
        name,
        customElementName ? { is: customElementName } : undefined,
      );

  if (properties) {
    for (const [propertyName, propertyValue] of Object.entries(properties)) {
      if (propertyName === "is") continue;

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

  appendChildren(element, children as readonly ComponentViewChild[]);

  return element;
}

/** Creates one HTML element without parsing markup. */
export function tag<Name extends keyof HTMLElementTagNameMap>(
  name: Name,
  ...args: readonly (ComponentViewProperties | ComponentViewChild)[]
): HTMLElementTagNameMap[Name];
export function tag(
  name: string,
  ...args: readonly (ComponentViewProperties | ComponentViewChild)[]
): HTMLElement;
export function tag(
  name: string,
  ...args: readonly (ComponentViewProperties | ComponentViewChild)[]
): HTMLElement {
  return createTag(undefined, name, ...args) as HTMLElement;
}

/** Creates one namespaced element without parsing markup. */
export function tagNS(
  namespaceUri: string,
  name: string,
  ...args: readonly (ComponentViewProperties | ComponentViewChild)[]
): Element {
  return createTag(namespaceUri, name, ...args);
}

function getTagProxy(
  namespaceUri?: string,
): Readonly<Record<string, ComponentViewTag<Element>>> {
  const cacheKey = namespaceUri ?? "";
  const cached = tagProxyCache.get(cacheKey);

  if (cached) return cached;

  const tagFunctions = new Map<string, ComponentViewTag<Element>>();
  const proxy = new Proxy(
    Object.create(null) as Record<string, ComponentViewTag<Element>>,
    {
      get(_target, property): unknown {
        if (typeof property !== "string") return undefined;
        if (property === "then") return undefined;

        let tagFunction = tagFunctions.get(property);

        if (!tagFunction) {
          tagFunction = (...args) => createTag(namespaceUri, property, ...args);
          tagFunctions.set(property, tagFunction);
        }

        return tagFunction;
      },
    },
  );

  tagProxyCache.set(cacheKey, proxy);

  return proxy;
}

const htmlTags = getTagProxy();

export const tags = new Proxy(
  ((namespaceUri: string) => getTagProxy(namespaceUri)) as ComponentViewTags,
  {
    get(_target, property): unknown {
      if (property === "then") return undefined;

      return Reflect.get(htmlTags, property);
    },
  },
);

function uniqueRecords(nodes: readonly Node[]): CompiledFragmentRecord[] {
  const records: CompiledFragmentRecord[] = [];
  const seen = new Set<CompiledFragmentRecord>();

  for (let index = 0; index < nodes.length; index++) {
    const record = getCompiledFragmentRecord(nodes[index]);

    if (record && !seen.has(record)) {
      seen.add(record);
      records.push(record);
    }
  }

  return records;
}

function disposeLinkedChildren(children: LinkedChildState[]): void {
  const disposedRecords = new Set<CompiledFragmentRecord>();

  for (let index = children.length - 1; index >= 0; index--) {
    const child = children[index];

    for (
      let recordIndex = child._records.length - 1;
      recordIndex >= 0;
      recordIndex--
    ) {
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

function linkChildValue(
  value: ComponentViewChild,
  parent: Node,
  anchor: Node,
  runtime: ProgrammaticBindingRuntime,
): LinkedChildState[] {
  return linkMaterializedChildren(
    materializeComponentView(value),
    parent,
    anchor,
    runtime,
  );
}

function linkMaterializedChildren(
  rawNodes: readonly Node[],
  parent: Node,
  anchor: Node | null,
  runtime: ProgrammaticBindingRuntime,
): LinkedChildState[] {
  const children: LinkedChildState[] = [];

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

function activateChildBinding(
  anchor: Node,
  read: () => ComponentViewChild,
  runtime: ProgrammaticBindingRuntime,
): () => void {
  const linkedChildren: LinkedChildState[] = [];

  const stop = observeScopeExpression(runtime._scope, read, (value) => {
    const parent = anchor.parentNode;

    if (!parent) return;

    if (
      linkedChildren.length === 1 &&
      linkedChildren[0]._nodes.length === 1 &&
      linkedChildren[0]._nodes[0] instanceof Text &&
      value !== null &&
      value !== undefined &&
      value !== false &&
      !isFunction(value) &&
      !isArray(value) &&
      !(value instanceof Node)
    ) {
      linkedChildren[0]._nodes[0].data = String(
        value as string | number | boolean | bigint,
      );
      return;
    }

    disposeLinkedChildren(linkedChildren);

    linkedChildren.push(
      ...linkChildValue(value as ComponentViewChild, parent, anchor, runtime),
    );
  });

  return () => {
    stop();
    disposeLinkedChildren(linkedChildren);
  };
}

function activateKeyedChildBinding(
  anchor: Node,
  binding: KeyedBinding<unknown>,
  runtime: ProgrammaticBindingRuntime,
): () => void {
  let states = new Map<PropertyKey, KeyedChildState>();

  const stop = observeScopeExpression(
    runtime._scope,
    binding._read,
    (value) => {
      const parent = anchor.parentNode;

      if (!parent) return;

      const items =
        value === null || value === undefined
          ? []
          : Array.from(value as Iterable<unknown>);
      const descriptors: Array<{
        readonly _key: PropertyKey;
        readonly _value: unknown;
        readonly _holder: { value: unknown };
        readonly _nodes: readonly Node[];
      }> = [];
      const descriptorByKey = new Map<PropertyKey, unknown>();

      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const key = binding._key(item);

        if (descriptorByKey.has(key)) {
          throw new TypeError(
            `Duplicate programmatic view key '${String(key)}'.`,
          );
        }

        descriptorByKey.set(key, item);
        const previous = states.get(key);
        const holder = previous
          ? previous._holder
          : (createScope({ value: item }, runtime._scope._handler) as {
              value: unknown;
            });

        descriptors.push({
          _key: key,
          _value: item,
          _holder: holder,
          _nodes: previous
            ? []
            : materializeComponentView(binding._render(() => holder.value)),
        });
      }

      const nextStates = new Map<PropertyKey, KeyedChildState>();

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
          : linkMaterializedChildren(
              descriptor._nodes,
              parent,
              anchor,
              runtime,
            );

        if (previous && !Object.is(previous._value, descriptor._value)) {
          descriptor._holder.value = descriptor._value;
        }

        const state: KeyedChildState = {
          _key: descriptor._key,
          _value: descriptor._value,
          _holder: descriptor._holder,
          _children: children,
        };

        nextStates.set(state._key, state);
      }

      states = nextStates;

      let cursor: Node = anchor;
      const orderedStates = Array.from(states.values());

      for (
        let stateIndex = orderedStates.length - 1;
        stateIndex >= 0;
        stateIndex--
      ) {
        const children = orderedStates[stateIndex]._children;

        for (
          let childIndex = children.length - 1;
          childIndex >= 0;
          childIndex--
        ) {
          const nodes = children[childIndex]._nodes;

          for (let nodeIndex = nodes.length - 1; nodeIndex >= 0; nodeIndex--) {
            const node = nodes[nodeIndex];

            if (node.nextSibling !== cursor) parent.insertBefore(node, cursor);
            cursor = node;
          }
        }
      }
    },
  );

  return () => {
    stop();

    for (const state of states.values()) {
      disposeLinkedChildren(state._children);
    }

    states.clear();
  };
}

function activateNodeBindings(
  node: Node,
  runtime: ProgrammaticBindingRuntime,
  disposers: Array<() => void>,
): void {
  const bindings = pendingBindings.get(node);

  if (bindings) {
    pendingBindings.delete(node);

    for (let index = 0; index < bindings.length; index++) {
      const binding = bindings[index];

      if (binding._kind === "event") {
        const eventTarget = node as EventTarget;
        const listener: EventListener = function (
          this: EventTarget,
          eventValue,
        ) {
          try {
            if (isFunction(binding._listener)) {
              Reflect.apply(binding._listener, this, [eventValue]);
            } else {
              binding._listener.handleEvent(eventValue);
            }
          } catch (error) {
            runtime._exceptionHandler(error);
          }
        };

        eventTarget.addEventListener(binding._name, listener, binding._options);
        disposers.push(() => {
          eventTarget.removeEventListener(
            binding._name,
            listener,
            binding._options,
          );
        });
      } else if (binding._kind === "static-property") {
        try {
          const sanitizedValue = runtime._sanitizeProperty(
            node as Element,
            binding._name,
            binding._value,
          );

          setDomValue(
            node as Element,
            binding._name,
            sanitizedValue,
            binding._target,
          );
        } catch (error) {
          runtime._exceptionHandler(error);
        }
      } else if (binding._kind === "property") {
        let hasValue = false;
        let previousValue: unknown;

        disposers.push(
          observeScopeExpression(runtime._scope, binding._read, (value) => {
            const sanitizedValue = runtime._sanitizeProperty(
              node as Element,
              binding._name,
              value,
            );

            if (hasValue && Object.is(previousValue, sanitizedValue)) return;

            hasValue = true;
            previousValue = sanitizedValue;
            setDomValue(
              node as Element,
              binding._name,
              sanitizedValue,
              binding._target,
            );
          }),
        );
      } else if (binding._kind === "child") {
        disposers.push(activateChildBinding(node, binding._read, runtime));
      } else {
        disposers.push(
          activateKeyedChildBinding(node, binding._binding, runtime),
        );
      }
    }
  }

  const childNodes = Array.from(node.childNodes);

  for (let index = 0; index < childNodes.length; index++) {
    activateNodeBindings(childNodes[index], runtime, disposers);
  }
}

function activateProgrammaticBindings(
  nodes: readonly Node[],
  runtime: ProgrammaticBindingRuntime,
): () => void {
  const disposers: Array<() => void> = [];

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

  if (owner) addCompiledFragmentDisposer(owner, dispose);

  return dispose;
}

function findMarker(element: Element): Comment | undefined {
  for (let node = element.firstChild; node; node = node.nextSibling) {
    if (
      node instanceof Comment &&
      node.data.trim() === PROGRAMMATIC_VIEW_MARKER
    ) {
      return node;
    }
  }

  return undefined;
}

function normalizeLinkResult(
  result: Element | Node | ChildNode | Node[],
): Node[] {
  return isArray(result) ? result : [result];
}

export function createProgrammaticDirectiveCompile(
  options: ProgrammaticDirectiveCompileOptions,
): ng.DirectiveCompileFn {
  return (() => {
    const pre = (
      scope: ng.Scope,
      element: HTMLElement,
      requiredControllers: unknown,
      transclude: ng.TranscludeFn,
    ): void => {
      const marker = findMarker(element);

      if (!marker) {
        throw new Error(
          `Programmatic component '${options.name}' has no view marker.`,
        );
      }

      if (!options.hasRequire) {
        transclude = requiredControllers as ng.TranscludeFn;
        requiredControllers = undefined;
      }

      const controller = getCacheData(element, `$${options.name}Controller`) as
        | ng.Controller
        | undefined;
      const $compile = options.injector.get(_compile);
      const $exceptionHandler = options.injector.get(_exceptionHandler);
      const cleanups: Array<() => void> = [];
      let destroyed = false;
      const disposeView = () => {
        destroyed = true;

        for (let index = cleanups.length - 1; index >= 0; index--) {
          try {
            cleanups[index]();
          } catch (error) {
            $exceptionHandler(error);
          }
        }

        cleanups.length = 0;
      };
      cleanups.push(addElementDisposer(element, disposeView));
      cleanups.push(scope.on("$destroy", disposeView));

      const context: DirectiveViewContext = {
        controller,
        required: requiredControllers as DirectiveViewContext["required"],
        scope,
        element,
        transclude,
        onDestroy(cleanup) {
          if (!isFunction(cleanup)) {
            throw new TypeError(
              "Programmatic view cleanup must be a function.",
            );
          }

          if (destroyed) {
            try {
              cleanup();
            } catch (error) {
              $exceptionHandler(error);
            }
            return () => {};
          }

          const entry = () => {
            cleanup();
          };

          cleanups.push(entry);
          let active = true;

          return () => {
            if (!active) return;

            active = false;
            const index = cleanups.indexOf(entry);

            if (index !== -1) cleanups.splice(index, 1);
          };
        },
      };
      const value = Reflect.apply(options.view, controller ?? null, [
        context,
      ]) as unknown;
      const rawNodes = materializeComponentView(value as ComponentViewChild);
      const bindingDisposers = new Set<() => void>();

      cleanups.push(() => {
        for (const dispose of Array.from(bindingDisposers)) dispose();
        bindingDisposers.clear();
      });

      const runtime: ProgrammaticBindingRuntime = {
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
          } catch (error) {
            node.parentNode?.removeChild(node);
            $exceptionHandler(error);
            return [];
          }
        },
      };
      const boundary = marker.nextSibling;

      linkMaterializedChildren(rawNodes, element, boundary, runtime);
    };

    const post = (_scope: ng.Scope, element: HTMLElement): void => {
      findMarker(element)?.remove();
    };

    return { pre, post };
  }) as unknown as ng.DirectiveCompileFn;
}

export const createProgrammaticComponentCompile =
  createProgrammaticDirectiveCompile;

export function sanitizeProgrammaticSrcset(
  value: unknown,
  valueOf: (value: unknown) => unknown,
  trustMediaUrl: (value: unknown) => unknown,
): unknown {
  const unwrapped = valueOf(value);

  if (!unwrapped) return unwrapped;

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
