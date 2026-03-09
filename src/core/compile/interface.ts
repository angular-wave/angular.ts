import type { Scope } from "../scope/scope.ts";
import type { NodeRef } from "../../shared/noderef.ts";
import type { SanitizeUriProvider } from "../sanitize/sanitize-uri.ts";
import type {
  Component,
  DirectiveLinkFn,
  DirectivePrePost,
} from "../../interface.ts";
import type { Attributes } from "./attributes.ts";
import type { ControllerLocals } from "../controller/controller.ts";

export type TranscludedNodes = Node | Node[] | NodeList | null;
export type ChildTranscludeOrLinkFn = TranscludeFn | PublicLinkFn;

/**
 * Parsed binding metadata for one isolate-scope or bind-to-controller property.
 */
export interface IsolateBinding {
  mode: "@" | "&" | "=" | "<";
  collection: boolean;
  optional: boolean;
  attrName: string;
}

/**
 * Map of public binding names to their parsed binding descriptors.
 */
export type IsolateBindingMap = Record<string, IsolateBinding>;

/**
 * Cached binding metadata attached to a directive definition.
 */
export interface ParsedDirectiveBindings {
  isolateScope: IsolateBindingMap | Record<string, never> | null;
  bindToController: IsolateBindingMap | null;
}

/**
 * Registry of directive factories keyed by normalized directive name.
 */
export type DirectiveRegistry = Record<string, ng.DirectiveFactory[]>;

/**
 * Injector-backed cache of resolved directive definition arrays.
 */
export type DirectiveLookupCache = Record<
  string,
  InternalDirective[] | undefined
>;

/**
 * Overloaded registration API exposed by `$compileProvider.directive(...)`.
 */
export type RegisterDirectiveFn = {
  (name: string, directiveFactory: ng.DirectiveFactory): any;
  (name: Record<string, ng.DirectiveFactory>, directiveFactory?: never): any;
};

/**
 * Overloaded registration API exposed by `$compileProvider.component(...)`.
 */
export type RegisterComponentFn = {
  (name: string, options: Component): any;
  (name: Record<string, Component>, options?: never): any;
};

/**
 * Getter/setter surface for compile provider URL sanitization configuration.
 */
export type TrustedUrlListAccessor = (
  regexp?: RegExp,
) => RegExp | SanitizeUriProvider | undefined;

/**
 * Getter/setter surface for strict component binding enforcement.
 */
export type StrictComponentBindingsAccessor = (
  enabled?: boolean,
) => boolean | any;

/**
 * Callback used when transcluded content is cloned.
 */
export type CloneAttachFn = (
  clone?: TranscludedNodes,
  scope?: Scope | null,
) => any;

export interface TemplateLinkingFunctionOptions {
  _parentBoundTranscludeFn?: BoundTranscludeFn | null;
  _transcludeControllers?: unknown;
  _futureParentElement?: Node | Element | null | undefined;
}

/**
 * A function passed as the fifth argument to a `PublicLinkFn` link function.
 * It behaves like a linking function, with the `scope` argument automatically created
 * as a new child of the transcluded parent scope.
 *
 * The function returns the DOM content to be injected (transcluded) into the directive.
 */
export type TranscludeFn = {
  /**
   * $transclude(cloneAttachFn, futureParentElement?, slotName?)
   * (no explicit scope passed)
   */
  (
    cloneAttachFn: CloneAttachFn,
    futureParentElement?: Node | Element | null,
    slotName?: string | number,
  ): TranscludedNodes | void;

  /**
   * $transclude(scope?, cloneAttachFn?, futureParentElement?, slotName?)
   * (scope-first form)
   */
  (
    scope?: Scope | null,
    cloneAttachFn?: CloneAttachFn,
    futureParentElement?: Node | Element | null,
    slotName?: string | number,
  ): TranscludedNodes | void;

  /**
   * Internal call path that threads link options.
   */
  (
    scope?: Scope | null,
    cloneAttachFn?: CloneAttachFn,
    options?: TemplateLinkingFunctionOptions,
  ): TranscludedNodes | void;

  /** Slot transclusion functions (if the parent declared slots). */
  _slots?: Record<string | number, TranscludeFn | null>;

  /** Added by your `controllersBoundTransclude` wrapper. */
  isSlotFilled?: (slotName: string | number) => boolean;

  /** Internal: unwraps to the bound transclude when threaded through link options. */
  _boundTransclude?: BoundTranscludeFn;
};

/**
 * A specialized version of `TranscludeFn` with the parent scope already bound.
 * Used internally to thread controller context and future parent elements.
 */
export interface BoundTranscludeFn {
  (
    transcludedScope?: Scope | null,
    cloneAttachFn?: CloneAttachFn,
    controllers?: unknown,
    futureParentElement?: Node | Element | null,
    containingScope?: Scope,
  ): TranscludedNodes | void;

  _slots: Record<string | number, BoundTranscludeFn | null>;
  _boundTransclude?: BoundTranscludeFn;
}

export type SlotTranscludeFn = BoundTranscludeFn;

/**
 * Represents a simple change in a watched value.
 */
export interface SimpleChange {
  currentValue: any;
  firstChange: boolean;
}

/**
 * Binding setup result returned by `initializeDirectiveBindings(...)`.
 */
export interface DirectiveBindingInfo {
  initialChanges: Record<string, SimpleChange>;
  removeWatches?: () => void;
}

/**
 * A function returned by the `$compile` service that links a compiled template to a scope.
 */
export type PublicLinkFn = {
  (
    scope: Scope,
    cloneAttachFn?: CloneAttachFn,
    options?: TemplateLinkingFunctionOptions,
  ): Element | Node | ChildNode | Node[];
  pre?: any;
  post?: any;
};

/**
 * Entry point for the `$compile` service.
 */
export type CompileFn = (
  compileNode: string | Element | Node | ChildNode | NodeList | null,
  transcludeFn?: ChildTranscludeOrLinkFn | null,
  maxPriority?: number,
  ignoreDirective?: string,
  previousCompileContext?: any, // TODO: define type if known
) => PublicLinkFn;

/**
 * Represents a mapping of linking functions.
 */
export interface LinkFnMapping {
  _index: number;
  _nodeLinkFnCtx?: NodeLinkFnCtx;
  _childLinkFn?: CompositeLinkFn | ChildLinkFn | null;
}

/**
 * Compiles a node (or list of nodes) into a single composite link function.
 *
 * For each node in `nodeRefList`:
 * 1) Collect and sort matching directives.
 * 2) Apply directives to produce an optional node link function/context.
 * 3) Recursively compile child nodes (unless a terminal directive stops recursion).
 * 4) Return a composite link function that links all nodes (and their children) in order.
 *
 * Notes:
 * - `transcludeFn` is the “thing passed down” to directives as `$transclude`. Depending on phase,
 *   it may be a `TranscludeFn` (real transclusion function), a `PublicLinkFn` (compiled link fn),
 *   or `null` (no transclusion).
 * - `previousCompileContext` carries internal bookkeeping for replace/transclusion/templateUrl and
 *   is only applied to the first node in a virtual group.
 */
export type CompileNodesFn = (
  /**
   * NodeRef wrapping either a single Node/Element or a list (e.g. NodeList/array-like).
   */
  nodeRefList: NodeRef | null,

  /**
   * Parent transclusion/link function passed down to directives and child compilation.
   */
  transcludeFn?: ChildTranscludeOrLinkFn,

  /**
   * If provided, only directives with `priority < maxPriority` are applied to the first node.
   */
  maxPriority?: number,

  /**
   * Normalized directive name to ignore on the first node (prevents re-applying the triggering directive).
   */
  ignoreDirective?: string,

  /**
   * Internal bookkeeping used across re-compilation passes (replace, element transclusion, templateUrl).
   */
  previousCompileContext?: PreviousCompileContext | null,
) => CompositeLinkFn | null;

export type ChildLinkFn = (
  scope: Scope,
  nodeRef: NodeRef,
  _parentBoundTranscludeFn: BoundTranscludeFn | null,
) => void;

/**
 * A function used to link a specific node.
 */
export type NodeLinkFn = (
  childLinkFn: ChildLinkFn | CompositeLinkFn | null | undefined,
  scope: Scope,
  node: Node | Element,
  boundTranscludeFn: BoundTranscludeFn | null,
) => void;

/**
 * Internal variant used when a shared node-link executor receives its state explicitly.
 */
export type StoredNodeLinkFn = (
  state: unknown,
  childLinkFn: ChildLinkFn | CompositeLinkFn | null | undefined,
  scope: Scope,
  node: Node | Element,
  boundTranscludeFn: BoundTranscludeFn | null,
) => void;

/**
 * Context information for a NodeLinkFn.
 */
export interface NodeLinkFnCtx {
  _nodeLinkFn: NodeLinkFn | StoredNodeLinkFn;
  _nodeLinkFnState?: unknown;
  _terminal: boolean;
  _transclude: ChildTranscludeOrLinkFn;
  _transcludeOnThisElement: boolean;
  _templateOnThisElement: boolean;
  _newScope: boolean;
}

/**
 * Stored link-function metadata used when pre/post link arrays are replayed.
 */
export interface LinkFnRecord {
  _fn: Function;
  _require?: string | Array<any> | Record<string, any>;
  _directiveName: string;
  _isolateScope: boolean;
  _linkCtx?: unknown;
}

/**
 * Internal extension used for compile-generated link functions that carry shared executor state.
 */
export interface ContextualDirectiveLinkFn<
  T = unknown,
> extends DirectiveLinkFn<any> {
  _linkCtx?: T;
}

/**
 * Internal extension used for compile-generated pre/post link objects that carry shared executor state.
 */
export interface ContextualDirectivePrePost<
  TPre = unknown,
  TPost = unknown,
> extends DirectivePrePost {
  _linkCtx?: unknown;
  _preLinkCtx?: TPre;
  _postLinkCtx?: TPost;
}

/**
 * Full set of compile-function return shapes produced by directives in this compiler.
 */
export type CompileDirectiveLinkResult =
  | ContextualDirectiveLinkFn
  | ContextualDirectivePrePost
  | void;

/**
 * Mutable state accumulated while compiling a node list into one composite link function.
 */
export interface CompositeLinkState {
  _linkFnsList: LinkFnMapping[];
  _nodeRefList: NodeRef;
  _nodeLinkFnFound?: NodeLinkFn | StoredNodeLinkFn;
  _transcludeFn: ChildTranscludeOrLinkFn | null | undefined;
}

/**
 * State required when replaying one compiled node during composite linking.
 */
export interface CompositeNodeLinkInvocationState {
  _nodeRefList: NodeRef;
  _index: number;
  _nodeLinkFnCtx?: NodeLinkFnCtx;
  _childLinkFn?: CompositeLinkFn | ChildLinkFn | null;
}

/**
 * Per-node compilation state assembled before creating the final node linker.
 */
export interface NodeLinkState {
  _compileNode: Node | Element;
  _templateAttrs: ng.Attributes;
  _transcludeFn: ChildTranscludeOrLinkFn;
  _controllerDirectives?: Record<string, InternalDirective>;
  _newIsolateScopeDirective?: InternalDirective | null;
  _newScopeDirective?: InternalDirective | null;
  _hasElementTranscludeDirective?: boolean;
  _preLinkFns: LinkFnRecord[];
  _postLinkFns: LinkFnRecord[];
}

/**
 * Deferred controller wrapper returned by `$controller(..., ..., true, ...)`.
 */
export interface ControllerInstanceRef {
  (): any;
  instance: any;
  bindingInfo?: DirectiveBindingInfo;
}

/**
 * State threaded through `controllersBoundTransclude(...)`.
 */
export interface ControllersBoundTranscludeState {
  _boundTranscludeFn: BoundTranscludeFn;
  _elementControllers: Record<string, any>;
  _hasElementTranscludeDirective?: boolean;
  _scopeToChild: Scope;
  _elementRef: NodeRef;
}

/**
 * Call signature used by the controller-aware `$transclude` wrapper created during node linking.
 */
export type ControllersBoundTranscludeFn = {
  (
    scopeParam?: Scope | CloneAttachFn,
    cloneAttachFn?: CloneAttachFn | Node | null,
    _futureParentElement?: Node | null,
    slotName?: string | number,
  ): TranscludedNodes | void;
  _boundTransclude?: BoundTranscludeFn;
  isSlotFilled?: (slotName: string | number) => boolean;
};

/**
 * Stored state for shared text-interpolation link functions.
 */
export interface TextInterpolateLinkState {
  _interpolateFn: import("../interpolate/interpolate.ts").InterpolationFunction;
  _watchExpression: string;
}

/**
 * Stored state for shared attribute-interpolation link functions.
 */
export interface AttrInterpolateLinkState {
  _name: string;
  _value: string;
  _trustedContext: string | undefined;
  _allOrNothing: boolean;
  _interpolateFn?: import("../interpolate/interpolate.ts").InterpolationFunction;
}

/**
 * Stored state for `ng-prop-*` pre-link handlers.
 */
export interface PropertyDirectiveLinkState {
  _attrName: string;
  _propName: string;
  _ngPropGetter: Function;
  _sanitizer: Function;
}

/**
 * Controller instances collected for one element during linking.
 */
export type ElementControllers = Record<string, ControllerInstanceRef>;

/**
 * Transclude value used during node linking after controller-aware wrapping may be applied.
 */
export type NodeLinkTranscludeFn =
  | ChildTranscludeOrLinkFn
  | ControllersBoundTranscludeFn;

/**
 * Compile-time context passed into `setupControllers(...)`.
 */
export interface ControllerSetupState {
  _controllerDirectives: Record<string, InternalDirective>;
  _newIsolateScopeDirective?: InternalDirective | null;
}

/**
 * Controller locals assembled by `$compile` before delegating to `$controller(...)`.
 */
export interface CompileControllerLocals extends ControllerLocals {
  $attrs: Attributes;
  $transclude: TranscludeFn;
}

/**
 * Bookkeeping used while an async `templateUrl` directive resolves and replays queued links.
 */
export interface DelayedTemplateLinkState {
  _linkQueue: DelayedTemplateLinkQueue | null;
  _afterTemplateChildLinkFn: CompositeLinkFn | null;
  _afterTemplateNodeLinkFnCtx?: NodeLinkFnCtx;
  _beforeTemplateCompileNode: Node | Element;
  _compileNodeRef: NodeRef;
  _compiledNode?: Element;
  _origAsyncDirective: InternalDirective;
  _previousCompileContext: PreviousCompileContext;
}

/**
 * Temporary replacement-template state while an async `templateUrl` response is normalized.
 */
export interface DelayedTemplateReplacementState {
  _templateNodes: Element[];
  _templateAttrs: Attributes;
}

/**
 * One queued link request recorded before an async templateUrl has resolved.
 */
export type DelayedTemplateLinkQueueEntry = [
  Scope | undefined,
  Node | Element,
  BoundTranscludeFn | null | undefined,
];

/**
 * Queue of delayed template link requests, flattened in insertion order.
 */
export type DelayedTemplateLinkQueue = DelayedTemplateLinkQueueEntry[];

/**
 * Minimal node-link context returned by `compileTemplateUrl(...)` before the template resolves.
 */
export interface DelayedTemplateNodeLinkResult {
  _nodeLinkFn: StoredNodeLinkFn;
  _nodeLinkFnState: DelayedTemplateLinkState;
}

/**
 * Function that applies directives to a node and returns a NodeLinkFn.
 */
export type ApplyDirectivesToNodeFn = () => NodeLinkFn;

/**
 * Function that aggregates all linking functions for a compilation root (nodeList).
 */
export type CompositeLinkFn = (
  scope: Scope,
  $linkNode: NodeRef,
  _parentBoundTranscludeFn?: BoundTranscludeFn | null,
) => void;

/**
 * Internal compile bookkeeping passed through compile/compileNodes/applyDirectivesToNode.
 * Used to preserve state across re-compilation passes (replace, transclusion, templateUrl),
 * and to coordinate virtual-group indexing.
 */
export interface PreviousCompileContext {
  /** Index of the current node inside the parent NodeRef list (virtual group position). */
  _index?: number;

  /** The parent NodeRef list that the current node belongs to (used when replaced nodes must be re-indexed). */
  _parentNodeRef?: NodeRef;

  /**
   * Mutable NodeRef pointing at the “current” compile node for this context.
   * Updated when directives replace or element-transclude the node (e.g. comment anchor).
   */
  _ctxNodeRef?: NodeRef;

  /**
   * When true, linking must create a fresh scope anchor because a parent replace+transclusion
   * removed the element that would normally hold the transclusion scope.
   * Consumed by `publicLinkFn` to do `scope.$parent?.$new()` in that edge case.
   */
  _needsNewScope?: boolean;

  /**
   * True if an element-transcluding directive has been applied (transclude === "element").
   * Affects how controllers/transclusion are resolved and how templateUrl linking re-attaches nodes.
   */
  _hasElementTranscludeDirective?: boolean;

  /**
   * The directive that requested “non-terminal” (non-TLB) transclusion most recently.
   * Used to detect and throw on multiple transclusion directives on the same element
   * (except whitelisted ones like ngIf/ngRepeat).
   */
  _nonTlbTranscludeDirective?: ng.Directive | null;

  /**
   * A “future” parent element passed through transclusion/linking so that namespace detection
   * and transcluded node insertion can use the correct DOM parent (especially with replace/element transclusion).
   */
  _futureParentElement?: Node | Element | null;

  /**
   * Map of directive-name -> directive definition for directives on this element that declare controllers.
   * Carried forward so controllers can be instantiated once and then wired during linking.
   */
  _controllerDirectives?: Record<string, ng.Directive> | null;

  /**
   * The directive responsible for creating a new child scope on this element (scope: true).
   * Carried forward so templates/directives can be marked to inherit scope correctly after replace/transclusion.
   */
  _newScopeDirective?: ng.Directive | null;

  /**
   * The directive responsible for creating an isolate scope on this element (scope: {}).
   * Carried forward so template directives can be marked and so linking can create the isolate scope once.
   */
  _newIsolateScopeDirective?: ng.Directive | null;

  /**
   * The directive that provided the active template/templateUrl for this element.
   * Used to prevent multiple template directives and to coordinate replace/templateUrl compilation passes.
   */
  _templateDirective?: ng.Directive | null;
}

/**
 * An internal augmentation of a directive definition object (DDO) used by the compiler.
 *
 * This extends `ng.Directive` with fields that AngularTS attaches during directive registration
 * and compilation (e.g. sorting metadata, binding caches, template bookkeeping).
 */
export interface InternalDirective extends ng.Directive {
  /**
   * Normalized directive name (camelCase), e.g. `ngIf`.
   * Typically set during registration.
   */
  name: string;

  /**
   * Directive priority used to order directive application during compilation.
   * Higher priorities run first.
   */
  priority?: number;

  /**
   * Registration index (used as a stable tiebreaker when priorities and names match).
   */
  index?: number;

  /**
   * Parsed bindings metadata for isolate scope and/or bindToController.
   * Populated by the compiler to avoid re-parsing.
   */
  _bindings?: any;

  /**
   * Parsed isolate-scope binding definitions (e.g. `{ foo: '@', bar: '=' }` expanded form).
   * Typically derived from `_bindings.isolateScope`.
   */
  _isolateBindings?: any;

  /**
   * Marks that this directive (or one it was merged into) requires an isolate scope.
   * Used for bookkeeping across template/replace/transclusion compilation passes.
   */
  _isolateScope?: boolean;

  /**
   * Marks that this directive (or one it was merged into) requires a new child scope.
   * Used for bookkeeping across template/replace/transclusion compilation passes.
   */
  _newScope?: boolean;

  /**
   * When an async `templateUrl` directive is converted into a derived sync directive,
   * this points back to the original directive.
   */
  _originalDirective?: any;

  /**
   * Template namespace hint (e.g. `"svg"`), used when wrapping templates or compiling
   * non-HTML content.
   */
  templateNamespace?: string;
}
