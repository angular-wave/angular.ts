import { _compile, _exceptionHandler } from "../../injection-tokens.ts";
import type {
  ProgrammaticView,
  ProgrammaticViewChild,
  ProgrammaticViewContext,
  ProgrammaticViewReader,
} from "../../interface.ts";
import { addElementDisposer, dealoc, getCacheData } from "../../shared/dom.ts";
import { isArray, isFunction } from "../../shared/utils.ts";
import {
  createScope,
  getArrayMutationMeta,
  observeScopeExpression,
} from "../scope/scope.ts";
import {
  addCompiledFragmentDisposer,
  disposeCompiledFragmentRecords,
  getCompiledFragmentRecord,
  type CompiledFragmentRecord,
} from "./incremental-fragment.ts";
import { planKeyedReconciliation } from "./keyed-reconciler.ts";

export const PROGRAMMATIC_VIEW_MARKER = "ng-programmatic-view";

export const PROGRAMMATIC_VIEW_TEMPLATE = `<!--${PROGRAMMATIC_VIEW_MARKER}-->`;

/** Static DOM attribute value accepted by {@link Angular.view | view.attrs()}. */
export type ProgrammaticViewAttributeValue =
  | string
  | number
  | boolean
  | bigint
  | null
  | undefined;

/** Static value or reactive reader accepted by a programmatic view property. */
export type ProgrammaticViewPropertyValue<T = unknown> =
  | T
  | ProgrammaticViewReader<T>;

/** Explicit attribute map accepted by {@link Angular.view | view.attrs()}. */
export type ProgrammaticViewAttributes = Readonly<
  Record<string, ProgrammaticViewPropertyValue<ProgrammaticViewAttributeValue>>
>;

/** Explicit literal property map accepted by {@link Angular.view | view.props()}. */
export type ProgrammaticViewLiteralProperties = Readonly<
  Record<string, unknown>
>;

/** @inline */
type ProgrammaticViewEventProperties = Partial<{
  [Name in keyof GlobalEventHandlersEventMap as `on${Name}`]:
    | ((event: GlobalEventHandlersEventMap[Name]) => unknown)
    | EventListenerObject;
}>;

/** Typed DOM properties plus arbitrary attribute and custom-element values. */
export type ProgrammaticViewProperties<TElement extends Element = Element> =
  Partial<{
    [Name in keyof TElement as TElement[Name] extends (
      ...args: never[]
    ) => unknown
      ? never
      : Name]: ProgrammaticViewPropertyValue<TElement[Name]>;
  }> &
    ProgrammaticViewEventProperties &
    Partial<
      Record<
        `aria-${string}` | `data-${string}`,
        ProgrammaticViewPropertyValue<ProgrammaticViewAttributeValue>
      >
    > & {
      class?: ProgrammaticViewPropertyValue<string | null | undefined>;
      role?: ProgrammaticViewPropertyValue<string | null | undefined>;
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

/** @inline */
type PropertyGroup =
  | {
      readonly [attributeGroup]: ProgrammaticViewAttributes;
      readonly [propertyGroup]?: ProgrammaticViewLiteralProperties;
    }
  | {
      readonly [attributeGroup]?: ProgrammaticViewAttributes;
      readonly [propertyGroup]: ProgrammaticViewLiteralProperties;
    };

interface KeyedBinding<T> {
  readonly _read: () => Iterable<T> | null | undefined;
  readonly _key: (item: T) => PropertyKey;
  readonly _render: (item: () => T) => ProgrammaticViewChild;
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
export function event<TEvent extends Event = Event>(
  listener:
    | ((event: TEvent) => unknown)
    | { handleEvent(event: TEvent): unknown },
  options?: AddEventListenerOptions | boolean,
): EventListener {
  const wrapper: EventListener = function (this: EventTarget, value: Event) {
    if (isFunction(listener)) {
      Reflect.apply(listener, this, [value]);
    } else {
      listener.handleEvent(value as TEvent);
    }
  };

  return markBinding(wrapper, { _kind: "event", _options: options });
}

/** Forces the enclosed values to use DOM attribute semantics. */
export function attrs(values: ProgrammaticViewAttributes): PropertyGroup {
  return { [attributeGroup]: values };
}

/** Assigns the enclosed values as literal DOM properties. */
export function props(
  values: ProgrammaticViewLiteralProperties,
): PropertyGroup {
  return { [propertyGroup]: values };
}

/**
 * Creates a keyed reactive collection. Existing DOM is retained while items
 * with stable keys move or change identity. Renderers receive an item reader so
 * nested reactive bindings follow same-key replacements.
 */
declare const keyedProgrammaticView: unique symbol;

/** Opaque keyed collection binding returned by {@link Angular.view | view.each()}. */
export type ProgrammaticKeyedView =
  ProgrammaticViewReader<ProgrammaticViewChild> & {
    readonly [keyedProgrammaticView]: true;
  };

export function each<T>(
  read: () => Iterable<T> | null | undefined,
  key: (item: T) => PropertyKey,
  render: (item: ProgrammaticViewReader<T>) => ProgrammaticViewChild,
): ProgrammaticKeyedView {
  const binding: KeyedBinding<unknown> = {
    _read: read as unknown as KeyedBinding<unknown>["_read"],
    _key: key as unknown as KeyedBinding<unknown>["_key"],
    _render: render as unknown as KeyedBinding<unknown>["_render"],
  };
  const wrapper = (): ProgrammaticViewChild => {
    const items = read();

    if (items === null || items === undefined) return [];

    const children: ProgrammaticViewChild[] = [];

    for (const item of items) {
      children.push(render(() => item));
    }

    return children;
  };

  return markBinding(wrapper, {
    _kind: "keyed-child",
    _binding: binding,
  }) as ProgrammaticKeyedView;
}

/** Factory that creates one real DOM element without parsing HTML. */
export type ProgrammaticViewTag<TElement extends Element = HTMLElement> = (
  first?:
    | ProgrammaticViewProperties<TElement>
    | PropertyGroup
    | ProgrammaticViewChild,
  ...children: readonly ProgrammaticViewChild[]
) => TElement;

/**
 * Typed HTML tag factories. Calling the object with a namespace URI returns
 * factories for namespaced elements such as SVG and MathML.
 */
export type ProgrammaticViewTags = Readonly<{
  [Name in keyof HTMLElementTagNameMap]: ProgrammaticViewTag<
    HTMLElementTagNameMap[Name]
  >;
}> &
  ((namespaceUri: "http://www.w3.org/2000/svg") => Readonly<{
    [Name in keyof SVGElementTagNameMap]: ProgrammaticViewTag<
      SVGElementTagNameMap[Name]
    >;
  }>) &
  ((namespaceUri: "http://www.w3.org/1998/Math/MathML") => Readonly<{
    [Name in keyof MathMLElementTagNameMap]: ProgrammaticViewTag<
      MathMLElementTagNameMap[Name]
    >;
  }>) &
  ((
    namespaceUri: string,
  ) => Readonly<Record<string, ProgrammaticViewTag<Element>>>);

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
  readonly _read: () => ProgrammaticViewChild;
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
  readonly _disposeBindings: () => void;
}

interface KeyedChildState {
  readonly _key: PropertyKey;
  _value: unknown;
  readonly _holder: { value: unknown };
  readonly _children: LinkedChildState[];
  _index: number;
}

function firstKeyedStateNode(state: KeyedChildState): Node | undefined {
  for (let index = 0; index < state._children.length; index++) {
    const nodes = state._children[index]._nodes;

    if (nodes.length > 0) return nodes[0];
  }

  return undefined;
}

function lastKeyedStateNode(state: KeyedChildState): Node | undefined {
  for (let index = state._children.length - 1; index >= 0; index--) {
    const nodes = state._children[index]._nodes;

    if (nodes.length > 0) return nodes[nodes.length - 1];
  }

  return undefined;
}

function detachKeyedStateRange(
  states: Iterable<KeyedChildState>,
  anchor: Node,
): void {
  let firstState: KeyedChildState | undefined;
  let lastState: KeyedChildState | undefined;

  for (const state of states) {
    if (!firstState || state._index < firstState._index) firstState = state;
    if (!lastState || state._index > lastState._index) lastState = state;
  }

  if (!firstState || !lastState) return;

  const firstNode = firstKeyedStateNode(firstState);
  const lastNode = lastKeyedStateNode(lastState);

  const parent = firstNode?.parentNode;

  if (!firstNode || !lastNode || !parent || parent !== lastNode.parentNode) {
    return;
  }

  if (
    firstNode === parent.firstChild &&
    lastNode.nextSibling === anchor &&
    anchor.nextSibling === null
  ) {
    parent.replaceChildren(anchor);

    return;
  }

  const range = document.createRange();

  range.setStartBefore(firstNode);
  range.setEndAfter(lastNode);
  range.deleteContents();
}

function moveKeyedStateBefore(
  parent: Node,
  state: KeyedChildState,
  before: Node | null,
): void {
  for (let childIndex = 0; childIndex < state._children.length; childIndex++) {
    const nodes = state._children[childIndex]._nodes;

    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
      parent.insertBefore(nodes[nodeIndex], before);
    }
  }
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

type ProgrammaticCompileService = ng.CompileService & {
  /** @internal */
  _linkProgrammaticNode?(
    node: Node,
    scope: ng.Scope,
    options: {
      readonly _futureParentElement: Node;
      readonly _ownsNodes: boolean;
    },
  ): Element | Node | ChildNode | Node[] | null;
};

export interface ProgrammaticDirectiveCompileOptions {
  readonly name: string;
  readonly view: ProgrammaticView;
  readonly hasRequire?: boolean;
  readonly injector: ng.InjectorService;
  readonly sanitizeProperty: ProgrammaticBindingRuntime["_sanitizeProperty"];
}

const pendingBindings = new WeakMap<Node, PendingBinding | PendingBinding[]>();

const tagProxyCache = new Map<
  string,
  Readonly<Record<string, ProgrammaticViewTag<Element>>>
>();

function addPendingBinding(node: Node, binding: PendingBinding): void {
  const bindings = pendingBindings.get(node);

  if (!bindings) {
    pendingBindings.set(node, binding);

    return;
  }

  if (isArray(bindings)) {
    bindings.push(binding);
  } else {
    pendingBindings.set(node, [bindings, binding]);
  }
}

function isProperties(value: unknown): value is ProgrammaticViewProperties {
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
      _target:
        target === "auto" && propertyName !== "class" ? "property" : target,
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

function materializeChild(value: ProgrammaticViewChild, nodes: Node[]): void {
  if (isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      materializeChild(value[index] as ProgrammaticViewChild, nodes);
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
      _read: value as () => ProgrammaticViewChild,
    });
    nodes.push(anchor);
    return;
  }

  if (value !== null && value !== undefined && typeof value !== "boolean") {
    nodes.push(
      document.createTextNode(
        String(value as string | number | boolean | bigint),
      ),
    );
  }
}

export function materializeProgrammaticView(
  value: ProgrammaticViewChild,
): Node[] {
  const nodes: Node[] = [];

  materializeChild(value, nodes);

  return nodes;
}

function appendChildren(
  element: Element,
  children: readonly ProgrammaticViewChild[],
  startIndex: number,
): void {
  const nodes: Node[] = [];

  for (let index = startIndex; index < children.length; index++) {
    materializeChild(children[index], nodes);
  }

  for (let index = 0; index < nodes.length; index++) {
    element.appendChild(nodes[index]);
  }
}

function createTag(
  namespaceUri: string | undefined,
  name: string,
  ...args: readonly (
    | ProgrammaticViewProperties
    | PropertyGroup
    | ProgrammaticViewChild
  )[]
): Element {
  const properties = isProperties(args[0]) ? args[0] : undefined;
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
    const propertyNames = Object.keys(properties);

    for (let index = 0; index < propertyNames.length; index++) {
      const propertyName = propertyNames[index];

      if (propertyName === "is") continue;

      applyProperty(
        element,
        propertyName,
        (properties as Record<string, unknown>)[propertyName],
        "auto",
      );
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

  appendChildren(
    element,
    args as readonly ProgrammaticViewChild[],
    properties ? 1 : 0,
  );

  return element;
}

/** Creates one HTML element without parsing markup. */
export function tag<Name extends keyof HTMLElementTagNameMap>(
  name: Name,
  ...args: readonly (
    | ProgrammaticViewProperties
    | PropertyGroup
    | ProgrammaticViewChild
  )[]
): HTMLElementTagNameMap[Name];
export function tag(
  name: string,
  ...args: readonly (
    | ProgrammaticViewProperties
    | PropertyGroup
    | ProgrammaticViewChild
  )[]
): HTMLElement;
export function tag(
  name: string,
  ...args: readonly (
    | ProgrammaticViewProperties
    | PropertyGroup
    | ProgrammaticViewChild
  )[]
): HTMLElement {
  return createTag(undefined, name, ...args) as HTMLElement;
}

/** Creates one namespaced element without parsing markup. */
export function tagNS<Name extends keyof SVGElementTagNameMap>(
  namespaceUri: "http://www.w3.org/2000/svg",
  name: Name,
  ...args: readonly (
    | ProgrammaticViewProperties
    | PropertyGroup
    | ProgrammaticViewChild
  )[]
): SVGElementTagNameMap[Name];
export function tagNS<Name extends keyof MathMLElementTagNameMap>(
  namespaceUri: "http://www.w3.org/1998/Math/MathML",
  name: Name,
  ...args: readonly (
    | ProgrammaticViewProperties
    | PropertyGroup
    | ProgrammaticViewChild
  )[]
): MathMLElementTagNameMap[Name];
export function tagNS(
  namespaceUri: string,
  name: string,
  ...args: readonly (ProgrammaticViewProperties | ProgrammaticViewChild)[]
): Element {
  return createTag(namespaceUri, name, ...args);
}

function getTagProxy(
  namespaceUri?: string,
): Readonly<Record<string, ProgrammaticViewTag<Element>>> {
  const cacheKey = namespaceUri ?? "";
  const cached = tagProxyCache.get(cacheKey);

  if (cached) return cached;

  const tagFunctions = new Map<string, ProgrammaticViewTag<Element>>();
  const proxy = new Proxy(
    Object.create(null) as Record<string, ProgrammaticViewTag<Element>>,
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

const htmlTags = /* @__PURE__ */ getTagProxy();

export const tags = /* @__PURE__ */ new Proxy(
  ((namespaceUri: string) => getTagProxy(namespaceUri)) as ProgrammaticViewTags,
  {
    get(_target, property): unknown {
      if (property === "then") return undefined;

      return Reflect.get(htmlTags, property);
    },
  },
);

/** Direct, tree-shakable factories for every supported HTML element. */
// HTMLElementTagNameMap
export const a: ProgrammaticViewTag<HTMLElementTagNameMap["a"]> = (...args) =>
  createTag(undefined, "a", ...args) as HTMLElementTagNameMap["a"];
export const abbr: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "abbr", ...args) as HTMLElementTagNameMap["abbr"];
export const address: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "address", ...args) as HTMLElementTagNameMap["address"];
export const area: ProgrammaticViewTag<HTMLElementTagNameMap["area"]> = (
  ...args
) => createTag(undefined, "area", ...args) as HTMLElementTagNameMap["area"];
export const article: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "article", ...args) as HTMLElementTagNameMap["article"];
export const aside: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "aside", ...args) as HTMLElementTagNameMap["aside"];
export const audio: ProgrammaticViewTag<HTMLElementTagNameMap["audio"]> = (
  ...args
) => createTag(undefined, "audio", ...args) as HTMLElementTagNameMap["audio"];
export const b: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "b", ...args) as HTMLElementTagNameMap["b"];
export const base: ProgrammaticViewTag<HTMLElementTagNameMap["base"]> = (
  ...args
) => createTag(undefined, "base", ...args) as HTMLElementTagNameMap["base"];
export const bdi: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "bdi", ...args) as HTMLElementTagNameMap["bdi"];
export const bdo: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "bdo", ...args) as HTMLElementTagNameMap["bdo"];
export const blockquote: ProgrammaticViewTag<
  HTMLElementTagNameMap["blockquote"]
> = (...args) =>
  createTag(
    undefined,
    "blockquote",
    ...args,
  ) as HTMLElementTagNameMap["blockquote"];
export const body: ProgrammaticViewTag<HTMLElementTagNameMap["body"]> = (
  ...args
) => createTag(undefined, "body", ...args) as HTMLElementTagNameMap["body"];
export const br: ProgrammaticViewTag<HTMLElementTagNameMap["br"]> = (...args) =>
  createTag(undefined, "br", ...args) as HTMLElementTagNameMap["br"];
export const button: ProgrammaticViewTag<HTMLElementTagNameMap["button"]> = (
  ...args
) => createTag(undefined, "button", ...args) as HTMLElementTagNameMap["button"];
export const canvas: ProgrammaticViewTag<HTMLElementTagNameMap["canvas"]> = (
  ...args
) => createTag(undefined, "canvas", ...args) as HTMLElementTagNameMap["canvas"];
export const caption: ProgrammaticViewTag<HTMLElementTagNameMap["caption"]> = (
  ...args
) =>
  createTag(undefined, "caption", ...args) as HTMLElementTagNameMap["caption"];
export const cite: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "cite", ...args) as HTMLElementTagNameMap["cite"];
export const code: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "code", ...args) as HTMLElementTagNameMap["code"];
export const col: ProgrammaticViewTag<HTMLElementTagNameMap["col"]> = (
  ...args
) => createTag(undefined, "col", ...args) as HTMLElementTagNameMap["col"];
export const colgroup: ProgrammaticViewTag<
  HTMLElementTagNameMap["colgroup"]
> = (...args) =>
  createTag(
    undefined,
    "colgroup",
    ...args,
  ) as HTMLElementTagNameMap["colgroup"];
export const data: ProgrammaticViewTag<HTMLElementTagNameMap["data"]> = (
  ...args
) => createTag(undefined, "data", ...args) as HTMLElementTagNameMap["data"];
export const datalist: ProgrammaticViewTag<
  HTMLElementTagNameMap["datalist"]
> = (...args) =>
  createTag(
    undefined,
    "datalist",
    ...args,
  ) as HTMLElementTagNameMap["datalist"];
export const dd: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "dd", ...args) as HTMLElementTagNameMap["dd"];
export const del: ProgrammaticViewTag<HTMLElementTagNameMap["del"]> = (
  ...args
) => createTag(undefined, "del", ...args) as HTMLElementTagNameMap["del"];
export const details: ProgrammaticViewTag<HTMLElementTagNameMap["details"]> = (
  ...args
) =>
  createTag(undefined, "details", ...args) as HTMLElementTagNameMap["details"];
export const dfn: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "dfn", ...args) as HTMLElementTagNameMap["dfn"];
export const dialog: ProgrammaticViewTag<HTMLElementTagNameMap["dialog"]> = (
  ...args
) => createTag(undefined, "dialog", ...args) as HTMLElementTagNameMap["dialog"];
export const div: ProgrammaticViewTag<HTMLElementTagNameMap["div"]> = (
  ...args
) => createTag(undefined, "div", ...args) as HTMLElementTagNameMap["div"];
export const dl: ProgrammaticViewTag<HTMLElementTagNameMap["dl"]> = (...args) =>
  createTag(undefined, "dl", ...args) as HTMLElementTagNameMap["dl"];
export const dt: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "dt", ...args) as HTMLElementTagNameMap["dt"];
export const em: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "em", ...args) as HTMLElementTagNameMap["em"];
export const embed: ProgrammaticViewTag<HTMLElementTagNameMap["embed"]> = (
  ...args
) => createTag(undefined, "embed", ...args) as HTMLElementTagNameMap["embed"];
export const fieldset: ProgrammaticViewTag<
  HTMLElementTagNameMap["fieldset"]
> = (...args) =>
  createTag(
    undefined,
    "fieldset",
    ...args,
  ) as HTMLElementTagNameMap["fieldset"];
export const figcaption: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "figcaption",
    ...args,
  ) as HTMLElementTagNameMap["figcaption"];
export const figure: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "figure", ...args) as HTMLElementTagNameMap["figure"];
export const footer: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "footer", ...args) as HTMLElementTagNameMap["footer"];
export const form: ProgrammaticViewTag<HTMLElementTagNameMap["form"]> = (
  ...args
) => createTag(undefined, "form", ...args) as HTMLElementTagNameMap["form"];
export const h1: ProgrammaticViewTag<HTMLElementTagNameMap["h1"]> = (...args) =>
  createTag(undefined, "h1", ...args) as HTMLElementTagNameMap["h1"];
export const h2: ProgrammaticViewTag<HTMLElementTagNameMap["h2"]> = (...args) =>
  createTag(undefined, "h2", ...args) as HTMLElementTagNameMap["h2"];
export const h3: ProgrammaticViewTag<HTMLElementTagNameMap["h3"]> = (...args) =>
  createTag(undefined, "h3", ...args) as HTMLElementTagNameMap["h3"];
export const h4: ProgrammaticViewTag<HTMLElementTagNameMap["h4"]> = (...args) =>
  createTag(undefined, "h4", ...args) as HTMLElementTagNameMap["h4"];
export const h5: ProgrammaticViewTag<HTMLElementTagNameMap["h5"]> = (...args) =>
  createTag(undefined, "h5", ...args) as HTMLElementTagNameMap["h5"];
export const h6: ProgrammaticViewTag<HTMLElementTagNameMap["h6"]> = (...args) =>
  createTag(undefined, "h6", ...args) as HTMLElementTagNameMap["h6"];
export const head: ProgrammaticViewTag<HTMLElementTagNameMap["head"]> = (
  ...args
) => createTag(undefined, "head", ...args) as HTMLElementTagNameMap["head"];
export const header: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "header", ...args) as HTMLElementTagNameMap["header"];
export const hgroup: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "hgroup", ...args) as HTMLElementTagNameMap["hgroup"];
export const hr: ProgrammaticViewTag<HTMLElementTagNameMap["hr"]> = (...args) =>
  createTag(undefined, "hr", ...args) as HTMLElementTagNameMap["hr"];
export const html: ProgrammaticViewTag<HTMLElementTagNameMap["html"]> = (
  ...args
) => createTag(undefined, "html", ...args) as HTMLElementTagNameMap["html"];
export const i: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "i", ...args) as HTMLElementTagNameMap["i"];
export const iframe: ProgrammaticViewTag<HTMLElementTagNameMap["iframe"]> = (
  ...args
) => createTag(undefined, "iframe", ...args) as HTMLElementTagNameMap["iframe"];
export const img: ProgrammaticViewTag<HTMLElementTagNameMap["img"]> = (
  ...args
) => createTag(undefined, "img", ...args) as HTMLElementTagNameMap["img"];
export const input: ProgrammaticViewTag<HTMLElementTagNameMap["input"]> = (
  ...args
) => createTag(undefined, "input", ...args) as HTMLElementTagNameMap["input"];
export const ins: ProgrammaticViewTag<HTMLElementTagNameMap["ins"]> = (
  ...args
) => createTag(undefined, "ins", ...args) as HTMLElementTagNameMap["ins"];
export const kbd: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "kbd", ...args) as HTMLElementTagNameMap["kbd"];
export const label: ProgrammaticViewTag<HTMLElementTagNameMap["label"]> = (
  ...args
) => createTag(undefined, "label", ...args) as HTMLElementTagNameMap["label"];
export const legend: ProgrammaticViewTag<HTMLElementTagNameMap["legend"]> = (
  ...args
) => createTag(undefined, "legend", ...args) as HTMLElementTagNameMap["legend"];
export const li: ProgrammaticViewTag<HTMLElementTagNameMap["li"]> = (...args) =>
  createTag(undefined, "li", ...args) as HTMLElementTagNameMap["li"];
export const link: ProgrammaticViewTag<HTMLElementTagNameMap["link"]> = (
  ...args
) => createTag(undefined, "link", ...args) as HTMLElementTagNameMap["link"];
export const main: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "main", ...args) as HTMLElementTagNameMap["main"];
export const map: ProgrammaticViewTag<HTMLElementTagNameMap["map"]> = (
  ...args
) => createTag(undefined, "map", ...args) as HTMLElementTagNameMap["map"];
export const mark: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "mark", ...args) as HTMLElementTagNameMap["mark"];
export const menu: ProgrammaticViewTag<HTMLElementTagNameMap["menu"]> = (
  ...args
) => createTag(undefined, "menu", ...args) as HTMLElementTagNameMap["menu"];
export const meta: ProgrammaticViewTag<HTMLElementTagNameMap["meta"]> = (
  ...args
) => createTag(undefined, "meta", ...args) as HTMLElementTagNameMap["meta"];
export const meter: ProgrammaticViewTag<HTMLElementTagNameMap["meter"]> = (
  ...args
) => createTag(undefined, "meter", ...args) as HTMLElementTagNameMap["meter"];
export const nav: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "nav", ...args) as HTMLElementTagNameMap["nav"];
export const noscript: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "noscript",
    ...args,
  ) as HTMLElementTagNameMap["noscript"];
export const object: ProgrammaticViewTag<HTMLElementTagNameMap["object"]> = (
  ...args
) => createTag(undefined, "object", ...args) as HTMLElementTagNameMap["object"];
export const ol: ProgrammaticViewTag<HTMLElementTagNameMap["ol"]> = (...args) =>
  createTag(undefined, "ol", ...args) as HTMLElementTagNameMap["ol"];
export const optgroup: ProgrammaticViewTag<
  HTMLElementTagNameMap["optgroup"]
> = (...args) =>
  createTag(
    undefined,
    "optgroup",
    ...args,
  ) as HTMLElementTagNameMap["optgroup"];
export const option: ProgrammaticViewTag<HTMLElementTagNameMap["option"]> = (
  ...args
) => createTag(undefined, "option", ...args) as HTMLElementTagNameMap["option"];
export const output: ProgrammaticViewTag<HTMLElementTagNameMap["output"]> = (
  ...args
) => createTag(undefined, "output", ...args) as HTMLElementTagNameMap["output"];
export const p: ProgrammaticViewTag<HTMLElementTagNameMap["p"]> = (...args) =>
  createTag(undefined, "p", ...args) as HTMLElementTagNameMap["p"];
export const picture: ProgrammaticViewTag<HTMLElementTagNameMap["picture"]> = (
  ...args
) =>
  createTag(undefined, "picture", ...args) as HTMLElementTagNameMap["picture"];
export const pre: ProgrammaticViewTag<HTMLElementTagNameMap["pre"]> = (
  ...args
) => createTag(undefined, "pre", ...args) as HTMLElementTagNameMap["pre"];
export const progress: ProgrammaticViewTag<
  HTMLElementTagNameMap["progress"]
> = (...args) =>
  createTag(
    undefined,
    "progress",
    ...args,
  ) as HTMLElementTagNameMap["progress"];
export const q: ProgrammaticViewTag<HTMLElementTagNameMap["q"]> = (...args) =>
  createTag(undefined, "q", ...args) as HTMLElementTagNameMap["q"];
export const rp: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "rp", ...args) as HTMLElementTagNameMap["rp"];
export const rt: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "rt", ...args) as HTMLElementTagNameMap["rt"];
export const ruby: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "ruby", ...args) as HTMLElementTagNameMap["ruby"];
export const s: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "s", ...args) as HTMLElementTagNameMap["s"];
export const samp: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "samp", ...args) as HTMLElementTagNameMap["samp"];
export const script: ProgrammaticViewTag<HTMLElementTagNameMap["script"]> = (
  ...args
) => createTag(undefined, "script", ...args) as HTMLElementTagNameMap["script"];
export const search: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "search", ...args) as HTMLElementTagNameMap["search"];
export const section: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "section", ...args) as HTMLElementTagNameMap["section"];
export const select: ProgrammaticViewTag<HTMLElementTagNameMap["select"]> = (
  ...args
) => createTag(undefined, "select", ...args) as HTMLElementTagNameMap["select"];
export const slot: ProgrammaticViewTag<HTMLElementTagNameMap["slot"]> = (
  ...args
) => createTag(undefined, "slot", ...args) as HTMLElementTagNameMap["slot"];
export const small: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "small", ...args) as HTMLElementTagNameMap["small"];
export const source: ProgrammaticViewTag<HTMLElementTagNameMap["source"]> = (
  ...args
) => createTag(undefined, "source", ...args) as HTMLElementTagNameMap["source"];
export const span: ProgrammaticViewTag<HTMLElementTagNameMap["span"]> = (
  ...args
) => createTag(undefined, "span", ...args) as HTMLElementTagNameMap["span"];
export const strong: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "strong", ...args) as HTMLElementTagNameMap["strong"];
export const style: ProgrammaticViewTag<HTMLElementTagNameMap["style"]> = (
  ...args
) => createTag(undefined, "style", ...args) as HTMLElementTagNameMap["style"];
export const sub: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "sub", ...args) as HTMLElementTagNameMap["sub"];
export const summary: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "summary", ...args) as HTMLElementTagNameMap["summary"];
export const sup: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "sup", ...args) as HTMLElementTagNameMap["sup"];
export const table: ProgrammaticViewTag<HTMLElementTagNameMap["table"]> = (
  ...args
) => createTag(undefined, "table", ...args) as HTMLElementTagNameMap["table"];
export const tbody: ProgrammaticViewTag<HTMLElementTagNameMap["tbody"]> = (
  ...args
) => createTag(undefined, "tbody", ...args) as HTMLElementTagNameMap["tbody"];
export const td: ProgrammaticViewTag<HTMLElementTagNameMap["td"]> = (...args) =>
  createTag(undefined, "td", ...args) as HTMLElementTagNameMap["td"];
export const template: ProgrammaticViewTag<
  HTMLElementTagNameMap["template"]
> = (...args) =>
  createTag(
    undefined,
    "template",
    ...args,
  ) as HTMLElementTagNameMap["template"];
export const textarea: ProgrammaticViewTag<
  HTMLElementTagNameMap["textarea"]
> = (...args) =>
  createTag(
    undefined,
    "textarea",
    ...args,
  ) as HTMLElementTagNameMap["textarea"];
export const tfoot: ProgrammaticViewTag<HTMLElementTagNameMap["tfoot"]> = (
  ...args
) => createTag(undefined, "tfoot", ...args) as HTMLElementTagNameMap["tfoot"];
export const th: ProgrammaticViewTag<HTMLElementTagNameMap["th"]> = (...args) =>
  createTag(undefined, "th", ...args) as HTMLElementTagNameMap["th"];
export const thead: ProgrammaticViewTag<HTMLElementTagNameMap["thead"]> = (
  ...args
) => createTag(undefined, "thead", ...args) as HTMLElementTagNameMap["thead"];
export const time: ProgrammaticViewTag<HTMLElementTagNameMap["time"]> = (
  ...args
) => createTag(undefined, "time", ...args) as HTMLElementTagNameMap["time"];
export const title: ProgrammaticViewTag<HTMLElementTagNameMap["title"]> = (
  ...args
) => createTag(undefined, "title", ...args) as HTMLElementTagNameMap["title"];
export const tr: ProgrammaticViewTag<HTMLElementTagNameMap["tr"]> = (...args) =>
  createTag(undefined, "tr", ...args) as HTMLElementTagNameMap["tr"];
export const track: ProgrammaticViewTag<HTMLElementTagNameMap["track"]> = (
  ...args
) => createTag(undefined, "track", ...args) as HTMLElementTagNameMap["track"];
export const u: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "u", ...args) as HTMLElementTagNameMap["u"];
export const ul: ProgrammaticViewTag<HTMLElementTagNameMap["ul"]> = (...args) =>
  createTag(undefined, "ul", ...args) as HTMLElementTagNameMap["ul"];
export const varTag: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "var", ...args) as HTMLElementTagNameMap["var"];
export const video: ProgrammaticViewTag<HTMLElementTagNameMap["video"]> = (
  ...args
) => createTag(undefined, "video", ...args) as HTMLElementTagNameMap["video"];
export const wbr: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "wbr", ...args) as HTMLElementTagNameMap["wbr"];
// HTMLElementDeprecatedTagNameMap
export const acronym: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "acronym",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["acronym"];
export const applet: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["applet"]
> = (...args) =>
  createTag(
    undefined,
    "applet",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["applet"];
export const basefont: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "basefont",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["basefont"];
export const bgsound: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["bgsound"]
> = (...args) =>
  createTag(
    undefined,
    "bgsound",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["bgsound"];
export const big: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "big",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["big"];
export const blink: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["blink"]
> = (...args) =>
  createTag(
    undefined,
    "blink",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["blink"];
export const center: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "center",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["center"];
export const dir: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["dir"]
> = (...args) =>
  createTag(
    undefined,
    "dir",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["dir"];
export const font: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["font"]
> = (...args) =>
  createTag(
    undefined,
    "font",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["font"];
export const frame: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["frame"]
> = (...args) =>
  createTag(
    undefined,
    "frame",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["frame"];
export const frameset: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["frameset"]
> = (...args) =>
  createTag(
    undefined,
    "frameset",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["frameset"];
export const isindex: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["isindex"]
> = (...args) =>
  createTag(
    undefined,
    "isindex",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["isindex"];
export const keygen: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["keygen"]
> = (...args) =>
  createTag(
    undefined,
    "keygen",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["keygen"];
export const listing: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["listing"]
> = (...args) =>
  createTag(
    undefined,
    "listing",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["listing"];
export const marquee: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["marquee"]
> = (...args) =>
  createTag(
    undefined,
    "marquee",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["marquee"];
export const menuitem: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "menuitem",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["menuitem"];
export const multicol: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["multicol"]
> = (...args) =>
  createTag(
    undefined,
    "multicol",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["multicol"];
export const nextid: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["nextid"]
> = (...args) =>
  createTag(
    undefined,
    "nextid",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["nextid"];
export const nobr: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "nobr",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["nobr"];
export const noembed: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "noembed",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["noembed"];
export const noframes: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "noframes",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["noframes"];
export const param: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["param"]
> = (...args) =>
  createTag(
    undefined,
    "param",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["param"];
export const plaintext: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "plaintext",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["plaintext"];
export const rb: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "rb", ...args) as HTMLElementDeprecatedTagNameMap["rb"];
export const rtc: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "rtc",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["rtc"];
export const spacer: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["spacer"]
> = (...args) =>
  createTag(
    undefined,
    "spacer",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["spacer"];
export const strike: ProgrammaticViewTag = (...args) =>
  createTag(
    undefined,
    "strike",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["strike"];
export const tt: ProgrammaticViewTag = (...args) =>
  createTag(undefined, "tt", ...args) as HTMLElementDeprecatedTagNameMap["tt"];
export const xmp: ProgrammaticViewTag<
  HTMLElementDeprecatedTagNameMap["xmp"]
> = (...args) =>
  createTag(
    undefined,
    "xmp",
    ...args,
  ) as HTMLElementDeprecatedTagNameMap["xmp"];

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

function disposeLinkedChildrenGroups(
  groups: readonly LinkedChildState[][],
): void {
  const disposedRecords = new Set<CompiledFragmentRecord>();
  const records: CompiledFragmentRecord[] = [];

  for (let groupIndex = groups.length - 1; groupIndex >= 0; groupIndex--) {
    const children = groups[groupIndex];

    for (let index = children.length - 1; index >= 0; index--) {
      const child = children[index];

      child._disposeBindings();

      for (
        let recordIndex = child._records.length - 1;
        recordIndex >= 0;
        recordIndex--
      ) {
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

      for (
        let nodeIndex = child._nodes.length - 1;
        nodeIndex >= 0;
        nodeIndex--
      ) {
        const node = child._nodes[nodeIndex];

        if (node instanceof Element) dealoc(node);
        node.parentNode?.removeChild(node);
      }
    }

    children.length = 0;
  }
}

function disposeLinkedChildren(children: LinkedChildState[]): void {
  disposeLinkedChildrenGroups([children]);
}

function linkChildValue(
  value: ProgrammaticViewChild,
  parent: Node,
  anchor: Node,
  runtime: ProgrammaticBindingRuntime,
): LinkedChildState[] {
  return linkMaterializedChildren(
    materializeProgrammaticView(value),
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
    let cursor = anchor;
    let alreadyPlaced = true;

    for (let nodeIndex = linkedNodes.length - 1; nodeIndex >= 0; nodeIndex--) {
      const linkedNode = linkedNodes[nodeIndex];

      if (
        linkedNode.parentNode !== parent ||
        linkedNode.nextSibling !== cursor
      ) {
        alreadyPlaced = false;
        break;
      }

      cursor = linkedNode;
    }

    for (let nodeIndex = 0; nodeIndex < linkedNodes.length; nodeIndex++) {
      const linkedNode = linkedNodes[nodeIndex];

      if (!alreadyPlaced) parent.insertBefore(linkedNode, anchor);
    }

    children.push({
      _nodes: linkedNodes,
      _records: uniqueRecords(linkedNodes),
      _disposeBindings: activateProgrammaticBindings(linkedNodes, runtime),
    });
  }

  return children;
}

function activateChildBinding(
  anchor: Node,
  read: () => ProgrammaticViewChild,
  runtime: ProgrammaticBindingRuntime,
): () => void {
  const linkedChildren: LinkedChildState[] = [];

  const stop = observeScopeExpression(
    runtime._scope,
    read,
    (value) => {
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
        ...linkChildValue(
          value as ProgrammaticViewChild,
          parent,
          anchor,
          runtime,
        ),
      );
    },
    false,
  );

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
  let observedItems: unknown[] = [];
  let stablePrefixLength = 0;
  let removedIndex = -1;
  let swappedIndexes: [number, number] | undefined;
  let observedArray: unknown[] | undefined;
  let lastSeenArrayMutationVersion = 0;

  const stop = observeScopeExpression(
    runtime._scope,
    () => {
      const value = binding._read();

      if (value === null || value === undefined) {
        stablePrefixLength = 0;
        removedIndex = -1;
        swappedIndexes = undefined;
        observedArray = undefined;
        if (observedItems.length !== 0) observedItems = [];

        return observedItems;
      }

      if (isArray(value)) {
        const length = value.length;
        const mutationMeta =
          observedArray === value ? getArrayMutationMeta(value) : undefined;

        if (
          mutationMeta &&
          mutationMeta._version > lastSeenArrayMutationVersion &&
          mutationMeta._previousLength === observedItems.length &&
          mutationMeta._currentLength === length
        ) {
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

          if (
            mutationMeta._kind === "splice" &&
            mutationMeta._deleteCount === 0 &&
            mutationMeta._index === mutationMeta._previousLength
          ) {
            stablePrefixLength = mutationMeta._previousLength;
            removedIndex = -1;
            swappedIndexes = undefined;
            observedItems = value.slice();

            return observedItems;
          }

          if (
            mutationMeta._kind === "splice" &&
            mutationMeta._deleteCount === 1 &&
            mutationMeta._insertCount === 0
          ) {
            stablePrefixLength = mutationMeta._index;
            removedIndex = mutationMeta._index;
            swappedIndexes = undefined;
            observedItems = value.slice();

            return observedItems;
          }
        }

        let index = 0;

        while (
          index < length &&
          index < observedItems.length &&
          Object.is(observedItems[index], value[index])
        ) {
          index++;
        }

        stablePrefixLength = index;
        removedIndex = -1;
        swappedIndexes = undefined;

        if (index === length && index === observedItems.length) {
          return observedItems;
        }

        if (
          observedItems.length === length + 1 &&
          index < observedItems.length
        ) {
          let suffixIndex = index;

          while (
            suffixIndex < length &&
            Object.is(observedItems[suffixIndex + 1], value[suffixIndex])
          ) {
            suffixIndex++;
          }

          if (suffixIndex === length) removedIndex = index;
        } else if (observedItems.length === length && index < length) {
          let secondIndex = index + 1;

          while (
            secondIndex < length &&
            Object.is(observedItems[secondIndex], value[secondIndex])
          ) {
            secondIndex++;
          }

          if (
            secondIndex < length &&
            Object.is(observedItems[index], value[secondIndex]) &&
            Object.is(observedItems[secondIndex], value[index])
          ) {
            let suffixIndex = secondIndex + 1;

            while (
              suffixIndex < length &&
              Object.is(observedItems[suffixIndex], value[suffixIndex])
            ) {
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

      let nextItems: unknown[] | undefined;
      let index = 0;

      stablePrefixLength = 0;
      removedIndex = -1;
      swappedIndexes = undefined;
      observedArray = undefined;

      for (const item of value) {
        if (nextItems) {
          nextItems.push(item);
        } else if (
          index >= observedItems.length ||
          !Object.is(observedItems[index], item)
        ) {
          nextItems = observedItems.slice(0, index);
          nextItems.push(item);
        }

        index++;
      }

      if (nextItems) {
        observedItems = nextItems;
      } else if (index !== observedItems.length) {
        observedItems = observedItems.slice(0, index);
      }

      return observedItems;
    },
    (value) => {
      const parent = anchor.parentNode;

      if (!parent) return;

      const items = value as unknown[];
      const retainedLength = states.size;
      const indexToRemove = removedIndex;
      const indexesToSwap = swappedIndexes;

      removedIndex = -1;
      swappedIndexes = undefined;

      if (indexesToSwap && retainedLength === items.length) {
        const leftIndex = indexesToSwap[0];
        const rightIndex = indexesToSwap[1];
        let leftState: KeyedChildState | undefined;
        let rightState: KeyedChildState | undefined;

        for (const state of states.values()) {
          if (state._index === leftIndex) leftState = state;
          else if (state._index === rightIndex) rightState = state;

          if (leftState && rightState) break;
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
        let removedState: KeyedChildState | undefined;

        for (const state of states.values()) {
          if (state._index === indexToRemove) {
            removedState = state;
          } else if (state._index > indexToRemove) {
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
        const replacementKeys = new Array<PropertyKey>(items.length);
        const seenReplacementKeys = new Set<PropertyKey>();
        let isDisjointReplacement = true;

        for (let index = 0; index < items.length; index++) {
          const key = binding._key(items[index]);

          if (seenReplacementKeys.has(key)) {
            throw new TypeError(
              `Duplicate programmatic view key '${String(key)}'.`,
            );
          }

          if (states.has(key)) {
            isDisjointReplacement = false;
            break;
          }

          seenReplacementKeys.add(key);
          replacementKeys[index] = key;
        }

        if (isDisjointReplacement) {
          const replacements = new Array<{
            readonly _holder: { value: unknown };
            readonly _nodes: readonly Node[];
          }>(items.length);

          for (let index = 0; index < items.length; index++) {
            const item = items[index];
            const holder = createScope(
              { value: item },
              runtime._scope._handler,
            ) as { value: unknown };

            replacements[index] = {
              _holder: holder,
              _nodes: materializeProgrammaticView(
                binding._render(() => holder.value),
              ),
            };
          }

          const removedChildren = new Array<LinkedChildState[]>(retainedLength);
          let removedIndex = 0;

          for (const state of states.values()) {
            removedChildren[removedIndex++] = state._children;
          }

          detachKeyedStateRange(states.values(), anchor);
          disposeLinkedChildrenGroups(removedChildren);
          states = new Map<PropertyKey, KeyedChildState>();

          for (let index = 0; index < items.length; index++) {
            const item = items[index];
            const key = replacementKeys[index];
            const replacement = replacements[index];
            const children = linkMaterializedChildren(
              replacement._nodes,
              parent,
              anchor,
              runtime,
            );

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

      if (
        stablePrefixLength === retainedLength &&
        items.length > retainedLength
      ) {
        const appendedLength = items.length - retainedLength;
        const appendedKeys = new Array<PropertyKey>(appendedLength);
        const seenAppendedKeys = new Set<PropertyKey>();

        for (let index = retainedLength; index < items.length; index++) {
          const key = binding._key(items[index]);

          if (states.has(key) || seenAppendedKeys.has(key)) {
            throw new TypeError(
              `Duplicate programmatic view key '${String(key)}'.`,
            );
          }

          seenAppendedKeys.add(key);
          appendedKeys[index - retainedLength] = key;
        }

        for (let index = retainedLength; index < items.length; index++) {
          const item = items[index];
          const key = appendedKeys[index - retainedLength];
          const holder = createScope(
            { value: item },
            runtime._scope._handler,
          ) as { value: unknown };
          const children = linkMaterializedChildren(
            materializeProgrammaticView(binding._render(() => holder.value)),
            parent,
            anchor,
            runtime,
          );

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

      const plan = planKeyedReconciliation(
        items,
        states,
        binding._key,
        (state) => state._index,
        (item) => {
          const holder = createScope(
            { value: item },
            runtime._scope._handler,
          ) as { value: unknown };

          return {
            _holder: holder,
            _nodes: materializeProgrammaticView(
              binding._render(() => holder.value),
            ),
          };
        },
      );
      const nextStates = new Map<PropertyKey, KeyedChildState>();
      const removedChildren = plan.removed.map((state) => state._children);

      if (plan.entries.length === 0) {
        detachKeyedStateRange(states.values(), anchor);
      }
      disposeLinkedChildrenGroups(removedChildren);

      for (let index = 0; index < plan.entries.length; index++) {
        const descriptor = plan.entries[index];
        let state: KeyedChildState;

        if (descriptor.kind === "reused") {
          state = descriptor.previous;

          if (!Object.is(state._value, descriptor.value)) {
            state._holder.value = descriptor.value;
          }
        } else {
          state = {
            _key: descriptor.key,
            _value: descriptor.value,
            _holder: descriptor.created._holder,
            _children: linkMaterializedChildren(
              descriptor.created._nodes,
              parent,
              anchor,
              runtime,
            ),
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
        } else {
          if (indexInPrevious < lastPreviousIndex || sawNewState) {
            needsPlacement = true;
          }

          lastPreviousIndex = indexInPrevious;
        }
      }

      if (!needsPlacement) return;

      let cursor: Node = anchor;
      const orderedStates = Array.from(states.values());
      const stableIndexes = plan.stable;

      for (
        let stateIndex = orderedStates.length - 1;
        stateIndex >= 0;
        stateIndex--
      ) {
        const children = orderedStates[stateIndex]._children;
        const move = stableIndexes[stateIndex] === 0;

        for (
          let childIndex = children.length - 1;
          childIndex >= 0;
          childIndex--
        ) {
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
    },
    false,
  );

  return () => {
    stop();

    disposeLinkedChildrenGroups(
      Array.from(states.values(), (state) => state._children),
    );

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
    const multipleBindings = isArray(bindings);
    const bindingCount = multipleBindings ? bindings.length : 1;

    for (let index = 0; index < bindingCount; index++) {
      const binding = multipleBindings ? bindings[index] : bindings;

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
          observeScopeExpression(
            runtime._scope,
            binding._read,
            (value) => {
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
            },
            false,
          ),
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

  const childNodes = node.childNodes;

  if (childNodes.length === 0) return;

  if (childNodes.length === 1) {
    activateNodeBindings(childNodes[0], runtime, disposers);

    return;
  }

  const snapshot = Array.from(childNodes);

  for (let index = 0; index < snapshot.length; index++) {
    activateNodeBindings(snapshot[index], runtime, disposers);
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
      const $compile = options.injector.get(
        _compile,
      ) as ProgrammaticCompileService;
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

      const context: ProgrammaticViewContext = {
        controller,
        required: requiredControllers as ProgrammaticViewContext["required"],
        scope,
        host: element,
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
      const rawNodes = materializeProgrammaticView(
        value as ProgrammaticViewChild,
      );
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
            const linkOptions = {
              _futureParentElement: parent,
              _ownsNodes: true,
            } as const;
            const directlyLinked = $compile._linkProgrammaticNode
              ? $compile._linkProgrammaticNode(node, scope, linkOptions)
              : $compile(node)(scope, undefined, linkOptions);

            if (directlyLinked === null) return [node];

            return normalizeLinkResult(directlyLinked);
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
