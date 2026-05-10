import {
  _controller,
  _exceptionHandler,
  _injector,
  _interpolate,
  _parse,
  _provide,
  _scope,
  _templateRequest,
} from "../../injection-tokens.ts";
import {
  createDocumentFragment,
  createElementFromHTML,
  createNodelistFromHTML,
  deleteCacheData,
  emptyElement,
  FUTURE_PARENT_ELEMENT_KEY,
  getBooleanAttrName,
  getCacheData,
  getInheritedData,
  isTextNode,
  setCacheData,
  setIsolateScope,
  setScope,
  startingTag,
} from "../../shared/dom.ts";
import { NodeType } from "../../shared/node.ts";
import { NodeRef } from "../../shared/noderef.ts";
import { identifierForController } from "../controller/controller.ts";
import { createScope, type Scope } from "../scope/scope.ts";
import { getSecurityAdapter } from "../security/security-adapter.ts";
import {
  assign,
  assertArg,
  assertNotHasOwnProperty,
  deProxy,
  directiveNormalize,
  equals,
  extend,
  getNodeName,
  hasOwn,
  inherit,
  isError,
  isScope,
  createErrorFactory,
  nullObject,
  simpleCompare,
  stringify,
  trim,
  uppercase,
} from "../../shared/utils.ts";
import { SCE_CONTEXTS, type SceContext } from "../../services/sce/context.ts";
import { PREFIX_REGEXP } from "../../shared/constants.ts";
import {
  createEventDirective,
  createWindowEventDirective,
} from "../../directive/events/events.ts";
import { Attributes } from "./attributes.ts";
import { ngObserveDirective } from "../../directive/observe/observe.ts";
import type { Component } from "../../interface.ts";
import type { InterpolationFunction } from "../interpolate/interpolate.ts";
import type { CompiledExpression } from "../parse/parse.ts";

export type TranscludedNodes =
  | Node
  | Node[]
  | NodeList
  | DocumentFragment
  | null;

export type ChildTranscludeOrLinkFn = TranscludeFn | PublicLinkFn;

/**
 * Callback used when transcluded content is cloned.
 */
export type CloneAttachFn = (
  clone?: TranscludedNodes,
  scope?: Scope | null,
) => any;

export interface TemplateLinkingFunctionOptions {
  /** @internal */
  _parentBoundTranscludeFn?: BoundTranscludeFn | null;
  /** @internal */
  _transcludeControllers?: unknown;
  /** @internal */
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
  /** @internal */
  _slots?: Record<string | number, TranscludeFn | null>;

  /** Added by your `controllersBoundTransclude` wrapper. */
  isSlotFilled?: (slotName: string | number) => boolean;

  /** Internal: unwraps to the bound transclude when threaded through link options. */
  /** @internal */
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

  /** @internal */
  _slots: Record<string | number, BoundTranscludeFn | null>;
  /** @internal */
  _boundTransclude?: BoundTranscludeFn;
  /** @internal */
  _state?: unknown;
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
  /** @internal */
  _state?: unknown;
};

/**
 * Entry point for the `$compile` service.
 */
export type CompileFn = (
  compileNode: string | Element | Node | ChildNode | NodeList | null,
  transcludeFn?: ChildTranscludeOrLinkFn | null,
  maxPriority?: number,
  ignoreDirective?: string,
  previousCompileContext?: any,
) => PublicLinkFn;

/**
 * Represents a mapping of linking functions.
 */
export interface TemplateLinkMapping {
  /** @internal */
  _index: number;
  /** @internal */
  _nodeLinkPlan?: NodeLinkPlan;
  /** @internal */
  _childLinkExecutor?: ChildLinkFn | TemplateLinkExecutor | null;
}

export type LinkFnMapping = TemplateLinkMapping;

export interface TemplateNodePlan {
  /** @internal */
  _index: number;
  /** @internal */
  _nodeRefList: NodeRef | null;
  /** @internal */
  _nodeLinkPlan?: NodeLinkPlan;
  /** @internal */
  _childLinkExecutor?: ChildLinkFn | TemplateLinkExecutor | null;
}

/**
 * Plans a template node list and returns the executor used during linking.
 */
export type CompileTemplateFn = (
  nodeRefList: TemplatePlanNodeList | null,
  transcludeFn?: ChildTranscludeOrLinkFn,
  maxPriority?: number,
  ignoreDirective?: string,
  previousCompileContext?: PreviousCompileContext | null,
) => TemplateLinkExecutor | null;

export type CompileNodesFn = CompileTemplateFn;

export type ChildLinkFn = (
  scope: Scope,
  nodeRef: TemplatePlanNodeList,
  _parentBoundTranscludeFn: BoundTranscludeFn | null,
) => void;

/**
 * A function used to link a specific node.
 */
export type NodeLinkExecutor = (
  childLinkExecutor: ChildLinkFn | TemplateLinkExecutor | null | undefined,
  scope: Scope,
  node: Node | Element,
  boundTranscludeFn: BoundTranscludeFn | null,
) => void;

export type NodeLinkFn = NodeLinkExecutor;

/**
 * Internal variant used when a shared node-link executor receives its state explicitly.
 */
export type StoredNodeLinkExecutor = (
  state: unknown,
  childLinkExecutor: ChildLinkFn | TemplateLinkExecutor | null | undefined,
  scope: Scope,
  node: Node | Element,
  boundTranscludeFn: BoundTranscludeFn | null,
) => void;

export type StoredNodeLinkFn = StoredNodeLinkExecutor;

/**
 * Context information for a node link executor.
 */
export interface NodeLinkPlan {
  /** @internal */
  _nodeLinkFn: NodeLinkExecutor | StoredNodeLinkExecutor;
  /** @internal */
  _nodeLinkFnState?: unknown;
  /** @internal */
  _terminal: boolean;
  /** @internal */
  _transclude: ChildTranscludeOrLinkFn;
  /** @internal */
  _transcludeOnThisElement: boolean;
  /** @internal */
  _templateOnThisElement: boolean;
  /** @internal */
  _newScope: boolean;
}

export type NodeLinkFnCtx = NodeLinkPlan;

/**
 * Function that applies directives to a node and returns a node link executor.
 */
export type ApplyDirectivesToNodeFn = () => NodeLinkExecutor;

/**
 * Function that aggregates all linking functions for a compilation root (nodeList).
 */
export type CompositeLinkFn = (
  scope: Scope,
  $linkNode: TemplatePlanNodeList,
  _parentBoundTranscludeFn?: BoundTranscludeFn | null,
) => void;

export type TemplateLinkExecutor = CompositeLinkFn;

export type TemplatePlanNode = Element | Node | ChildNode;

export type TemplatePlanNodeList = NodeRef | NodeList;

/**
 * Internal compile bookkeeping passed through compile/compileTemplate/applyDirectivesToNode.
 */
export interface PreviousCompileContext {
  /** @internal */
  _index?: number;
  /** @internal */
  _parentNodeRef?: NodeRef;
  /** @internal */
  _ctxNodeRef?: NodeRef;
  /** @internal */
  _needsNewScope?: boolean;
  /** @internal */
  _hasElementTranscludeDirective?: boolean;
  /** @internal */
  _nonTlbTranscludeDirective?: ng.Directive | null;
  /** @internal */
  _futureParentElement?: Node | Element | null;
  /** @internal */
  _controllerDirectives?: Record<string, ng.Directive> | null;
  /** @internal */
  _newScopeDirective?: ng.Directive | null;
  /** @internal */
  _newIsolateScopeDirective?: ng.Directive | null;
  /** @internal */
  _templateDirective?: ng.Directive | null;
}

export interface DirectiveCompileEffectState {
  /** @internal */
  _newScopeDirective?: InternalDirective | null;
  /** @internal */
  _controllerDirectives?: Record<string, InternalDirective> | null;
  /** @internal */
  _newIsolateScopeDirective?: InternalDirective | null;
  /** @internal */
  _didScanForMultipleTransclusion: boolean;
  /** @internal */
  _mightHaveMultipleTransclusionError: boolean;
}

export interface AsyncTemplatePlan {
  /** @internal */
  readonly _url: string;
  /** @internal */
  readonly _namespace?: string;
  /** @internal */
  readonly _replace: boolean;
  /** @internal */
  readonly _directiveName: string;
}

export interface TransclusionContentPlan {
  /** @internal */
  _nodes: NodeList | DocumentFragment;
  /** @internal */
  _slots: Record<string, any>;
}

export interface ElementTransclusionDirectiveResult {
  /** @internal */
  _compileNode: Node | Element;
  /** @internal */
  _compileNodeRef: NodeRef;
  /** @internal */
  _childTranscludeFn: ChildTranscludeOrLinkFn;
  /** @internal */
  _terminalPriority: number;
}

export interface TransclusionDirectiveResult {
  /** @internal */
  _compileNode: Node | Element;
  /** @internal */
  _compileNodeRef: NodeRef;
  /** @internal */
  _childTranscludeFn: ChildTranscludeOrLinkFn;
  /** @internal */
  _hasTranscludeDirective: boolean;
  /** @internal */
  _hasElementTranscludeDirective: boolean;
  /** @internal */
  _nonTlbTranscludeDirective: ng.Directive | null | undefined;
  /** @internal */
  _terminalPriority: number;
}

export interface TemplateReplacementDirectiveResult {
  /** @internal */
  _directives: InternalDirective[];
  /** @internal */
  _directiveCount: number;
}

export interface InlineTemplateDirectiveResult {
  /** @internal */
  _compileNode: Node | Element;
  /** @internal */
  _directives: InternalDirective[];
  /** @internal */
  _directiveCount: number;
  /** @internal */
  _templateDirective: InternalDirective;
  /** @internal */
  _replaceDirective: InternalDirective | null | undefined;
}

export interface TemplateUrlDirectiveResult {
  /** @internal */
  _nodeLinkFn: StoredNodeLinkExecutor;
  /** @internal */
  _nodeLinkFnState: DelayedTemplateLinkState;
  /** @internal */
  _templateDirective: InternalDirective;
  /** @internal */
  _replaceDirective: InternalDirective | null | undefined;
  /** @internal */
  _directiveCount: number;
}

const EMPTY_DIRECTIVE_MATCHES: DirectiveMatchList = [];

const EMPTY_DIRECTIVE_DEFINITIONS: InternalDirective[] = [];

/**
 * An internal augmentation of a directive definition object (DDO) used by the compiler.
 */
export interface InternalDirective extends ng.Directive {
  name: string;
  priority?: number;
  index?: number;
  /** @internal */
  _bindings?: any;
  /** @internal */
  _isolateBindings?: any;
  /** @internal */
  _isolateScope?: boolean;
  /** @internal */
  _newScope?: boolean;
  /** @internal */
  _originalDirective?: any;
  /** @internal */
  _restrictElement?: boolean;
  /** @internal */
  _restrictAttribute?: boolean;
  /** @internal */
  _mayHaveBindings?: boolean;
  templateNamespace?: string;
}

export interface IsolateBinding {
  /** @internal */
  _mode: string;
  /** @internal */
  _collection: boolean;
  /** @internal */
  _optional: boolean;
  /** @internal */
  _attrName: string;
}

export type IsolateBindingMap = Record<string, IsolateBinding>;

export interface ParsedDirectiveBindings {
  /** @internal */
  _isolateScope: IsolateBindingMap | null;
  /** @internal */
  _bindToController: IsolateBindingMap | null;
}

const EMPTY_PARSED_DIRECTIVE_BINDINGS: ParsedDirectiveBindings = Object.freeze({
  _isolateScope: null,
  _bindToController: null,
});

export type DirectiveFactoryRegistry = Record<string, ng.DirectiveFactory[]>;

export type DirectiveDefinitionCache = Record<string, InternalDirective[]>;

export type DirectiveMatchList = InternalDirective[];

export type DirectiveRegistry = DirectiveFactoryRegistry;

export type DirectiveLookupCache = DirectiveDefinitionCache;

export type DirectiveMatchLocation = "E" | "A";

export type RegisterDirectiveFn = (
  name: string | Record<string, ng.DirectiveFactory>,
  directiveFactory?: ng.DirectiveFactory,
) => any;

export type RegisterComponentFn = (
  name: string | Record<string, Component>,
  options?: Component,
) => any;

export type StrictComponentBindingsAccessor = (
  enabled?: boolean,
) => boolean | any;

export interface DirectiveBindingInfo {
  /** @internal */
  _initialChanges: Record<string, SimpleChange>;
  /** @internal */
  _removeWatches?: () => void;
}

export interface OnChangesQueueState {
  /** @internal */
  _exceptionHandler: (error: any) => void;
  /** @internal */
  _queue: DirectiveBindingChangeState[];
  /** @internal */
  _flush: () => void;
}

export interface DirectiveBindingChangeState {
  /** @internal */
  _changes?: Record<string, SimpleChange>;
  /** @internal */
  _destAny: Record<string, any>;
  /** @internal */
  _onChangesQueue: OnChangesQueueState;
  /** @internal */
  _scope: Scope;
}

export interface TwoWayBindingState {
  /** @internal */
  _attrName: string;
  /** @internal */
  _attrsAny: Record<string, any>;
  /** @internal */
  _compare: (left: any, right: any) => boolean;
  /** @internal */
  _destAny: Record<string, any>;
  /** @internal */
  _destinationTarget: Record<string, any>;
  /** @internal */
  _directiveName: string;
  /** @internal */
  _lastValue: any;
  /** @internal */
  _parentGet: any;
  /** @internal */
  _parentSet: any;
  /** @internal */
  _scope: Scope;
  /** @internal */
  _scopeName: string;
  /** @internal */
  _scopeTarget: Record<string, any>;
}

export interface StringBindingState {
  /** @internal */
  _bindingChangeState: DirectiveBindingChangeState;
  /** @internal */
  _destAny: Record<string, any>;
  /** @internal */
  _firstCall: boolean;
  /** @internal */
  _firstChange: boolean;
  /** @internal */
  _scopeName: string;
}

export interface OneWayBindingState {
  /** @internal */
  _bindingChangeState: DirectiveBindingChangeState;
  /** @internal */
  _destAny: Record<string, any>;
  /** @internal */
  _firstChange: boolean;
  /** @internal */
  _lastInputs?: any[];
  /** @internal */
  _literal: boolean;
  /** @internal */
  _parentGet: any;
  /** @internal */
  _scopeName: string;
  /** @internal */
  _scopeTarget: Record<string, any>;
}

export interface CompileControllerLocals {
  $scope: Scope;
  $element: Node;
  $attrs: Attributes;
  $transclude: ng.TranscludeFn;
}

export type ControllerInstanceRef = (() => any) & {
  /** @internal */
  _instance: any;
  /** @internal */
  _bindingInfo?: DirectiveBindingInfo;
};

export type ElementControllers = Record<string, ControllerInstanceRef>;

export type NodeLinkTranscludeFn =
  | ChildTranscludeOrLinkFn
  | ControllersBoundTranscludeFn
  | ng.TranscludeFn;

export interface TextInterpolateLinkState {
  /** @internal */
  _interpolateFn: InterpolationFunction;
  /** @internal */
  _watchExpression: string;
  /** @internal */
  _singleExpression?: boolean;
}

export interface TextInterpolationBindingState {
  /** @internal */
  _linkState: TextInterpolateLinkState;
  /** @internal */
  _scope: Scope;
  /** @internal */
  _node: Node;
}

export interface AttrInterpolateLinkState {
  /** @internal */
  _name: string;
  /** @internal */
  _value: string;
  /** @internal */
  _trustedContext?: SceContext;
  /** @internal */
  _allOrNothing: boolean;
  /** @internal */
  _isNgAttr: boolean;
  /** @internal */
  _interpolateFn?: InterpolationFunction;
}

export interface PropertyDirectiveLinkState {
  /** @internal */
  _attrName: string;
  /** @internal */
  _propName: string;
  /** @internal */
  _ngPropGetter: CompiledExpression;
  /** @internal */
  _sanitizer: (value: any) => any;
}

export interface PropertyDirectiveCompileState {
  /** @internal */
  _attrName: string;
  /** @internal */
  _propName: string;
  /** @internal */
  _sanitizer: (value: any) => any;
}

export interface AttrInterpolationBindingState {
  /** @internal */
  _linkState: AttrInterpolateLinkState;
  /** @internal */
  _scope: Scope;
  /** @internal */
  _attr: Attributes;
  /** @internal */
  _lastValue?: string;
}

export interface PropertyDirectiveBindingState {
  /** @internal */
  _linkState: PropertyDirectiveLinkState;
  /** @internal */
  _scope: Scope;
  /** @internal */
  _element: { [x: string]: any };
  /** @internal */
  _attr: Attributes;
}

export interface ExpressionBindingState {
  /** @internal */
  _parentGet?: CompiledExpression;
  /** @internal */
  _scopeTarget: any;
}

export interface LazyCompilationState {
  /** @internal */
  _compiled?: ng.PublicLinkFn;
  /** @internal */
  _nodes: NodeList | Node | null;
  /** @internal */
  _transcludeFn?: ChildTranscludeOrLinkFn | null;
  /** @internal */
  _maxPriority?: number;
  /** @internal */
  _ignoreDirective?: string;
  /** @internal */
  _previousCompileContext?: {
    /** @internal */
    _nonTlbTranscludeDirective?: any;
    /** @internal */
    _needsNewScope?: any;
  } | null;
}

export type ContextualLinkFn<TLinkCtx = unknown> = ((...args: any[]) => any) & {
  /** @internal */
  _linkCtx?: TLinkCtx;
};

export interface ContextualDirectivePrePost<
  TPreLinkCtx = unknown,
  TPostLinkCtx = TPreLinkCtx,
> {
  pre?: (...args: any[]) => any;
  post?: (...args: any[]) => any;
  /** @internal */
  _linkCtx?: unknown;
  /** @internal */
  _preLinkCtx?: TPreLinkCtx;
  /** @internal */
  _postLinkCtx?: TPostLinkCtx;
}

export type CompileDirectiveLinkResult =
  | ContextualLinkFn
  | ContextualDirectivePrePost<any, any>
  | null
  | undefined;

export interface LinkFnRecord {
  /** @internal */
  _fn: Function;
  /** @internal */
  _require: string | Array<any> | Record<string, any> | undefined;
  /** @internal */
  _directiveName: string;
  /** @internal */
  _isolateScope: boolean;
  /** @internal */
  _linkCtx?: unknown;
  /** @internal */
  _thisArg?: unknown;
}

const EMPTY_LINK_FN_RECORDS = Object.freeze([]) as unknown as LinkFnRecord[];

export interface ControllersBoundTranscludeState {
  /** @internal */
  _boundTranscludeFn: BoundTranscludeFn;
  /** @internal */
  _elementControllers: ElementControllers;
  /** @internal */
  _hasElementTranscludeDirective: boolean;
  /** @internal */
  _scopeToChild: Scope;
  /** @internal */
  _elementRef: NodeRef;
  /** @internal */
  _wrapper?: ControllersBoundTranscludeFn;
  /** @internal */
  _destroyed?: boolean;
}

export interface ControllersBoundTranscludeFn {
  (
    scopeParam?: Scope | CloneAttachFn | null,
    cloneAttachFn?: CloneAttachFn | Node | null,
    futureParentElement?: Node | null,
    slotName?: string | number,
  ): TranscludedNodes | void;
  isSlotFilled?: (slotName: string | number) => boolean;
  /** @internal */
  _boundTransclude?: BoundTranscludeFn;
  /** @internal */
  _state?: unknown;
}

export interface BoundTranscludeState {
  /** @internal */
  _scope: Scope;
  /** @internal */
  _transcludeFn: ng.TranscludeFn;
  /** @internal */
  _previousBoundTranscludeFn: BoundTranscludeFn | null;
}

const scopeOwnedNodeRefs = new WeakMap<ng.Scope, Set<NodeRef>>();

function registerScopeOwnedNodeRef(scope: ng.Scope, nodeRef: NodeRef): void {
  if (!scope || typeof scope.$on !== "function") {
    return;
  }

  let ownedNodeRefs = scopeOwnedNodeRefs.get(scope);

  if (!ownedNodeRefs) {
    ownedNodeRefs = new Set<NodeRef>();
    scopeOwnedNodeRefs.set(scope, ownedNodeRefs);

    scope.$on("$destroy", () => {
      const refs = scopeOwnedNodeRefs.get(scope);

      if (!refs) {
        return;
      }

      for (const ref of refs) {
        ref._release();
      }
      refs.clear();
      scopeOwnedNodeRefs.delete(scope);
    });
  }

  ownedNodeRefs.add(nodeRef);
}

function releaseControllersBoundTranscludeState(
  transcludeState: ControllersBoundTranscludeState,
): void {
  if (transcludeState._destroyed) {
    return;
  }

  transcludeState._destroyed = true;

  if (transcludeState._wrapper) {
    transcludeState._wrapper._boundTransclude = undefined;
    transcludeState._wrapper = undefined;
  }
  transcludeState._boundTranscludeFn = undefined as never;
  transcludeState._elementControllers = nullObject();
  transcludeState._scopeToChild = undefined as never;
  transcludeState._elementRef = undefined as never;
}

function syncControllersBoundTranscludeState(
  transcludeState: ControllersBoundTranscludeState,
  scopeToChild: Scope,
  elementControllers: ElementControllers,
  elementRef: NodeRef,
): void {
  transcludeState._scopeToChild = scopeToChild;
  transcludeState._elementControllers = elementControllers;
  transcludeState._elementRef = elementRef;
}

export interface NodeLinkState {
  /** @internal */
  _compileNode: Node | Element;
  /** @internal */
  _templateAttrs: Attributes;
  /** @internal */
  _transcludeFn: NodeLinkTranscludeFn;
  /** @internal */
  _controllerDirectives?: Record<string, InternalDirective> | null;
  /** @internal */
  _newIsolateScopeDirective?: InternalDirective | null;
  /** @internal */
  _newScopeDirective?: InternalDirective | null;
  /** @internal */
  _hasElementTranscludeDirective: boolean;
  /** @internal */
  _preLinkFns: LinkFnRecord[];
  /** @internal */
  _postLinkFns: LinkFnRecord[];
}

export interface DelayedTemplateReplacementState {
  /** @internal */
  _templateNodes: Element[];
  /** @internal */
  _templateAttrs: Attributes;
}

export type PendingTemplateLinkOperation = [
  Scope,
  Node | Element,
  BoundTranscludeFn | null | undefined,
];

export type DelayedTemplateLinkQueueEntry = PendingTemplateLinkOperation;

export type DelayedTemplateLinkQueue = Array<
  Scope | Node | Element | BoundTranscludeFn | null | undefined
>;

export interface DelayedTemplateLinkState {
  /** @internal */
  _linkQueue: DelayedTemplateLinkQueue | null;
  /** @internal */
  _directives: InternalDirective[];
  /** @internal */
  _afterTemplateNodeLinkPlan?: NodeLinkPlan;
  /** @internal */
  _afterTemplateChildLinkExecutor: TemplateLinkExecutor | ChildLinkFn | null;
  /** @internal */
  _beforeTemplateCompileNode: Node | Element;
  /** @internal */
  _childTranscludeFn: ChildTranscludeOrLinkFn;
  /** @internal */
  _compileNodeRef?: NodeRef;
  /** @internal */
  _derivedSyncDirective: InternalDirective;
  /** @internal */
  _origAsyncDirective: InternalDirective;
  /** @internal */
  _postLinkFns: LinkFnRecord[];
  /** @internal */
  _preLinkFns: LinkFnRecord[];
  /** @internal */
  _previousCompileContext: PreviousCompileContext;
  /** @internal */
  _rootElement: any;
  /** @internal */
  _tAttrs: Attributes;
  /** @internal */
  _templateUrl: string;
  /** @internal */
  _templateNamespace?: string;
  /** @internal */
  _asyncTemplatePlan: AsyncTemplatePlan;
  /** @internal */
  _compiledNode?: Element;
}

export interface DelayedTemplateNodeLinkResult {
  /** @internal */
  _nodeLinkFn: StoredNodeLinkExecutor;
  /** @internal */
  _nodeLinkFnState: DelayedTemplateLinkState;
  /** @internal */
  _asyncTemplatePlan: AsyncTemplatePlan;
}

export interface TemplateLinkPlan {
  /** @internal */
  _linkMappings: TemplateLinkMapping[];
  /** @internal */
  _nodeRefList: NodeRef | null;
  /** @internal */
  _transcludeFn?: ChildTranscludeOrLinkFn;
}

export type CompositeLinkState = TemplateLinkPlan;

export interface PublicLinkState {
  /** @internal */
  _nodeRef: NodeRef | null;
  /** @internal */
  _templateLinkExecutor: TemplateLinkExecutor | null;
  /** @internal */
  _namespace: string | null;
  /** @internal */
  _previousCompileContext?: PreviousCompileContext | null;
}

const $compileError = createErrorFactory("$compile");

const REQUIRE_PREFIX_REGEXP = /^(?:(\^\^?)?(\?)?(\^\^?)?)?/;

// Ref: http://developers.whatwg.org/webappapis.html#event-handler-idl-attributes
// The assumption is that future DOM event attribute names will begin with
// 'on' and be composed of only English letters.
const EVENT_HANDLER_ATTR_REGEXP = /^(on[a-z]+|formaction)$/;

const NG_PREFIX_BINDING = /^ng(Attr|Prop|On|Observe|Window)([A-Z].*)$/;

type NgPrefixBinding = "Attr" | "Prop" | "On" | "Observe" | "Window";

const ISOLATE_BINDING_REGEXP = /^([@&]|[=<]())(\??)\s*([\w$]*)$/;

const valueFn =
  (value: any): (() => any) =>
  () =>
    value;

export const DirectiveSuffix = "Directive";

export class CompileProvider {
  /* @ignore */ static $inject = [_provide];

  directive: RegisterDirectiveFn;
  component: RegisterComponentFn;
  strictComponentBindingsEnabled: StrictComponentBindingsAccessor;
  addPropertySecurityContext: (
    elementName: string,
    propertyName: string,
    ctx: string,
  ) => this;

  $get: any;

  /** Configures directive registration and compile-time provider behavior. */
  constructor($provide: ng.ProvideService) {
    const provider = this;

    const directiveFactoryRegistry: DirectiveFactoryRegistry = {};

    const bindingCache = nullObject() as Record<string, IsolateBinding>;

    const directiveDefinitionCache: DirectiveDefinitionCache = nullObject();

    const normalizedDirectiveNameCache = nullObject() as Record<string, string>;

    function normalizeDirectiveName(name: string): string {
      let normalizedName = normalizedDirectiveNameCache[name];

      if (normalizedName === undefined) {
        normalizedName = normalizedDirectiveNameCache[name] =
          directiveNormalize(name);
      }

      return normalizedName;
    }

    /** Parses isolate-scope or controller binding definitions for a directive. */
    function parseIsolateBindings(
      scope: Record<string, string>,
      directiveName: string,
      isController: boolean,
    ): IsolateBindingMap {
      const bindings = nullObject() as IsolateBindingMap;

      for (const scopeName in scope) {
        if (!hasOwn(scope, scopeName)) {
          continue;
        }

        let definition = scope[scopeName];

        definition = definition.trim();

        if (definition in bindingCache) {
          bindings[scopeName] = bindingCache[definition];

          continue;
        }

        const parsedBinding = parseIsolateBindingDefinition(
          definition,
          scopeName,
          directiveName,
          isController,
        );

        bindings[scopeName] = parsedBinding._binding;

        if (parsedBinding._cacheable) {
          bindingCache[definition] = parsedBinding._binding;
        }
      }

      return bindings;
    }

    function parseIsolateBindingDefinition(
      definition: string,
      scopeName: string,
      directiveName: string,
      isController: boolean,
    ): { _binding: IsolateBinding; _cacheable: boolean } {
      const match = definition.match(ISOLATE_BINDING_REGEXP);

      if (!match) {
        throw $compileError(
          "iscp",
          "Invalid {3} for directive '{0}'." +
            " Definition: {... {1}: '{2}' ...}",
          directiveName,
          scopeName,
          definition,
          isController
            ? "controller bindings definition"
            : "isolate scope definition",
        );
      }

      return {
        _binding: {
          _mode: match[1][0],
          _collection: match[2] === "*",
          _optional: match[3] === "?",
          _attrName: match[4] || scopeName,
        },
        _cacheable: !!match[4],
      };
    }

    /** Collects the parsed scope and controller binding configuration for a directive. */
    function parseDirectiveBindings(
      directive: ng.Directive,
      directiveName: string,
    ): ParsedDirectiveBindings {
      const bindings: ParsedDirectiveBindings = {
        _isolateScope: null,
        _bindToController: null,
      };

      if (directive.scope !== null && typeof directive.scope === "object") {
        if (directive.bindToController === true) {
          bindings._bindToController = parseIsolateBindings(
            directive.scope,
            directiveName,
            true,
          );
          bindings._isolateScope = {};
        } else {
          bindings._isolateScope = parseIsolateBindings(
            directive.scope,
            directiveName,
            false,
          );
        }
      }

      if (
        directive.bindToController !== null &&
        typeof directive.bindToController === "object"
      ) {
        bindings._bindToController = parseIsolateBindings(
          directive.bindToController,
          directiveName,
          true,
        );
      }

      if (bindings._bindToController && !directive.controller) {
        // There is no controller
        throw $compileError(
          "noctrl",
          "Cannot bind to controller without directive '{0}'s controller.",
          directiveName,
        );
      }

      return bindings;
    }

    /**
     * Register a new directive with the compiler.
     *
     * @param name - Name of the directive in camel-case (i.e. `ngBind` which will match
     *    as `ng-bind`), or an object map of directives where the keys are the names and the values
     *    are the factories.
     * @param directiveFactory - An injectable directive factory function. See the
     *    {@link guide/directive directive guide} and the {@link $compile compile API} for more info.
     * @returns Self for chaining.
     */
    const registerDirective = function registerDirective(
      this: CompileProvider,
      name: string | Record<string, ng.DirectiveFactory>,
      directiveFactory?: ng.DirectiveFactory,
    ) {
      assertArg(name, "name");

      if (typeof name === "string") {
        assertNotHasOwnProperty(name, "directive");
        assertValidDirectiveName(name);
        assertArg(directiveFactory, "directiveFactory");
        const normalizedDirectiveFactory =
          directiveFactory as ng.DirectiveFactory;

        if (!hasOwn(directiveFactoryRegistry, name)) {
          directiveFactoryRegistry[name] = [];
          $provide.factory(name + DirectiveSuffix, [
            _injector,
            _exceptionHandler,
            /** Instantiates and normalizes the registered directive factories for one name. */
            function (
              $injector: ng.InjectorService,
              $exceptionHandler: ng.ExceptionHandlerService,
            ) {
              const directives: InternalDirective[] = [];

              for (
                let i = 0, l = directiveFactoryRegistry[name].length;
                i < l;
                i++
              ) {
                const directiveFactoryInstance =
                  directiveFactoryRegistry[name][i];

                try {
                  let directive = $injector.invoke(
                    directiveFactoryInstance as any,
                  ) as ng.Directive | Function;

                  if (typeof directive === "function") {
                    directive = {
                      compile: valueFn(directive),
                    } as unknown as InternalDirective;
                  } else if (!directive.compile && directive.link) {
                    directive.compile = valueFn(directive.link);
                  }

                  const normalizedDirective = directive as InternalDirective;

                  normalizedDirective.priority =
                    normalizedDirective.priority || 0;
                  normalizedDirective.index = i;
                  normalizedDirective.name = normalizedDirective.name || name;
                  normalizedDirective.require =
                    getDirectiveRequire(normalizedDirective);
                  const restrict = getDirectiveRestrict(
                    normalizedDirective.restrict,
                    name,
                  );
                  normalizedDirective.restrict = restrict;
                  normalizedDirective._restrictElement =
                    restrict.indexOf("E") !== -1;
                  normalizedDirective._restrictAttribute =
                    restrict.indexOf("A") !== -1;
                  normalizedDirective._mayHaveBindings =
                    (normalizedDirective.scope !== null &&
                      typeof normalizedDirective.scope === "object") ||
                    (normalizedDirective.bindToController !== null &&
                      typeof normalizedDirective.bindToController === "object");

                  directives.push(normalizedDirective);
                } catch (err) {
                  $exceptionHandler(err);
                }
              }

              return directives;
            },
          ]);
        }
        directiveFactoryRegistry[name].push(normalizedDirectiveFactory);
        delete directiveDefinitionCache[name];
      } else {
        for (const key in name) {
          if (hasOwn(name, key)) {
            provider.directive(key, name[key] as ng.DirectiveFactory);
          }
        }
      }

      return provider;
    } as RegisterDirectiveFn;

    this.directive = registerDirective;

    /**
     * @param name - Name of the component in camelCase (i.e. `myComp` which will match `<my-comp>`),
     *    or an object map of components where the keys are the names and the values are the component definition objects.
     * @param options - Component definition object (a simplified
     *    {directive definition object}),
     *    with the following properties (all optional):
     *
     *    - `controller` – `{(string|function()=}` – controller constructor function that should be
     *      associated with newly created scope or the name of a {controller} if passed as a string. An empty `noop` function by default.
     *    - `controllerAs` – `{string=}` – identifier name for to reference the controller in the component's scope.
     *      If present, the controller will be published to scope under the `controllerAs` name.
     *      If not present, this will default to be `$ctrl`.
     *    - `template` – `{string=|function()=}` – html template as a string or a function that
     *      returns an html template as a string which should be used as the contents of this component.
     *      Empty string by default.
     *
     *      If `template` is a function, then it is {injected} with
     *      the following locals:
     *
     *      - `$element` - Current element
     *      - `$attrs` - Current attributes object for the element
     *
     *    - `templateUrl` – `{string=|function()=}` – path or function that returns a path to an html
     *      template that should be used  as the contents of this component.
     *
     *      If `templateUrl` is a function, then it is {injected} with
     *      the following locals:
     *
     *      - `$element` - Current element
     *      - `$attrs` - Current attributes object for the element
     *
     *    - `bindings` – `{object=}` – defines bindings between DOM attributes and component properties.
     *      Component properties are always bound to the component controller and not to the scope.
     *      See {`bindToController`}.
     *    - `transclude` – `{boolean=}` – whether {content transclusion} is enabled.
     *      Disabled by default.
     *    - `require` - `{Object<string, string>=}` - requires the controllers of other directives and binds them to
     *      this component's controller. The object keys specify the property names under which the required
     *      controllers (object values) will be bound. See {`require`}.
     *    - `$...` – additional properties to attach to the directive factory function and the controller
     *      constructor function. (This is used by the component router to annotate)
     *
     * @returns The compile provider itself, for chaining of function calls.
     */
    const registerComponent = function registerComponent(
      this: CompileProvider,
      name: string | Record<string, Component>,
      options?: Component,
    ) {
      if (typeof name !== "string") {
        for (const key in name) {
          if (hasOwn(name, key)) {
            provider.component(key, name[key] as Component);
          }
        }

        return provider;
      }

      const componentOptions = options as Component;

      const controller =
        componentOptions.controller ||
        function () {
          /* empty */
        };

      /** Creates the component-backed directive definition factory. */
      function factory($injector: ng.InjectorService) {
        /** Wraps injectable component options so `$element` and `$attrs` are available. */
        const makeInjectable = (
          fn: string | Function | ng.AnnotatedFactory<any> | undefined,
        ) => {
          if (typeof fn === "function" || Array.isArray(fn)) {
            return (tElement: HTMLElement, tAttrs: ng.Attributes) => {
              return $injector.invoke(fn, null, {
                $element: tElement,
                $attrs: tAttrs,
              });
            };
          }

          return fn;
        };

        const template =
          !componentOptions.template && !componentOptions.templateUrl
            ? ""
            : componentOptions.template;

        const ddo: ng.Directive = {
          controller,
          controllerAs:
            identifierForController(componentOptions.controller) ||
            componentOptions.controllerAs ||
            "$ctrl",
          template: makeInjectable(template),
          templateUrl: makeInjectable(componentOptions.templateUrl),
          transclude: componentOptions.transclude,
          scope: {},
          bindToController: componentOptions.bindings || {},
          restrict: "E",
          require: componentOptions.require,
        };

        // Copy annotations (starting with $) over to the DDO
        for (const key in componentOptions) {
          if (key.charAt(0) === "$") {
            const val = componentOptions[key as keyof Component];

            (ddo as Record<string, any>)[key] = val;
          }
        }

        return ddo;
      }

      // Copy any annotation properties (starting with $) over to the factory and controller constructor functions
      // These could be used by libraries such as the new component router
      for (const key in componentOptions) {
        if (key.charAt(0) === "$") {
          const val = componentOptions[key as keyof Component];

          (factory as Record<string, any>)[key] = val;

          // Don't try to copy over annotations to named controller
          if (typeof controller === "function") {
            (controller as Record<string, any>)[key] = val;
          }
        }
      }

      factory.$inject = [_injector];

      return provider.directive(
        name,
        factory as unknown as ng.DirectiveFactory,
      );
    } as RegisterComponentFn;

    this.component = registerComponent;

    /**
     * @param enabled - Update the strictComponentBindingsEnabled state if provided,
     * otherwise return the current strictComponentBindingsEnabled state.
     * @returns Current value if used as getter or itself (chaining) if used as setter.
     *
     * Call this method to enable / disable the strict component bindings check. If enabled, the
     * compiler will enforce that all scope / controller bindings of a
     * {@link $compileProvider#directive} / {@link $compileProvider#component}
     * that are not set as optional with `?`, must be provided when the directive is instantiated.
     * If not provided, the compiler will throw the
     * {@link error/$compile/missingattr $compile:missingattr error}.
     *
     * The default value is false.
     */
    let strictComponentBindingsEnabled = false;

    this.strictComponentBindingsEnabled =
      /** @param enabled */
      function (enabled?: boolean) {
        if (enabled !== undefined) {
          strictComponentBindingsEnabled = enabled;

          return this;
        }

        return strictComponentBindingsEnabled;
      };

    /**
     * The security context of DOM Properties.
     */
    const PROP_CONTEXTS = nullObject() as Record<string, SceContext>;

    const LEGACY_SCE_CONTEXTS: Record<string, SceContext> = {
      html: SCE_CONTEXTS._HTML,
      mediaUrl: SCE_CONTEXTS._MEDIA_URL,
      resourceUrl: SCE_CONTEXTS._RESOURCE_URL,
      url: SCE_CONTEXTS._URL,
    };

    /**
     * Defines the security context for DOM properties bound by ng-prop-*.
     *
     * @param elementName - The element name or '*' to match any element.
     * @param propertyName - The DOM property name.
     * @param ctx - The security context in which this value is safe for use, e.g. `url`
     * @returns `this` for chaining.
     */
    this.addPropertySecurityContext = function (
      elementName: string,
      propertyName: string,
      ctx: string,
    ) {
      const normalizedCtx = LEGACY_SCE_CONTEXTS[ctx] || ctx;

      const key = `${elementName.toLowerCase()}|${propertyName.toLowerCase()}`;

      if (key in PROP_CONTEXTS && PROP_CONTEXTS[key] !== normalizedCtx) {
        throw $compileError(
          "ctxoverride",
          "Property context '{0}.{1}' already set to '{2}', cannot override to '{3}'.",
          elementName,
          propertyName,
          PROP_CONTEXTS[key],
          normalizedCtx,
        );
      }

      PROP_CONTEXTS[key] = normalizedCtx as SceContext;

      return this;
    };

    /* Default property contexts.
     *
     * Copy of https://github.com/angular/angular/blob/6.0.6/packages/compiler/src/schema/dom_security_schema.ts#L31-L58
     * Changing:
     * - SecurityContext.* => AngularTS security contexts
     * - various URL => MEDIA_URL
     * - *|formAction, form|action URL => RESOURCE_URL (like the attribute)
     */
    (function registerNativePropertyContexts() {
      /** Registers the same security context for a list of `element|property` keys. */
      function registerContext(ctx: SceContext, items: string[]) {
        for (let i = 0, l = items.length; i < l; i++) {
          PROP_CONTEXTS[items[i].toLowerCase()] = ctx;
        }
      }

      registerContext(SCE_CONTEXTS._HTML, [
        "iframe|srcdoc",
        "*|innerHTML",
        "*|outerHTML",
      ]);
      registerContext(SCE_CONTEXTS._URL, [
        "area|href",
        "area|ping",
        "a|href",
        "a|ping",
        "blockquote|cite",
        "body|background",
        "del|cite",
        "input|src",
        "ins|cite",
        "q|cite",
      ]);
      registerContext(SCE_CONTEXTS._MEDIA_URL, [
        "audio|src",
        "img|src",
        "img|srcset",
        "source|src",
        "source|srcset",
        "track|src",
        "video|src",
        "video|poster",
      ]);
      registerContext(SCE_CONTEXTS._RESOURCE_URL, [
        "*|formAction",
        "applet|code",
        "applet|codebase",
        "base|href",
        "embed|src",
        "frame|src",
        "form|action",
        "head|profile",
        "html|manifest",
        "iframe|src",
        "link|href",
        "media|src",
        "object|codebase",
        "object|data",
        "script|src",
      ]);
    })();

    this.$get = [
      _injector,
      _interpolate,
      _exceptionHandler,
      _parse,
      _controller,
      /** Creates the runtime `$compile` service and its shared helper closures. */
      (
        $injector: ng.InjectorService,
        $interpolate: ng.InterpolateService,
        $exceptionHandler: ng.ExceptionHandlerService,
        $parse: ng.ParseService,
        $controller: ng.ControllerService,
      ) => {
        const security = getSecurityAdapter($injector);

        let lazyTemplateRequest: ng.TemplateRequestService | null | undefined;

        function requestTemplate(templateUrl: string): Promise<string> {
          if (lazyTemplateRequest === undefined) {
            lazyTemplateRequest = $injector.has(_templateRequest)
              ? ($injector.get(_templateRequest) as ng.TemplateRequestService)
              : null;
          }

          return lazyTemplateRequest
            ? lazyTemplateRequest(templateUrl)
            : fetchTemplate(templateUrl);
        }

        function fetchTemplate(templateUrl: string): Promise<string> {
          return fetch(templateUrl, {
            headers: { Accept: "text/html" },
          }).then((response) => {
            if (!response.ok) {
              return Promise.reject(response);
            }

            return response.text();
          });
        }

        const onChangesQueueState: OnChangesQueueState = {
          _exceptionHandler: $exceptionHandler,
          _queue: [],
          _flush: undefined as never,
        };

        // This function is called in a $postUpdate to trigger all the onChanges hooks in a single digest
        onChangesQueueState._flush = () =>
          flushDirectiveBindingOnChangesQueue(onChangesQueueState);

        const startSymbol = $interpolate.startSymbol();

        const endSymbol = $interpolate.endSymbol();

        const denormalizeTemplate =
          startSymbol === "{{" && endSymbol === "}}"
            ? (x: string) => x
            : (x: string) =>
                x.replace(/\{\{/g, startSymbol).replace(/}}/g, endSymbol);

        function triggerDirectiveBindingOnChanges(
          state: DirectiveBindingChangeState,
        ): void {
          state._destAny.$onChanges &&
            state._changes &&
            state._destAny.$onChanges(state._changes);
          state._changes = undefined;
        }

        /** Flushes queued `$onChanges` hooks in one post-update turn. */
        function flushDirectiveBindingOnChangesQueue(
          queueState: OnChangesQueueState,
        ): void {
          const queue = queueState._queue;

          for (let i = 0, ii = queue.length; i < ii; ++i) {
            try {
              triggerDirectiveBindingOnChanges(queue[i]);
            } catch (err) {
              queueState._exceptionHandler(err);
            }
          }

          queue.length = 0;
        }

        function recordDirectiveBindingChange(
          state: DirectiveBindingChangeState,
          key: string,
          currentValue: any,
          initial: boolean,
        ): void {
          if (typeof state._destAny.$onChanges !== "function") {
            return;
          }

          if (!state._onChangesQueue._queue.length) {
            state._scope.$postUpdate(state._onChangesQueue._flush);
            state._onChangesQueue._queue.length = 0;
          }

          if (!state._changes) {
            state._changes = {};
            state._onChangesQueue._queue.push(state);
          }

          state._changes[key] = {
            currentValue,
            firstChange: initial,
          };
        }

        function removeDirectiveBindingWatches(
          removeWatchCollection: Array<Function | undefined>,
        ): void {
          for (let i = 0, ii = removeWatchCollection.length; i < ii; ++i) {
            removeWatchCollection[i]?.();
          }
        }

        function throwNonassignBindingError(state: TwoWayBindingState): never {
          throw $compileError(
            "nonassign",
            "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!",
            state._attrsAny[state._attrName],
            state._attrName,
            state._directiveName,
          );
        }

        function syncTwoWayParentValue(
          state: TwoWayBindingState,
          parentValue: any,
        ): any {
          const destValue = state._destAny[state._scopeName];

          if (!state._compare(parentValue, destValue)) {
            if (!state._compare(parentValue, state._lastValue)) {
              state._destAny[state._scopeName] = parentValue;
            } else {
              state._parentSet(
                state._scope,
                (parentValue = state._destAny[state._scopeName]),
              );
            }
          }

          state._lastValue = parentValue;

          return state._lastValue;
        }

        function handleTwoWayExpressionChange(
          state: TwoWayBindingState,
          syncParentValue: CompiledExpression,
          val: any,
        ): void {
          if (val) {
            if (state._parentGet && state._parentGet._literal) {
              state._scopeTarget[state._attrName] = val;
            } else {
              (state._scope as any)[state._attrName] = val;
            }
            syncParentValue(state._scope);
          } else {
            (state._scope as any)[state._attrName] = (state._scope as any)[
              state._attrsAny[state._attrName]
            ];
          }
        }

        function handleTwoWayDestinationChange(
          state: TwoWayBindingState,
          val: any,
        ): void {
          if (
            val === state._lastValue &&
            state._attrsAny[state._attrName] !== undefined
          ) {
            return;
          }

          if (
            (state._parentGet &&
              !!state._parentGet._inputs &&
              !state._parentGet._literal) ||
            (state._attrsAny[state._attrName] === undefined &&
              val !== undefined)
          ) {
            state._destinationTarget[state._scopeName] = state._lastValue;
            throwNonassignBindingError(state);
          }

          if (val !== null && typeof val === "object") {
            for (const key in val) {
              if (!hasOwn(val, key)) {
                continue;
              }

              state._scopeTarget[key] = val[key];
            }

            return;
          }

          state._parentSet(state._scopeTarget, (state._lastValue = val));
          const attributeWatchers = state._scope.$handler._watchers.get(
            state._attrsAny[state._attrName],
          );

          if (attributeWatchers) {
            for (let i = 0, l = attributeWatchers.length; i < l; i++) {
              attributeWatchers[i]._listenerFn(val, state._scope.$target);
            }
          }
        }

        function handleStringBindingObserve(
          state: StringBindingState,
          value: any,
        ): void {
          if (typeof value !== "string" && typeof value !== "boolean") {
            return;
          }

          recordDirectiveBindingChange(
            state._bindingChangeState,
            state._scopeName,
            value,
            state._firstChange,
          );

          state._destAny[state._scopeName] = value;

          if (state._firstCall) {
            state._firstCall = false;

            return;
          }

          triggerDirectiveBindingOnChanges(state._bindingChangeState);
          state._firstChange = false;
        }

        function handleOneWayBindingChange(
          state: OneWayBindingState,
          val: any,
        ): void {
          if (state._literal) {
            const inputs = evaluateOneWayBindingInputs(state);

            if (inputs && state._lastInputs) {
              let sameInputs = inputs.length === state._lastInputs.length;

              for (let i = 0, l = inputs.length; sameInputs && i < l; i++) {
                sameInputs = simpleCompare(inputs[i], state._lastInputs[i]);
              }

              if (sameInputs) {
                return;
              }
            }

            state._lastInputs = inputs;
          }

          state._destAny.$target[state._scopeName] =
            state._literal || val === null || typeof val !== "object"
              ? val
              : createScope(val, state._bindingChangeState._scope.$handler);

          recordDirectiveBindingChange(
            state._bindingChangeState,
            state._scopeName,
            state._destAny.$target[state._scopeName],
            state._firstChange,
          );

          if (state._firstChange) {
            state._firstChange = false;
          }
        }

        function evaluateOneWayBindingInputs(
          state: OneWayBindingState,
        ): any[] | undefined {
          const inputs = state._parentGet?._inputs;

          if (!Array.isArray(inputs)) {
            return undefined;
          }

          const values = new Array(inputs.length);

          for (let i = 0, l = inputs.length; i < l; i++) {
            values[i] = inputs[i](state._scopeTarget);
          }

          return values;
        }

        function invokePublicLink(
          state: PublicLinkState,
          scope: Scope,
          cloneConnectFn?: CloneAttachFn,
          options?: TemplateLinkingFunctionOptions,
        ) {
          const { _nodeRef: nodeRef } = state;

          if (!nodeRef) {
            throw $compileError(
              "multilink",
              "This element has already been linked.",
            );
          }

          if (state._previousCompileContext?._needsNewScope) {
            // A parent directive did a replace and a directive on this element asked
            // for transclusion, which caused us to lose a layer of element on which
            // we could hold the new transclusion scope, so we will create it manually
            // here.
            scope = scope.$parent?.$new() || scope.$new();
          }

          options = options || {};
          let { _parentBoundTranscludeFn } = options;

          const { _transcludeControllers, _futureParentElement } = options;

          if (
            _parentBoundTranscludeFn &&
            _parentBoundTranscludeFn._boundTransclude
          ) {
            _parentBoundTranscludeFn =
              _parentBoundTranscludeFn._boundTransclude;
          }

          if (!state._namespace) {
            state._namespace =
              detectNamespaceForChildElements(_futureParentElement);
          }

          let $linkNode: NodeRef;

          if (state._namespace !== "html") {
            const fragment = createElementFromHTML("<div></div>");

            fragment.append(nodeRef.node);
            const wrappedTemplate = wrapTemplate(
              state._namespace,
              fragment.innerHTML,
            );

            $linkNode = new NodeRef(wrappedTemplate[0]);
          } else if (cloneConnectFn) {
            $linkNode = nodeRef._clone();
          } else {
            $linkNode = nodeRef;
          }

          if ($linkNode._element) {
            setScope($linkNode._element, scope);

            if (_futureParentElement) {
              setCacheData(
                $linkNode._element,
                FUTURE_PARENT_ELEMENT_KEY,
                _futureParentElement,
              );
            }
          }

          if (cloneConnectFn) {
            registerScopeOwnedNodeRef(scope, $linkNode);
          }

          if (_transcludeControllers) {
            const controllers = _transcludeControllers as Record<
              string,
              /** @internal */
              { _instance: any }
            >;

            for (const controllerName in controllers) {
              const linkElement = $linkNode._element as Element;

              setCacheData(
                linkElement,
                `$${controllerName}Controller`,
                controllers[controllerName]._instance,
              );
            }
          }

          if (cloneConnectFn) {
            cloneConnectFn($linkNode.dom, scope);
          }

          if (state._templateLinkExecutor) {
            state._templateLinkExecutor(
              scope,
              $linkNode,
              _parentBoundTranscludeFn,
            );
          }

          if (!cloneConnectFn) {
            state._nodeRef = null;
            state._templateLinkExecutor = null;
          }

          return $linkNode._getAll();
        }

        function executeTemplateLinkPlan(
          plan: TemplateLinkPlan,
          scope: Scope,
          nodeRef: TemplatePlanNodeList,
          _parentBoundTranscludeFn?: BoundTranscludeFn | null,
        ): void {
          const stableNodeList = buildStableNodeList(plan, nodeRef);

          executeTemplateLinkMappings(
            plan,
            stableNodeList,
            scope,
            _parentBoundTranscludeFn || null,
          );
        }

        function invokeBoundTransclude(
          state: BoundTranscludeState,
          transcludedScope?: Scope | null,
          cloneFn?: CloneAttachFn,
          controllers?: unknown,
          _futureParentElement?: Node | Element | null,
          containingScope?: Scope,
        ) {
          if (!transcludedScope) {
            transcludedScope = state._scope.$transcluded(containingScope);
          }

          return state._transcludeFn(transcludedScope, cloneFn, {
            _parentBoundTranscludeFn: state._previousBoundTranscludeFn,
            _transcludeControllers: controllers,
            _futureParentElement,
          });
        }

        return compile;

        function compile(
          element: Parameters<CompileFn>[0],
          transcludeFn?: Parameters<CompileFn>[1],
          maxPriority?: Parameters<CompileFn>[2],
          ignoreDirective?: Parameters<CompileFn>[3],
          previousCompileContext?: Parameters<CompileFn>[4],
        ): PublicLinkFn {
          const publicLinkState = createPublicLinkState(
            element,
            previousCompileContext,
          );

          publicLinkState._templateLinkExecutor = compileTemplate(
            publicLinkState._nodeRef,
            transcludeFn || undefined,
            maxPriority,
            ignoreDirective,
            previousCompileContext,
          );

          return createPublicLinkFn(publicLinkState);
        }

        function createPublicLinkState(
          element: Parameters<CompileFn>[0],
          previousCompileContext?: Parameters<CompileFn>[4],
        ): PublicLinkState {
          return {
            _nodeRef: element ? new NodeRef(element) : null,
            _templateLinkExecutor: null,
            _namespace: null,
            _previousCompileContext: previousCompileContext || null,
          };
        }

        function createPublicLinkFn(
          publicLinkState: PublicLinkState,
        ): PublicLinkFn {
          const publicLinkFn = function publicLinkFn(
            scope: Scope,
            cloneConnectFn?: CloneAttachFn,
            options?: TemplateLinkingFunctionOptions,
          ) {
            return invokePublicLink(
              (publicLinkFn as PublicLinkFn & { _state?: PublicLinkState })
                ._state as PublicLinkState,
              scope,
              cloneConnectFn,
              options,
            );
          } as PublicLinkFn;

          publicLinkFn._state = publicLinkState;

          return publicLinkFn;
        }

        /**
         * Runs node-level and child-level link functions for one compiled node list using precomputed mapping state.
         */
        function executeTemplateLinkMappings(
          plan: TemplateLinkPlan,
          stableNodeList: Node[],
          scope: Scope,
          _parentBoundTranscludeFn: BoundTranscludeFn | null,
        ): void {
          for (let i = 0, l = plan._linkMappings.length; i < l; i++) {
            executeTemplateLinkMapping(
              plan,
              plan._linkMappings[i],
              stableNodeList[i],
              scope,
              _parentBoundTranscludeFn,
            );
          }
        }

        function executeTemplateLinkMapping(
          plan: TemplateLinkPlan,
          mapping: TemplateLinkMapping,
          node: Node,
          scope: Scope,
          _parentBoundTranscludeFn: BoundTranscludeFn | null,
        ): void {
          const { _nodeLinkPlan, _childLinkExecutor } = mapping;

          let childScope: Scope;

          let childBoundTranscludeFn: BoundTranscludeFn | null;

          if (_nodeLinkPlan) {
            childScope = _nodeLinkPlan._newScope ? scope.$new() : scope;

            if (_nodeLinkPlan._transcludeOnThisElement) {
              childBoundTranscludeFn = createBoundTranscludeFn(
                scope,
                _nodeLinkPlan._transclude as ng.TranscludeFn,
                _parentBoundTranscludeFn || null,
              );
            } else if (
              !_nodeLinkPlan._templateOnThisElement &&
              _parentBoundTranscludeFn
            ) {
              childBoundTranscludeFn = _parentBoundTranscludeFn;
            } else if (!_parentBoundTranscludeFn && plan._transcludeFn) {
              childBoundTranscludeFn = createBoundTranscludeFn(
                scope,
                plan._transcludeFn as ng.TranscludeFn,
                null,
              );
            } else {
              childBoundTranscludeFn = null;
            }

            if (
              _nodeLinkPlan._newScope &&
              node.nodeType === NodeType._ELEMENT_NODE
            ) {
              setScope(node, childScope);
            }

            if (_nodeLinkPlan._nodeLinkFnState !== undefined) {
              (_nodeLinkPlan._nodeLinkFn as StoredNodeLinkExecutor)(
                _nodeLinkPlan._nodeLinkFnState,
                _childLinkExecutor,
                childScope,
                node,
                childBoundTranscludeFn,
              );
            } else {
              (_nodeLinkPlan._nodeLinkFn as NodeLinkExecutor)(
                _childLinkExecutor,
                childScope,
                node,
                childBoundTranscludeFn,
              );
            }
          } else if (_childLinkExecutor) {
            _childLinkExecutor(
              scope,
              node.childNodes,
              _parentBoundTranscludeFn,
            );
          }
        }

        function isNodeRef(value: TemplatePlanNodeList): value is NodeRef {
          return value instanceof NodeRef;
        }

        function getTemplateNodeCount(nodes: TemplatePlanNodeList): number {
          return isNodeRef(nodes) ? nodes.size : nodes.length;
        }

        function getTemplateNodeAt(
          nodes: TemplatePlanNodeList,
          index: number,
        ): TemplatePlanNode {
          return isNodeRef(nodes) ? nodes._getIndex(index) : nodes[index];
        }

        function getPlanningNodeAt(
          nodes: TemplatePlanNodeList,
          nodeRefPlan: NodeRef | null,
          index: number,
        ): TemplatePlanNode {
          return nodeRefPlan
            ? nodeRefPlan._getIndex(index)
            : (nodes as NodeList)[index];
        }

        function ensureCompileNodeRef(nodes: TemplatePlanNodeList): NodeRef {
          return isNodeRef(nodes) ? nodes : new NodeRef(nodes);
        }

        function createEmptyAttributes(): Attributes {
          return new Attributes($injector, $exceptionHandler);
        }

        /**
         * Plans a template node list and returns the executor used during linking.
         */
        function compileTemplate(
          nodeRefList: Parameters<CompileTemplateFn>[0],
          transcludeFn?: Parameters<CompileTemplateFn>[1],
          maxPriority?: Parameters<CompileTemplateFn>[2],
          ignoreDirective?: Parameters<CompileTemplateFn>[3],
          previousCompileContext?: Parameters<CompileTemplateFn>[4],
        ): ReturnType<CompileTemplateFn> {
          const plan = planTemplate(
            nodeRefList,
            transcludeFn,
            maxPriority,
            ignoreDirective,
            previousCompileContext,
          );

          return plan ? createTemplateLinkExecutor(plan) : null;
        }

        function planTemplate(
          nodeRefList: TemplatePlanNodeList | null,
          transcludeFn?: ChildTranscludeOrLinkFn,
          maxPriority?: number,
          ignoreDirective?: string,
          previousCompileContext?: PreviousCompileContext | null,
        ): TemplateLinkPlan | null {
          if (!nodeRefList) return null;

          let nodeRefPlan = isNodeRef(nodeRefList) ? nodeRefList : null;

          let templatePlan: TemplateLinkPlan | null = null;

          for (let i = 0, l = getTemplateNodeCount(nodeRefList); i < l; i++) {
            const nodePlan = planNode(
              nodeRefList,
              nodeRefPlan,
              i,
              transcludeFn,
              i === 0 ? maxPriority : undefined,
              ignoreDirective,
              previousCompileContext,
            );

            if (!nodePlan) {
              previousCompileContext = null;
              continue;
            }

            nodeRefPlan = nodePlan._nodeRefList;

            templatePlan =
              templatePlan || createTemplateLinkPlan(nodeRefPlan, transcludeFn);

            applyTemplateNodePlan(templatePlan, nodePlan);

            // use the previous context only for the first element in the virtual group
            previousCompileContext = null;
          }

          return templatePlan;
        }

        function createTemplateLinkPlan(
          nodeRefList: NodeRef | null,
          transcludeFn?: ChildTranscludeOrLinkFn,
        ): TemplateLinkPlan {
          return {
            _linkMappings: [],
            _nodeRefList: nodeRefList,
            _transcludeFn: transcludeFn,
          };
        }

        function planNode(
          nodeRefList: TemplatePlanNodeList,
          templateNodeRef: NodeRef | null,
          index: number,
          transcludeFn: ChildTranscludeOrLinkFn | undefined,
          maxPriority: number | undefined,
          ignoreDirective: string | undefined,
          previousCompileContext: PreviousCompileContext | null | undefined,
        ): TemplateNodePlan | null {
          const templateNode = getPlanningNodeAt(
            nodeRefList,
            templateNodeRef,
            index,
          );

          let attrs: Attributes | undefined;

          let directives: DirectiveMatchList;

          if (templateNode.nodeType === NodeType._ELEMENT_NODE) {
            const elementDirectives: DirectiveMatchList = [];

            attrs = collectElementDirectiveMatches(
              templateNode as Element,
              attrs,
              elementDirectives,
              maxPriority,
              ignoreDirective,
            );

            directives = finalizeDirectiveMatches(elementDirectives);
          } else {
            directives = collectDirectiveMatches(
              templateNode,
              undefined,
              maxPriority,
              ignoreDirective,
            );
          }

          let nodeLinkPlan: NodeLinkPlan | undefined;

          if (directives.length) {
            attrs = attrs || createEmptyAttributes();
            templateNodeRef =
              templateNodeRef || ensureCompileNodeRef(nodeRefList);

            nodeLinkPlan = applyDirectivesToNode(
              directives,
              templateNode,
              attrs,
              transcludeFn as ChildTranscludeOrLinkFn,
              null,
              undefined,
              undefined,
              createNodePreviousCompileContext(
                previousCompileContext,
                index,
                templateNodeRef,
              ),
            );
          }

          const childLinkExecutor = planChildLinkExecutor(
            templateNode,
            templateNodeRef,
            index,
            nodeLinkPlan,
            transcludeFn,
          );

          if (!nodeLinkPlan) {
            if (!childLinkExecutor) {
              return null;
            }

            return createMinimalTemplateNodePlan(
              index,
              templateNodeRef,
              childLinkExecutor,
            );
          }

          return createTemplateNodePlan(
            index,
            templateNodeRef,
            nodeLinkPlan,
            childLinkExecutor,
          );
        }

        function createNodePreviousCompileContext(
          previousCompileContext: PreviousCompileContext | null | undefined,
          index: number,
          templateNodeRef: NodeRef,
        ): PreviousCompileContext {
          if (!previousCompileContext) {
            return {
              _index: index,
              _parentNodeRef: templateNodeRef,
              _ctxNodeRef: templateNodeRef,
            };
          }

          return assign({}, previousCompileContext, {
            _index: index,
            _parentNodeRef: templateNodeRef,
            _ctxNodeRef: templateNodeRef,
          });
        }

        function createMinimalTemplateNodePlan(
          index: number,
          templateNodeRef: NodeRef | null,
          childLinkExecutor: TemplateLinkExecutor | ChildLinkFn | null,
        ): TemplateNodePlan {
          return {
            _index: index,
            _nodeRefList: templateNodeRef,
            _childLinkExecutor: childLinkExecutor,
          };
        }

        function createTemplateNodePlan(
          index: number,
          templateNodeRef: NodeRef | null,
          nodeLinkPlan: NodeLinkPlan,
          childLinkExecutor: TemplateLinkExecutor | ChildLinkFn | null,
        ): TemplateNodePlan {
          return {
            _index: index,
            _nodeRefList: templateNodeRef,
            _nodeLinkPlan: nodeLinkPlan,
            _childLinkExecutor: childLinkExecutor,
          };
        }

        function applyTemplateNodePlan(
          templatePlan: TemplateLinkPlan,
          nodePlan: TemplateNodePlan,
        ): void {
          templatePlan._nodeRefList = nodePlan._nodeRefList;

          templatePlan._linkMappings.push(nodePlan);
        }

        function planChildLinkExecutor(
          templateNode: TemplatePlanNode,
          templateNodeRef: NodeRef | null,
          index: number,
          nodeLinkPlan: NodeLinkPlan | undefined,
          transcludeFn: ChildTranscludeOrLinkFn | undefined,
        ): TemplateLinkExecutor | ChildLinkFn | null {
          if (nodeLinkPlan && nodeLinkPlan._terminal) {
            return null;
          }

          const childParentNode = templateNodeRef
            ? templateNodeRef._getIndex(index)
            : templateNode;

          const { childNodes } = childParentNode;

          if (!childNodes || !childNodes.length) {
            return null;
          }

          const childTranscludeFn = nodeLinkPlan
            ? nodeLinkPlan._transcludeOnThisElement ||
              !nodeLinkPlan._templateOnThisElement
              ? nodeLinkPlan._transclude
              : undefined
            : transcludeFn;

          return compileTemplate(
            childNodes,
            childTranscludeFn || undefined,
            undefined,
            undefined,
            undefined,
          );
        }

        function createTemplateLinkExecutor(
          templatePlan: TemplateLinkPlan,
        ): TemplateLinkExecutor {
          if (templatePlan._linkMappings.length === 1) {
            const mapping = templatePlan._linkMappings[0];

            return function singleTemplateLinkExecutor(
              scope,
              nodeRef,
              _parentBoundTranscludeFn,
            ) {
              executeTemplateLinkMapping(
                templatePlan,
                mapping,
                getTemplateNodeAt(nodeRef, mapping._index) as Node,
                scope,
                _parentBoundTranscludeFn || null,
              );
            };
          }

          return function templateLinkExecutor(
            scope,
            nodeRef,
            _parentBoundTranscludeFn,
          ) {
            executeTemplateLinkPlan(
              templatePlan,
              scope,
              nodeRef,
              _parentBoundTranscludeFn,
            );
          };
        }

        /**
         * Prebinds a transclusion function to a parent scope and threads parent-bound transclusion context.
         */
        function createBoundTranscludeFn(
          scope: Scope,
          transcludeFn: ng.TranscludeFn,
          previousBoundTranscludeFn: BoundTranscludeFn | null = null,
        ): BoundTranscludeFn {
          const boundTranscludeState: BoundTranscludeState = {
            _scope: scope,
            _transcludeFn: transcludeFn,
            _previousBoundTranscludeFn: previousBoundTranscludeFn,
          };

          const boundTranscludeFn = function boundTranscludeFn(
            transcludedScope?: Scope | null,
            cloneFn?: CloneAttachFn,
            controllers?: unknown,
            _futureParentElement?: Node | Element | null,
            containingScope?: Scope,
          ) {
            return invokeBoundTransclude(
              (
                boundTranscludeFn as BoundTranscludeFn & {
                  _state?: BoundTranscludeState;
                }
              )._state as BoundTranscludeState,
              transcludedScope,
              cloneFn,
              controllers,
              _futureParentElement,
              containingScope,
            );
          } as BoundTranscludeFn;

          boundTranscludeFn._state = boundTranscludeState;

          // We need  to attach the transclusion slots onto the `boundTranscludeFn`
          // so that they are available inside the `controllersBoundTransclude` function
          const boundSlots = (boundTranscludeFn._slots = nullObject());

          for (const slotName in transcludeFn._slots) {
            if (transcludeFn._slots[slotName]) {
              boundSlots[slotName] = createBoundTranscludeFn(
                scope,
                transcludeFn._slots[slotName],
                previousBoundTranscludeFn,
              );
            } else {
              boundSlots[slotName] = null;
            }
          }

          return boundTranscludeFn;
        }

        /**
         * Looks for directives on the given node and adds them to the directive collection which is
         * sorted.
         *
         * @param node - Node to search.
         * @param attrs - The shared attrs object which is used to populate the normalized attributes.
         * @param maxPriority - Max directive priority.
         * @returns An array to which the directives are added. This array is sorted before the function returns.
         */
        function collectDirectiveMatches(
          node: TemplatePlanNode,
          attrs: Attributes | undefined,
          maxPriority?: number,
          ignoreDirective?: string,
        ): DirectiveMatchList {
          let directives: DirectiveMatchList | undefined;

          switch (node.nodeType) {
            case NodeType._ELEMENT_NODE /* Element */: {
              const elementDirectives: DirectiveMatchList = [];

              collectElementDirectiveMatches(
                node as Element,
                attrs,
                elementDirectives,
                maxPriority,
                ignoreDirective,
              );

              directives = finalizeDirectiveMatches(elementDirectives);

              break;
            }
            case NodeType._TEXT_NODE:
              {
                const textDirective = createTextInterpolateDirective(
                  node.nodeValue ?? "",
                );

                if (textDirective) {
                  directives = [textDirective];
                }
              }
              break;
            default:
              break;
          }

          return directives || EMPTY_DIRECTIVE_MATCHES;
        }

        function finalizeDirectiveMatches(
          directives: DirectiveMatchList,
        ): DirectiveMatchList {
          if (!directives.length) {
            return EMPTY_DIRECTIVE_MATCHES;
          }

          if (directives.length > 1) {
            directives.sort(byPriority);
          }

          return directives;
        }

        function collectElementDirectiveMatches(
          node: Element,
          attrs: Attributes | undefined,
          directives: DirectiveMatchList,
          maxPriority?: number,
          ignoreDirective?: string,
        ): Attributes | undefined {
          const nodeName = getNodeName(node);

          const normalizedNodeName = normalizeDirectiveName(nodeName);

          if (ignoreDirective !== normalizedNodeName) {
            appendDirectivesForName(
              directives,
              normalizedNodeName,
              "E",
              maxPriority,
            );
          }

          const nodeAttributes = node.attributes;

          if (nodeAttributes.length) {
            attrs = attrs || createEmptyAttributes();

            collectAttributeDirectiveMatches(
              node,
              attrs,
              directives,
              nodeAttributes,
              maxPriority,
              ignoreDirective,
            );
          }

          if (nodeName === "input" && node.getAttribute("type") === "hidden") {
            // Hidden input elements can have strange behaviour when navigating back to the page.
            node.setAttribute("autocomplete", "off");
          }

          return attrs;
        }

        function collectAttributeDirectiveMatches(
          node: Element,
          attrs: Attributes,
          directives: DirectiveMatchList,
          nodeAttributes: NamedNodeMap,
          maxPriority?: number,
          ignoreDirective?: string,
        ): void {
          for (
            let j = 0, nodeAttributesLength = nodeAttributes.length;
            j < nodeAttributesLength;
            j++
          ) {
            collectAttributeDirectiveMatch(
              node,
              attrs,
              directives,
              nodeAttributes[j],
              maxPriority,
              ignoreDirective,
            );
          }
        }

        function collectAttributeDirectiveMatch(
          node: Element,
          attrs: Attributes,
          directives: DirectiveMatchList,
          attr: Attr,
          maxPriority?: number,
          ignoreDirective?: string,
        ): void {
          let { name } = attr;

          const { value } = attr;

          let nName = normalizeDirectiveName(name.toLowerCase());

          const attrsMap = attrs.$attr;

          const ngPrefixMatch =
            nName.charCodeAt(0) === 110 && nName.charCodeAt(1) === 103
              ? NG_PREFIX_BINDING.exec(nName)
              : null;

          let isNgAttr = false;

          if (ngPrefixMatch) {
            const prefix = ngPrefixMatch[1] as NgPrefixBinding;

            isNgAttr = prefix === "Attr";

            name = name
              .replace(PREFIX_REGEXP, "")
              .toLowerCase()
              .substring(4 + prefix.length)
              .replace(/_(.)/g, (_match, letter) => uppercase(letter));

            if (prefix === "Prop" || prefix === "On" || prefix === "Window") {
              attrs[nName] = value;
              attrsMap[nName] = attr.name;

              addSpecialAttributeDirective(
                node,
                directives,
                nName,
                name,
                prefix,
              );

              return;
            }

            if (prefix === "Observe") {
              directives.push(
                createSyntheticDirective(ngObserveDirective(name, value)),
              );

              return;
            }

            // Update nName for cases where a prefix was removed.
            nName = normalizeDirectiveName(name.toLowerCase());
          }

          attrsMap[nName] = name;

          if (isNgAttr || !hasOwn(attrs, nName)) {
            attrs[nName] = value;

            if (getBooleanAttrName(node, nName)) {
              attrs[nName] = true;
            }
          }

          addAttrInterpolateDirective(node, directives, value, nName, isNgAttr);

          if (nName !== ignoreDirective) {
            appendDirectivesForName(directives, nName, "A", maxPriority);
          }
        }

        function addSpecialAttributeDirective(
          node: Element,
          directives: DirectiveMatchList,
          normalizedName: string,
          propertyName: string,
          prefix: NgPrefixBinding,
        ): void {
          if (prefix === "Prop") {
            addPropertyDirective(
              node,
              directives,
              normalizedName,
              propertyName,
            );

            return;
          }

          if (prefix === "On") {
            directives.push(
              createSyntheticDirective(
                createEventDirective(
                  $parse,
                  $exceptionHandler,
                  normalizedName,
                  propertyName,
                ),
              ),
            );

            return;
          }

          directives.push(
            createSyntheticDirective(
              createWindowEventDirective(
                $parse,
                $exceptionHandler,
                window,
                normalizedName,
                propertyName,
              ),
            ),
          );
        }

        /**
         * A function generator that is used to support both eager and lazy compilation
         * linking function.
         */
        function compilationGenerator(
          eager: boolean,
          nodes: NodeList | Node | null,
          transcludeFn?: ChildTranscludeOrLinkFn | null,
          maxPriority?: number,
          ignoreDirective?: string,
          previousCompileContext?: {
            /** @internal */
            _nonTlbTranscludeDirective?: any;
            /** @internal */
            _needsNewScope?: any;
          } | null,
        ): ng.PublicLinkFn | ng.TranscludeFn {
          if (eager) {
            return compile(
              nodes,
              transcludeFn,
              maxPriority,
              ignoreDirective,
              previousCompileContext,
            );
          }

          return createLazyCompilationFn({
            _nodes: nodes,
            _transcludeFn: transcludeFn,
            _maxPriority: maxPriority,
            _ignoreDirective: ignoreDirective,
            _previousCompileContext: previousCompileContext,
          });
        }

        function createLazyCompilationFn(
          lazyCompilationState: LazyCompilationState,
        ): PublicLinkFn {
          /** Defers compilation until the returned linker/transclude function is first invoked. */
          const lazyCompilation = function lazyCompilation(
            ...args: Parameters<PublicLinkFn>
          ) {
            return invokeLazyCompilation(
              (
                lazyCompilation as PublicLinkFn & {
                  _state?: LazyCompilationState;
                }
              )._state as LazyCompilationState,
              ...args,
            );
          } as PublicLinkFn;

          lazyCompilation._state = lazyCompilationState;

          return lazyCompilation;
        }

        /** Shared invoker for lazily compiled public-link/transclude functions. */
        function invokeLazyCompilation(
          state: LazyCompilationState,
          ...args: Parameters<PublicLinkFn>
        ) {
          if (!state._compiled) {
            state._compiled = compile(
              state._nodes,
              state._transcludeFn,
              state._maxPriority,
              state._ignoreDirective,
              state._previousCompileContext,
            );

            state._nodes = null;
            state._transcludeFn = null;
            state._previousCompileContext = null;
          }

          return state._compiled(...args);
        }

        /**
         * Stores link metadata in a compact record so linking can use shared invokers instead of wrapped closures.
         */
        function pushLinkFnRecord(
          linkFns: LinkFnRecord[],
          linkFn: Function | null | undefined,
          require: string | Array<any> | Record<string, any> | undefined,
          directiveName: string,
          isolateScope: boolean,
          linkCtx?: any,
          thisArg?: any,
        ): void {
          if (!linkFn) {
            return;
          }

          linkFns.push({
            _fn: linkFn,
            _require: require,
            _directiveName: directiveName,
            _isolateScope: isolateScope,
            _linkCtx: linkCtx,
            _thisArg: thisArg,
          });
        }

        /** Invokes a link record with consistent scope selection and argument ordering. */
        function invokeLinkFnRecord(
          linkFnRecord: LinkFnRecord,
          isolateScope: Scope | undefined,
          scope: Scope,
          node: Node,
          attrs: Attributes,
          controllers: any,
          transcludeFn: any,
        ) {
          if (linkFnRecord._linkCtx !== undefined) {
            return linkFnRecord._fn(
              linkFnRecord._linkCtx,
              linkFnRecord._isolateScope ? isolateScope : scope,
              node,
              attrs,
              controllers,
              transcludeFn,
            );
          }

          if (linkFnRecord._thisArg !== undefined) {
            return linkFnRecord._fn.call(
              linkFnRecord._thisArg,
              linkFnRecord._isolateScope ? isolateScope : scope,
              node,
              attrs,
              controllers,
              transcludeFn,
            );
          }

          return linkFnRecord._fn(
            linkFnRecord._isolateScope ? isolateScope : scope,
            node,
            attrs,
            controllers,
            transcludeFn,
          );
        }

        /** Shared post-link executor for text interpolation directives. */
        function textInterpolateLinkFn(
          linkState: TextInterpolateLinkState,
          scope: Scope,
          node: Node,
        ) {
          if (linkState._singleExpression) {
            scope.$watch(linkState._watchExpression, (value) => {
              applyTextInterpolationValue(node, stringify(value) as string);
            });

            return;
          }

          const bindingState = {
            _linkState: linkState,
            _scope: scope,
            _node: node,
          } as TextInterpolationBindingState;

          scope.$watch(linkState._watchExpression, () => {
            handleTextInterpolationWatch(bindingState);
          });
        }

        /** Re-applies text interpolation using explicit per-link state. */
        function handleTextInterpolationWatch(
          bindingState: TextInterpolationBindingState,
        ) {
          applyTextInterpolationValue(
            bindingState._node,
            bindingState._linkState._interpolateFn(
              deProxy(bindingState._scope),
            ),
          );
        }

        /**
         * Applies the latest interpolated attribute value using the same class/srcset special cases
         * as the original inline pre-link closure.
         */
        function applyInterpolatedAttrValue(
          linkState: AttrInterpolateLinkState,
          attr: Attributes,
          value: string,
        ) {
          if (linkState._name === "class") {
            const element = attr._element() as Element;

            attr.$updateClass(value, element.classList.value);

            return;
          }

          if (linkState._name === "srcset") {
            attr.$set(
              linkState._name,
              linkState._isNgAttr
                ? value
                : (sanitizeSrcset(security.valueOf(value), "srcset") as string),
            );

            return;
          }

          if (
            (linkState._trustedContext === SCE_CONTEXTS._URL ||
              linkState._trustedContext === SCE_CONTEXTS._MEDIA_URL) &&
            !(typeof value === "string" && value.startsWith("unsafe:"))
          ) {
            value = security.getTrusted(linkState._trustedContext, value);
          }

          attr.$set(linkState._name, value);
        }

        /** Re-applies the current interpolated attribute value from explicit per-link state. */
        function handleAttrInterpolationWatch(
          bindingState: AttrInterpolationBindingState,
        ) {
          const interpolateFn = bindingState._linkState._interpolateFn;

          if (!interpolateFn) {
            return;
          }

          const value = interpolateFn(bindingState._scope);

          if (
            bindingState._lastValue === value &&
            "$index" in bindingState._scope.$target
          ) {
            return;
          }

          bindingState._lastValue = value;
          applyInterpolatedAttrValue(
            bindingState._linkState,
            bindingState._attr,
            value,
          );
        }

        /**
         * Shared pre-link executor for interpolated attributes. The mutable link state keeps the
         * current interpolation function in sync if an earlier compile step rewrites the attribute.
         */
        function attrInterpolatePreLinkFn(
          linkState: AttrInterpolateLinkState,
          scope: Scope,
          _element: Node,
          attr: Attributes,
        ) {
          // Recompute interpolation if another compile step rewrote the attribute value.
          const attrsAny = attr as Record<string, any>;

          const name = linkState._name;

          const newValue = attrsAny[name];

          if (newValue !== linkState._value) {
            linkState._interpolateFn = newValue
              ? ($interpolate(
                  newValue,
                  true,
                  linkState._trustedContext,
                  linkState._allOrNothing,
                ) as InterpolationFunction | undefined)
              : undefined;
            linkState._value = newValue;
          }

          if (!linkState._interpolateFn) {
            return;
          }

          const interpolateFn = linkState._interpolateFn;

          const { expressions } = interpolateFn;

          const observers = attr._observers || (attr._observers = nullObject());

          const observer = observers[name] || (observers[name] = []);

          attrsAny[name] = interpolateFn(scope);
          observer._inter = true;

          const bindingState = {
            _linkState: linkState,
            _scope: scope,
            _attr: attr,
          } as AttrInterpolationBindingState;

          if (expressions.length > 0) {
            const targetScope = observer._scope || scope;

            const watchExpression =
              buildInterpolationWatchExpression(expressions);

            targetScope.$watch(watchExpression, () => {
              handleAttrInterpolationWatch(bindingState);
            });
          } else {
            handleAttrInterpolationWatch(bindingState);
          }
        }

        /** Applies the current `ng-prop-*` value from explicit per-link state. */
        function updatePropertyDirectiveValue(
          bindingState: PropertyDirectiveBindingState,
        ) {
          const linkState = bindingState._linkState;

          bindingState._element[linkState._propName] = linkState._sanitizer(
            linkState._ngPropGetter(bindingState._scope),
          );
        }

        /** Shared watch callback for property-name watchers. */
        function handlePropertyDirectiveValueWatch(
          bindingState: PropertyDirectiveBindingState,
        ) {
          updatePropertyDirectiveValue(bindingState);
        }

        /** Shared watch callback for backing attribute-expression watchers. */
        function handlePropertyDirectiveAttrWatch(
          bindingState: PropertyDirectiveBindingState,
          value: any,
        ) {
          security.valueOf(value);
          updatePropertyDirectiveValue(bindingState);
        }

        /** Invokes an expression binding against the stored parent getter and scope target. */
        function invokeExpressionBinding(
          bindingState: ExpressionBindingState,
          locals: any,
        ) {
          return (
            bindingState._parentGet &&
            bindingState._parentGet(bindingState._scopeTarget, locals)
          );
        }

        /**
         * Shared pre-link executor for `ng-prop-*` bindings. Watch callbacks still need per-link state,
         * but the compile-time getter/sanitizer wiring is now reused.
         */
        function propertyDirectivePreLinkFn(
          linkState: PropertyDirectiveLinkState,
          scope: Scope,
          $element: { [x: string]: any },
          attr: Attributes,
        ) {
          const attrsAny = attr as Record<string, any>;

          const bindingState = {
            _linkState: linkState,
            _scope: scope,
            _element: $element,
            _attr: attr,
          } as PropertyDirectiveBindingState;

          updatePropertyDirectiveValue(bindingState);

          scope.$watch(linkState._propName, () => {
            handlePropertyDirectiveValueWatch(bindingState);
          });

          scope.$watch(attrsAny[linkState._attrName], (val: any) => {
            handlePropertyDirectiveAttrWatch(bindingState, val);
          });
        }

        /**
         * Links against a resolved async template using the already materialized node.
         * This is the direct path for links that happen after the template has loaded.
         */
        function invokeResolvedTemplateNodeLink(
          delayedState: DelayedTemplateLinkState,
          scope: Scope,
          node: Node | Element,
          boundTranscludeFn?: BoundTranscludeFn | null,
        ): void {
          const afterTemplateNodeLinkPlan =
            delayedState._afterTemplateNodeLinkPlan;

          if (!afterTemplateNodeLinkPlan) {
            return;
          }

          let childBoundTranscludeFn = boundTranscludeFn;

          if (afterTemplateNodeLinkPlan._transcludeOnThisElement) {
            childBoundTranscludeFn = createBoundTranscludeFn(
              scope,
              afterTemplateNodeLinkPlan._transclude as ng.TranscludeFn,
              boundTranscludeFn,
            );
          }

          if (afterTemplateNodeLinkPlan._nodeLinkFnState !== undefined) {
            (afterTemplateNodeLinkPlan._nodeLinkFn as StoredNodeLinkExecutor)(
              afterTemplateNodeLinkPlan._nodeLinkFnState,
              delayedState._afterTemplateChildLinkExecutor,
              scope,
              node,
              childBoundTranscludeFn || null,
            );
          } else {
            (afterTemplateNodeLinkPlan._nodeLinkFn as NodeLinkExecutor)(
              delayedState._afterTemplateChildLinkExecutor,
              scope,
              node,
              childBoundTranscludeFn || null,
            );
          }
        }

        /**
         * Replays one queued link request after an async templateUrl has resolved.
         * Queued requests may need clone/class reconciliation because the template DOM did not
         * exist at the time the original link request was recorded.
         */
        function replayResolvedTemplateNodeLink(
          delayedState: DelayedTemplateLinkState,
          scope: Scope,
          beforeTemplateLinkNode: Node | Element,
          boundTranscludeFn?: BoundTranscludeFn | null,
        ): void {
          const afterTemplateNodeLinkPlan =
            delayedState._afterTemplateNodeLinkPlan;

          const compiledNode = delayedState._compiledNode;

          const compileNodeRef = delayedState._compileNodeRef;

          if (!afterTemplateNodeLinkPlan || !compiledNode || !compileNodeRef) {
            return;
          }

          if (scope._destroyed) {
            return;
          }

          let linkNode = compileNodeRef._getAny();

          if (
            beforeTemplateLinkNode !== delayedState._beforeTemplateCompileNode
          ) {
            const oldClasses = (beforeTemplateLinkNode as Element).className;

            if (
              !(
                delayedState._previousCompileContext
                  ._hasElementTranscludeDirective &&
                delayedState._origAsyncDirective.replace
              )
            ) {
              // The linked node was cloned before the template arrived; clone the resolved template too.
              linkNode = compiledNode.cloneNode(true);
              beforeTemplateLinkNode.appendChild(linkNode);
            }

            try {
              if (oldClasses !== "") {
                const classList = compileNodeRef.element.classList;
                const targetClassList = (beforeTemplateLinkNode as Element)
                  .classList;

                for (let i = 0, l = classList.length; i < l; i++) {
                  targetClassList.add(classList[i]);
                }
              }
            } catch {
              // Ignore read-only SVG className updates.
            }
          }

          invokeResolvedTemplateNodeLink(
            delayedState,
            scope,
            linkNode,
            boundTranscludeFn,
          );
        }

        /**
         * Removes one queued async `templateUrl` link request.
         * This prevents unresolved delayed template state from retaining dead scopes/nodes.
         */
        function removeDelayedTemplateLinkQueueEntry(
          delayedState: DelayedTemplateLinkState,
          scope: Scope,
          node: Node | Element,
          boundTranscludeFn?: BoundTranscludeFn | null,
        ): void {
          const linkQueue = delayedState._linkQueue;

          if (!linkQueue) {
            return;
          }

          for (
            let queueIndex = 0;
            queueIndex < linkQueue.length;
            queueIndex += 3
          ) {
            if (
              linkQueue[queueIndex] === scope &&
              linkQueue[queueIndex + 1] === node &&
              linkQueue[queueIndex + 2] === boundTranscludeFn
            ) {
              linkQueue.splice(queueIndex, 3);

              return;
            }
          }
        }

        /**
         * Shared delayed link executor for async `templateUrl` directives. Until the template resolves,
         * it stores link requests in a compact queue; afterwards it links directly against the resolved template.
         */
        function executeDelayedTemplateNodeLinkPlan(
          delayedState: DelayedTemplateLinkState,
          _ignoreChildLinkFn: unknown,
          scope: Scope,
          node: Node | Element,
          boundTranscludeFn?: BoundTranscludeFn | null,
        ): void {
          if (scope._destroyed) {
            return;
          }

          if (delayedState._linkQueue) {
            enqueuePendingTemplateLink(
              delayedState,
              scope,
              node,
              boundTranscludeFn,
            );

            return;
          }

          invokeResolvedTemplateNodeLink(
            delayedState,
            scope,
            node,
            boundTranscludeFn,
          );
        }

        function enqueuePendingTemplateLink(
          delayedState: DelayedTemplateLinkState,
          scope: Scope,
          node: Node | Element,
          boundTranscludeFn?: BoundTranscludeFn | null,
        ): void {
          delayedState._linkQueue!.push(scope, node, boundTranscludeFn);
          const removeOnDestroy = scope.$on("$destroy", () => {
            removeOnDestroy();
            removeDelayedTemplateLinkQueueEntry(
              delayedState,
              scope,
              node,
              boundTranscludeFn,
            );
          });
        }

        function releaseDelayedTemplateLinkState(
          delayedState: DelayedTemplateLinkState,
        ): void {
          delayedState._compileNodeRef?._release();
          delayedState._compileNodeRef = undefined;
          delayedState._linkQueue = null;
        }

        function replayPendingTemplateLinks(
          delayedState: DelayedTemplateLinkState,
        ): void {
          for (
            let queueIndex = 0;
            delayedState._linkQueue &&
            queueIndex < delayedState._linkQueue.length;
            queueIndex += 3
          ) {
            const scope = delayedState._linkQueue[queueIndex] as
              | ng.Scope
              | undefined;

            const beforeTemplateLinkNode = delayedState._linkQueue[
              queueIndex + 1
            ] as Node | Element;

            const boundTranscludeFn = delayedState._linkQueue[
              queueIndex + 2
            ] as BoundTranscludeFn | null | undefined;

            if (!scope) {
              continue;
            }

            replayResolvedTemplateNodeLink(
              delayedState,
              scope,
              beforeTemplateLinkNode,
              boundTranscludeFn,
            );
          }
        }

        function handleDelayedTemplateLoaded(
          delayedState: DelayedTemplateLinkState,
          content: string,
        ): void {
          let compileNode: Element;

          let replacementState: DelayedTemplateReplacementState | undefined;

          content = denormalizeTemplate(content);

          if (delayedState._origAsyncDirective.replace) {
            let templateNodes: Element[];

            if (isTextNode(content)) {
              templateNodes = [];
            } else if (typeof content === "string") {
              templateNodes = collectElementTemplateNodes(
                createNodelistFromHTML(content),
              );
            } else {
              templateNodes = collectElementTemplateNodes(
                wrapTemplate(
                  delayedState._templateNamespace,
                  trim(content),
                ) as NodeListOf<ChildNode>,
              );
            }
            compileNode = templateNodes[0];

            if (
              templateNodes.length !== 1 ||
              compileNode.nodeType !== NodeType._ELEMENT_NODE
            ) {
              throw $compileError(
                "tplrt",
                "Template for directive '{0}' must have exactly one root element. {1}",
                delayedState._origAsyncDirective.name,
                delayedState._templateUrl,
              );
            }

            replacementState = {
              _templateNodes: templateNodes,
              _templateAttrs: { $attr: {} } as Attributes,
            };

            replaceWith(
              delayedState._compileNodeRef as NodeRef,
              compileNode,
              delayedState._previousCompileContext._index,
            );

            const templateDirectives = collectDirectiveMatches(
              compileNode,
              replacementState._templateAttrs,
            );

            if (
              delayedState._origAsyncDirective.scope !== null &&
              typeof delayedState._origAsyncDirective.scope === "object"
            ) {
              markDirectiveScope(templateDirectives, true);
            }
            delayedState._directives = templateDirectives.concat(
              delayedState._directives,
            );

            mergeTemplateAttributes(
              delayedState._tAttrs,
              replacementState._templateAttrs,
            );
          } else {
            compileNode = delayedState._beforeTemplateCompileNode as Element;
            (delayedState._compileNodeRef as NodeRef).element.innerHTML =
              content;
          }

          delayedState._directives.unshift(delayedState._derivedSyncDirective);
          delayedState._afterTemplateNodeLinkPlan = applyDirectivesToNode(
            delayedState._directives,
            compileNode,
            delayedState._tAttrs,
            delayedState._childTranscludeFn,
            delayedState._origAsyncDirective,
            delayedState._preLinkFns,
            delayedState._postLinkFns,
            {
              ...delayedState._previousCompileContext,
              _ctxNodeRef: delayedState._compileNodeRef,
            },
          );

          if (delayedState._rootElement) {
            for (let i = 0, l = delayedState._rootElement.length; i < l; i++) {
              const node = delayedState._rootElement[i];

              if (node === compileNode) {
                delayedState._rootElement[i] = delayedState._compileNodeRef;
              }
            }
          }
          delayedState._compiledNode = compileNode;
          delayedState._afterTemplateChildLinkExecutor = compileTemplate(
            new NodeRef(
              (delayedState._compileNodeRef as NodeRef)._getAny().childNodes,
            ),
            delayedState._childTranscludeFn,
            undefined,
            undefined,
            undefined,
          );

          try {
            replayPendingTemplateLinks(delayedState);
          } finally {
            releaseDelayedTemplateLinkState(delayedState);
          }
        }

        function handleDelayedTemplateLoadError(
          delayedState: DelayedTemplateLinkState,
          error: unknown,
        ): void {
          delayedState._afterTemplateNodeLinkPlan = undefined;
          delayedState._afterTemplateChildLinkExecutor = null;
          delayedState._compiledNode = undefined;
          releaseDelayedTemplateLinkState(delayedState);

          if (isError(error)) {
            $exceptionHandler(error);
          } else {
            $exceptionHandler(new Error(String(error)));
          }
        }

        /** Handles `$transclude(...)` calls for the shared node-link executor. */
        function invokeControllersBoundTransclude(
          transcludeState: ControllersBoundTranscludeState,
          scopeParam?: Scope | CloneAttachFn | null,
          cloneAttachFn?: CloneAttachFn | Node | null,
          _futureParentElement?: Node | null,
          slotName?: string | number,
        ) {
          if (transcludeState._destroyed) {
            return undefined;
          }

          const hasScope = isScope(scopeParam);

          const boundTranscludeFn = transcludeState._boundTranscludeFn;

          const transcludeControllers =
            transcludeState._hasElementTranscludeDirective
              ? transcludeState._elementControllers
              : undefined;

          const transcludedScope = hasScope ? (scopeParam as Scope) : undefined;

          const attachFn = (hasScope ? cloneAttachFn : scopeParam) as
            | CloneAttachFn
            | undefined;

          const requestedSlotName = (
            hasScope ? slotName : _futureParentElement
          ) as string | number | undefined;

          const futureParentElement =
            ((hasScope ? _futureParentElement : cloneAttachFn) as
              | Node
              | null
              | undefined) ||
            (transcludeState._hasElementTranscludeDirective
              ? transcludeState._elementRef.node.parentElement
              : transcludeState._elementRef.node);

          if (requestedSlotName) {
            const slotTranscludeFn =
              boundTranscludeFn._slots[requestedSlotName];

            if (slotTranscludeFn) {
              return slotTranscludeFn(
                transcludedScope,
                attachFn,
                transcludeControllers,
                futureParentElement,
                transcludeState._scopeToChild,
              );
            }

            if (slotTranscludeFn === undefined) {
              throw $compileError(
                "noslot",
                'No parent directive that requires a transclusion with slot name "{0}". ' +
                  "Element: {1}",
                requestedSlotName,
                startingTag(transcludeState._elementRef.element),
              );
            }

            return undefined;
          }

          return boundTranscludeFn(
            transcludedScope,
            attachFn,
            transcludeControllers,
            futureParentElement,
            transcludeState._scopeToChild,
          );
        }

        function createControllersBoundTranscludeFn(
          transcludeState: ControllersBoundTranscludeState,
        ): ControllersBoundTranscludeFn {
          const wrapper = function wrapper(
            scopeParam?: Scope | CloneAttachFn | null,
            cloneAttachFn?: CloneAttachFn | Node | null,
            _futureParentElement?: Node | null,
            slotName?: string | number,
          ) {
            return invokeControllersBoundTransclude(
              (
                wrapper as ControllersBoundTranscludeFn & {
                  _state?: ControllersBoundTranscludeState;
                }
              )._state as ControllersBoundTranscludeState,
              scopeParam,
              cloneAttachFn,
              _futureParentElement,
              slotName,
            );
          } as ControllersBoundTranscludeFn;

          wrapper._state = transcludeState;
          wrapper._boundTransclude = transcludeState._boundTranscludeFn;
          wrapper.isSlotFilled = isControllersBoundTranscludeSlotFilled;
          transcludeState._wrapper = wrapper;

          return wrapper;
        }

        /** Shared slot-filled predicate for controllers-bound transclude wrappers. */
        function isControllersBoundTranscludeSlotFilled(
          this: ControllersBoundTranscludeFn,
          slotName: string | number,
        ) {
          const state = this._state as
            | ControllersBoundTranscludeState
            | undefined;

          return !!state?._boundTranscludeFn?._slots[slotName];
        }

        /**
         * Reuses one implementation for the standard node-link path by passing all compile-time
         * state explicitly instead of closing over it in a per-node function.
         */
        function executeStoredNodeLinkPlan(
          nodeLinkState: NodeLinkState,
          childLinkExecutor:
            | ChildLinkFn
            | TemplateLinkExecutor
            | null
            | undefined,
          scope: Scope,
          linkNode: Node | Element,
          boundTranscludeFn: BoundTranscludeFn | null,
        ) {
          let isolateScope;

          let controllerScope;

          let elementControllers: ElementControllers = nullObject();

          let scopeToChild = scope;

          let $element!: NodeRef;

          let attrs!: Attributes;

          let scopeBindingInfo;

          if (nodeLinkState._compileNode === linkNode) {
            attrs = nodeLinkState._templateAttrs;
            $element = nodeLinkState._templateAttrs._nodeRef as NodeRef;
          } else {
            $element = new NodeRef(linkNode);
            registerScopeOwnedNodeRef(scope, $element);
            attrs = new Attributes(
              $injector,
              $exceptionHandler,
              $element,
              nodeLinkState._templateAttrs,
            );
          }

          controllerScope = scope;

          if (nodeLinkState._newIsolateScopeDirective) {
            isolateScope = scope.$newIsolate();
          } else if (nodeLinkState._newScopeDirective) {
            controllerScope = scope.$parent;
          }

          controllerScope = controllerScope || scope;

          let transcludeFn: NodeLinkTranscludeFn = nodeLinkState._transcludeFn;

          let transcludeState: ControllersBoundTranscludeState | undefined;

          if (boundTranscludeFn) {
            transcludeState = {
              _boundTranscludeFn: boundTranscludeFn,
              _elementControllers: elementControllers,
              _hasElementTranscludeDirective:
                nodeLinkState._hasElementTranscludeDirective,
              _scopeToChild: scopeToChild,
              _elementRef: $element,
            };
            const currentTranscludeState = transcludeState;

            scope.$on("$destroy", () => {
              releaseControllersBoundTranscludeState(currentTranscludeState);
            });

            transcludeFn = createControllersBoundTranscludeFn(transcludeState);
          }

          const controllerDirectives =
            nodeLinkState._controllerDirectives || nullObject();

          if (nodeLinkState._controllerDirectives) {
            elementControllers = setupControllers(
              $element,
              attrs,
              transcludeFn as ng.TranscludeFn,
              nodeLinkState._controllerDirectives,
              isolateScope || scope,
              scope,
              nodeLinkState._newIsolateScopeDirective,
            );

            if (transcludeState) {
              syncControllersBoundTranscludeState(
                transcludeState,
                scopeToChild,
                elementControllers,
                $element,
              );
            }
          }

          if (nodeLinkState._newIsolateScopeDirective && isolateScope) {
            isolateScope.$target._isolateBindings = nodeLinkState
              ._newIsolateScopeDirective._isolateBindings as any;
            scopeBindingInfo = initializeDirectiveBindings(
              scope,
              attrs,
              isolateScope,
              isolateScope._isolateBindings,
              nodeLinkState._newIsolateScopeDirective,
            );

            if (scopeBindingInfo._removeWatches) {
              isolateScope.$on("$destroy", scopeBindingInfo._removeWatches);
            }
          }

          for (const name in elementControllers) {
            const controllerDirective = controllerDirectives[name];

            const controller = elementControllers[name];

            const bindings = controllerDirective._bindings
              ._bindToController as any;

            const controllerInstance = controller();

            controller._instance = controllerScope.$new(controllerInstance);
            setCacheData(
              $element.node,
              `$${controllerDirective.name}Controller`,
              controller._instance,
            );
            controller._bindingInfo = initializeDirectiveBindings(
              controllerScope,
              attrs,
              controller._instance,
              bindings,
              controllerDirective,
            );
          }

          if (nodeLinkState._controllerDirectives) {
            for (const name in controllerDirectives) {
              const controllerDirective = controllerDirectives[name];

              const { require } = controllerDirective;

              if (
                controllerDirective.bindToController &&
                !Array.isArray(require) &&
                require !== null &&
                typeof require === "object"
              ) {
                extend(
                  elementControllers[name]._instance,
                  getControllers(
                    name,
                    require,
                    $element.element,
                    elementControllers,
                  ),
                );
              }
            }
          }

          if (elementControllers) {
            for (const name in elementControllers) {
              const controller = elementControllers[name];

              const controllerInstance = controller._instance;

              if (typeof controllerInstance.$onChanges === "function") {
                try {
                  controllerInstance.$onChanges(
                    controller._bindingInfo!._initialChanges,
                  );
                } catch (err) {
                  $exceptionHandler(err);
                }
              }

              if (typeof controllerInstance.$onInit === "function") {
                try {
                  controllerInstance.$target.$onInit();
                } catch (err) {
                  $exceptionHandler(err);
                }
              }

              if (typeof controllerInstance.$onDestroy === "function") {
                controllerScope.$on("$destroy", () => {
                  controllerInstance.$onDestroy();
                });
              }

              controllerScope.$on("$destroy", () => {
                if (!controllerInstance._destroyed) {
                  controllerInstance.$destroy();
                }
              });
            }
          }

          for (let i = 0, ii = nodeLinkState._preLinkFns.length; i < ii; i++) {
            const preLinkFn: LinkFnRecord = nodeLinkState._preLinkFns[i];

            const controllers =
              preLinkFn._require &&
              getControllers(
                preLinkFn._directiveName,
                preLinkFn._require,
                $element.element,
                elementControllers,
              );

            try {
              invokeLinkFnRecord(
                preLinkFn,
                isolateScope,
                scope,
                $element.node,
                attrs,
                controllers,
                transcludeFn,
              );
            } catch (err) {
              $exceptionHandler(err);
            }
          }

          if (
            nodeLinkState._newIsolateScopeDirective &&
            (nodeLinkState._newIsolateScopeDirective.template ||
              nodeLinkState._newIsolateScopeDirective.templateUrl === null)
          ) {
            scopeToChild = isolateScope || scope;

            if (transcludeState) {
              syncControllersBoundTranscludeState(
                transcludeState,
                scopeToChild,
                elementControllers,
                $element,
              );
            }
          }

          if (
            childLinkExecutor &&
            linkNode.childNodes &&
            linkNode.childNodes.length
          ) {
            childLinkExecutor(
              scopeToChild,
              linkNode.childNodes,
              boundTranscludeFn,
            );
          }

          for (let i = nodeLinkState._postLinkFns.length - 1; i >= 0; i--) {
            const postLinkFn: LinkFnRecord = nodeLinkState._postLinkFns[i];

            const controllers =
              postLinkFn._require &&
              getControllers(
                postLinkFn._directiveName,
                postLinkFn._require,
                $element.node as Element,
                elementControllers,
              );

            try {
              if (postLinkFn._isolateScope && isolateScope) {
                deleteCacheData($element.element, _scope);
                setIsolateScope($element.element, isolateScope);
              }

              invokeLinkFnRecord(
                postLinkFn,
                isolateScope,
                scope,
                $element.node,
                attrs,
                controllers,
                transcludeFn,
              );
            } catch (err) {
              $exceptionHandler(err);
            }
          }

          if (elementControllers) {
            for (const name in elementControllers) {
              const controller = elementControllers[name];

              const controllerInstance = controller._instance;

              if (typeof controllerInstance.$postLink === "function") {
                controllerInstance.$postLink();
              }
            }
          }
        }

        /**
         * Applies a sorted set of directives to a single node and produces the node-level link context.
         *
         * Responsibilities:
         * - Run directive `compile()` functions (and collect pre/post link fns).
         * - Inline templates / handle `replace`, `templateUrl`, and transclusion.
         * - Track terminal directives and scope requirements for later linking.
         */
        function applyDirectivesToNode(
          directives: InternalDirective[],
          compileNode: Node | Element,
          templateAttrs: Attributes,
          transcludeFn: ChildTranscludeOrLinkFn,
          originalReplaceDirective?: InternalDirective | null,
          preLinkFns?: LinkFnRecord[],
          postLinkFns?: LinkFnRecord[],
          previousCompileContext?: PreviousCompileContext,
        ): NodeLinkPlan {
          previousCompileContext = previousCompileContext || {};

          let terminalPriority = -Number.MAX_VALUE;

          let terminal = false;

          let {
            _templateDirective,
            _nonTlbTranscludeDirective,
            _hasElementTranscludeDirective,
          } = previousCompileContext;

          const { _ctxNodeRef, _parentNodeRef } = previousCompileContext;

          let hasTranscludeDirective = false;

          let hasTemplate = false;

          let compileNodeRef = new NodeRef(compileNode);

          const { _index } = previousCompileContext;

          templateAttrs._nodeRef = compileNodeRef;
          let directive: InternalDirective;

          let directiveName: string;

          let replaceDirective = originalReplaceDirective;

          let childTranscludeFn: ChildTranscludeOrLinkFn = transcludeFn;

          const directiveEffectState: DirectiveCompileEffectState = {
            _newScopeDirective: previousCompileContext._newScopeDirective as
              | InternalDirective
              | null
              | undefined,
            _controllerDirectives:
              previousCompileContext._controllerDirectives as
                | Record<string, InternalDirective>
                | null
                | undefined,
            _newIsolateScopeDirective:
              previousCompileContext._newIsolateScopeDirective as
                | InternalDirective
                | null
                | undefined,
            _didScanForMultipleTransclusion: false,
            _mightHaveMultipleTransclusionError: false,
          };

          let directiveValue: any;

          let nodeLinkFn: NodeLinkExecutor | StoredNodeLinkExecutor | undefined;

          let nodeLinkFnState:
            | NodeLinkState
            | DelayedTemplateLinkState
            | undefined;

          // executes all directives on the current element
          for (let i = 0, ii = directives.length; i < ii; i++) {
            directive = directives[i];
            const directivePriority = directive.priority as number;

            if (terminalPriority > directivePriority) {
              break; // prevent further processing of directives
            }

            directiveName = directive.name || "";

            applyDirectiveScopeEffect(
              directive,
              compileNodeRef,
              directiveEffectState,
            );

            applyMultipleTransclusionScanEffect(
              directives,
              i,
              directive,
              directiveName,
              directiveEffectState,
            );

            applyDirectiveControllerEffect(
              directive,
              directiveName,
              compileNodeRef,
              directiveEffectState,
            );

            directiveValue = directive.transclude;

            if (directiveValue) {
              const transclusionResult = applyTransclusionDirective(
                directive,
                directiveName,
                directiveValue,
                compileNodeRef,
                compileNode,
                templateAttrs,
                _ctxNodeRef,
                _index,
                transcludeFn,
                directivePriority,
                replaceDirective,
                _nonTlbTranscludeDirective,
                !!_hasElementTranscludeDirective,
                terminalPriority,
                directiveEffectState._mightHaveMultipleTransclusionError,
                previousCompileContext,
              );

              hasTranscludeDirective =
                transclusionResult._hasTranscludeDirective;
              _hasElementTranscludeDirective =
                transclusionResult._hasElementTranscludeDirective;
              _nonTlbTranscludeDirective =
                transclusionResult._nonTlbTranscludeDirective;
              terminalPriority = transclusionResult._terminalPriority;
              compileNodeRef = transclusionResult._compileNodeRef;
              compileNode = transclusionResult._compileNode;
              childTranscludeFn = transclusionResult._childTranscludeFn;
            }

            if (directive.template) {
              hasTemplate = true;

              const inlineTemplate = applyInlineTemplateDirective(
                directive,
                directiveName,
                compileNodeRef,
                compileNode,
                templateAttrs,
                directives,
                i,
                _parentNodeRef,
                _index,
                directiveEffectState._newIsolateScopeDirective,
                directiveEffectState._newScopeDirective,
                _templateDirective,
                replaceDirective,
              );

              compileNode = inlineTemplate._compileNode;
              directives = inlineTemplate._directives;
              ii = inlineTemplate._directiveCount;
              _templateDirective = inlineTemplate._templateDirective;
              replaceDirective = inlineTemplate._replaceDirective;
            }

            if (directive.templateUrl) {
              hasTemplate = true;

              const templateUrlResult = applyTemplateUrlDirective(
                directives,
                i,
                directive,
                compileNodeRef,
                templateAttrs,
                compileNode,
                hasTranscludeDirective,
                childTranscludeFn,
                preLinkFns || EMPTY_LINK_FN_RECORDS,
                postLinkFns || EMPTY_LINK_FN_RECORDS,
                _index,
                directiveEffectState._controllerDirectives,
                directiveEffectState._newScopeDirective,
                directiveEffectState._newIsolateScopeDirective,
                _templateDirective,
                _nonTlbTranscludeDirective,
                replaceDirective,
                previousCompileContext,
              );

              nodeLinkFn = templateUrlResult._nodeLinkFn;
              nodeLinkFnState = templateUrlResult._nodeLinkFnState;
              _templateDirective = templateUrlResult._templateDirective;
              replaceDirective = templateUrlResult._replaceDirective;
              ii = templateUrlResult._directiveCount;
            } else if (directive.compile) {
              preLinkFns = preLinkFns || [];
              postLinkFns = postLinkFns || [];

              collectDirectiveLinkFns(
                directive,
                directiveName,
                compileNodeRef,
                templateAttrs,
                childTranscludeFn,
                preLinkFns,
                postLinkFns,
                directiveEffectState._newIsolateScopeDirective,
              );
            }

            if (directive.terminal) {
              terminal = true;
              if (terminalPriority < directivePriority) {
                terminalPriority = directivePriority;
              }
            }
          }

          previousCompileContext._hasElementTranscludeDirective =
            _hasElementTranscludeDirective;

          if (!nodeLinkFn) {
            nodeLinkFn = executeStoredNodeLinkPlan as StoredNodeLinkExecutor;
            nodeLinkFnState = createStoredNodeLinkState(
              compileNode,
              templateAttrs,
              childTranscludeFn,
              directiveEffectState._controllerDirectives,
              directiveEffectState._newIsolateScopeDirective,
              directiveEffectState._newScopeDirective,
              !!_hasElementTranscludeDirective,
              preLinkFns || EMPTY_LINK_FN_RECORDS,
              postLinkFns || EMPTY_LINK_FN_RECORDS,
            );
          }

          // might be normal or delayed nodeLinkFn depending on if templateUrl is present
          return createNodeLinkPlan(
            nodeLinkFn,
            nodeLinkFnState,
            terminal,
            childTranscludeFn,
            hasTranscludeDirective,
            hasTemplate,
            directiveEffectState._newScopeDirective,
          );
        }

        function applyTransclusionDirective(
          directive: InternalDirective,
          directiveName: string,
          directiveValue: any,
          compileNodeRef: NodeRef,
          compileNode: Node | Element,
          templateAttrs: Attributes,
          contextNodeRef: NodeRef | undefined,
          index: number | undefined,
          transcludeFn: ChildTranscludeOrLinkFn,
          directivePriority: number,
          replaceDirective: InternalDirective | null | undefined,
          nonTlbTranscludeDirective: ng.Directive | null | undefined,
          hasElementTranscludeDirective: boolean,
          terminalPriority: number,
          mightHaveMultipleTransclusionError: boolean,
          previousCompileContext: PreviousCompileContext,
        ): TransclusionDirectiveResult {
          const nextNonTlbTranscludeDirective =
            applyDirectiveTransclusionOwnershipEffect(
              directive,
              directiveName,
              compileNodeRef,
              nonTlbTranscludeDirective,
            );

          if (directiveValue === "element") {
            const elementTransclusion = applyElementTransclusionDirective(
              compileNodeRef,
              templateAttrs,
              contextNodeRef,
              index,
              transcludeFn,
              directivePriority,
              replaceDirective,
              nextNonTlbTranscludeDirective,
              mightHaveMultipleTransclusionError,
            );

            return {
              _compileNode: elementTransclusion._compileNode,
              _compileNodeRef: elementTransclusion._compileNodeRef,
              _childTranscludeFn: elementTransclusion._childTranscludeFn,
              _hasTranscludeDirective: true,
              _hasElementTranscludeDirective: true,
              _nonTlbTranscludeDirective: nextNonTlbTranscludeDirective,
              _terminalPriority: elementTransclusion._terminalPriority,
            };
          }

          const childTranscludeFn = applyContentTransclusionDirective(
            directive,
            directiveValue,
            compileNode,
            transcludeFn,
            mightHaveMultipleTransclusionError,
            previousCompileContext,
          );

          return {
            _compileNode: compileNode,
            _compileNodeRef: compileNodeRef,
            _childTranscludeFn: childTranscludeFn,
            _hasTranscludeDirective: true,
            _hasElementTranscludeDirective: hasElementTranscludeDirective,
            _nonTlbTranscludeDirective: nextNonTlbTranscludeDirective,
            _terminalPriority: terminalPriority,
          };
        }

        function applyInlineTemplateDirective(
          directive: InternalDirective,
          directiveName: string,
          compileNodeRef: NodeRef,
          compileNode: Node | Element,
          templateAttrs: Attributes,
          directives: InternalDirective[],
          directiveIndex: number,
          parentNodeRef: NodeRef | undefined,
          index: number | undefined,
          newIsolateScopeDirective: ng.Directive | null | undefined,
          newScopeDirective: ng.Directive | null | undefined,
          templateDirective: ng.Directive | null | undefined,
          replaceDirective: InternalDirective | null | undefined,
        ): InlineTemplateDirectiveResult {
          assertNoDuplicate(
            "template",
            templateDirective,
            directive,
            compileNodeRef,
          );

          const directiveValue = resolveDirectiveTemplateValue(
            directive,
            compileNodeRef,
            templateAttrs,
          );

          if (!directive.replace) {
            if (compileNodeRef._isElement()) {
              compileNodeRef.element.innerHTML = directiveValue;
            }

            return {
              _compileNode: compileNode,
              _directives: directives,
              _directiveCount: directives.length,
              _templateDirective: directive,
              _replaceDirective: replaceDirective,
            };
          }

          const templateNodes = createDirectiveTemplateNodes(
            directive,
            directiveValue,
          );
          const replacementNode = getSingleElementTemplateRoot(
            templateNodes,
            directiveName,
          );

          const templateReplacement = applyTemplateReplacementDirective(
            compileNodeRef,
            replacementNode,
            templateAttrs,
            directives,
            directiveIndex,
            parentNodeRef,
            index,
            newIsolateScopeDirective,
            newScopeDirective,
          );

          return {
            _compileNode: replacementNode,
            _directives: templateReplacement._directives,
            _directiveCount: templateReplacement._directiveCount,
            _templateDirective: directive,
            _replaceDirective: directive,
          };
        }

        function applyTemplateReplacementDirective(
          compileNodeRef: NodeRef,
          compileNode: Node | Element,
          templateAttrs: Attributes,
          directives: InternalDirective[],
          directiveIndex: number,
          parentNodeRef: NodeRef | undefined,
          index: number | undefined,
          newIsolateScopeDirective: ng.Directive | null | undefined,
          newScopeDirective: ng.Directive | null | undefined,
        ): TemplateReplacementDirectiveResult {
          replaceWith(compileNodeRef, compileNode);

          if (parentNodeRef && index !== undefined) {
            parentNodeRef._setIndex(index, compileNode);
          }

          const newTemplateAttrs = { $attr: {} } as Attributes;

          const templateDirectives = collectDirectiveMatches(
            compileNode as Element,
            newTemplateAttrs,
          );

          const unprocessedDirectives = directives.splice(
            directiveIndex + 1,
            directives.length - (directiveIndex + 1),
          );

          if (newIsolateScopeDirective || newScopeDirective) {
            markDirectiveScope(
              templateDirectives,
              newIsolateScopeDirective,
              newScopeDirective,
            );
          }

          const mergedDirectives = mergeDirectiveLists(
            directives,
            templateDirectives,
            unprocessedDirectives,
          );

          mergeTemplateAttributes(templateAttrs, newTemplateAttrs);

          return {
            _directives: mergedDirectives,
            _directiveCount: mergedDirectives.length,
          };
        }

        function mergeDirectiveLists(
          first: InternalDirective[],
          second: InternalDirective[],
          third: InternalDirective[],
        ): InternalDirective[] {
          const merged = first.slice();

          for (let i = 0, l = second.length; i < l; i++) {
            merged.push(second[i]);
          }

          for (let i = 0, l = third.length; i < l; i++) {
            merged.push(third[i]);
          }

          return merged;
        }

        function applyTemplateUrlDirective(
          directives: InternalDirective[],
          directiveIndex: number,
          directive: InternalDirective,
          compileNodeRef: NodeRef,
          templateAttrs: Attributes,
          compileNode: Node | Element,
          hasTranscludeDirective: boolean,
          childTranscludeFn: ChildTranscludeOrLinkFn,
          preLinkFns: LinkFnRecord[],
          postLinkFns: LinkFnRecord[],
          index: number | undefined,
          controllerDirectives:
            | Record<string, InternalDirective>
            | Record<string, ng.Directive>
            | null
            | undefined,
          newScopeDirective: ng.Directive | null | undefined,
          newIsolateScopeDirective: ng.Directive | null | undefined,
          templateDirective: ng.Directive | null | undefined,
          nonTlbTranscludeDirective: ng.Directive | null | undefined,
          replaceDirective: InternalDirective | null | undefined,
          previousCompileContext: PreviousCompileContext,
        ): TemplateUrlDirectiveResult {
          assertNoDuplicate(
            "template",
            templateDirective,
            directive,
            compileNodeRef,
          );

          const nextTemplateDirective = directive;

          const nextReplaceDirective = directive.replace
            ? directive
            : replaceDirective;

          const { _nodeLinkFn, _nodeLinkFnState } = compileTemplateUrl(
            directives.splice(
              directiveIndex,
              directives.length - directiveIndex,
            ),
            compileNodeRef,
            templateAttrs,
            compileNode as Element,
            (hasTranscludeDirective &&
              childTranscludeFn) as ChildTranscludeOrLinkFn,
            preLinkFns,
            postLinkFns,
            {
              _index: index,
              _controllerDirectives: controllerDirectives,
              _newScopeDirective:
                newScopeDirective !== directive ? newScopeDirective : undefined,
              _newIsolateScopeDirective: newIsolateScopeDirective,
              _templateDirective: nextTemplateDirective,
              _nonTlbTranscludeDirective: nonTlbTranscludeDirective,
              _futureParentElement: previousCompileContext._futureParentElement,
            },
          );

          return {
            _nodeLinkFn,
            _nodeLinkFnState,
            _templateDirective: nextTemplateDirective,
            _replaceDirective: nextReplaceDirective,
            _directiveCount: directives.length,
          };
        }

        function createStoredNodeLinkState(
          compileNode: Node | Element,
          templateAttrs: Attributes,
          transcludeFn: NodeLinkTranscludeFn,
          controllerDirectives:
            | Record<string, InternalDirective>
            | null
            | undefined,
          newIsolateScopeDirective: InternalDirective | null | undefined,
          newScopeDirective: InternalDirective | null | undefined,
          hasElementTranscludeDirective: boolean,
          preLinkFns: LinkFnRecord[],
          postLinkFns: LinkFnRecord[],
        ): NodeLinkState {
          return {
            _compileNode: compileNode,
            _templateAttrs: templateAttrs,
            _transcludeFn: transcludeFn,
            _controllerDirectives: controllerDirectives,
            _newIsolateScopeDirective: newIsolateScopeDirective,
            _newScopeDirective: newScopeDirective,
            _hasElementTranscludeDirective: hasElementTranscludeDirective,
            _preLinkFns: preLinkFns,
            _postLinkFns: postLinkFns,
          };
        }

        function createNodeLinkPlan(
          nodeLinkFn: NodeLinkExecutor | StoredNodeLinkExecutor,
          nodeLinkFnState: NodeLinkState | DelayedTemplateLinkState | undefined,
          terminal: boolean,
          transcludeFn: ChildTranscludeOrLinkFn,
          transcludeOnThisElement: boolean,
          templateOnThisElement: boolean,
          newScopeDirective: InternalDirective | null | undefined,
        ): NodeLinkPlan {
          return {
            _nodeLinkFn: nodeLinkFn,
            _nodeLinkFnState: nodeLinkFnState,
            _terminal: terminal,
            _transclude: transcludeFn,
            _transcludeOnThisElement: transcludeOnThisElement,
            _templateOnThisElement: templateOnThisElement,
            _newScope: !!(
              newScopeDirective && newScopeDirective.scope === true
            ),
          };
        }

        function applyElementTransclusionDirective(
          templateNodeRef: NodeRef,
          templateAttrs: Attributes,
          contextNodeRef: NodeRef | undefined,
          index: number | undefined,
          transcludeFn: ChildTranscludeOrLinkFn,
          directivePriority: number,
          replaceDirective: InternalDirective | null | undefined,
          nonTlbTranscludeDirective: ng.Directive | null | undefined,
          mightHaveMultipleTransclusionError: boolean,
        ): ElementTransclusionDirectiveResult {
          const transcludedTemplateRef = templateNodeRef;

          const compileNodeRef = new NodeRef(document.createComment(""));

          templateAttrs._nodeRef = compileNodeRef;

          const compileNode = compileNodeRef.node;

          if (contextNodeRef) {
            if (contextNodeRef._isList && index !== undefined) {
              contextNodeRef._setIndex(index, compileNode);
            } else {
              contextNodeRef.node = compileNode;
            }
          }

          replaceWith(
            new NodeRef(transcludedTemplateRef._element as Element),
            compileNode,
            index,
          );

          const childTranscludeFn = compilationGenerator(
            mightHaveMultipleTransclusionError,
            transcludedTemplateRef._element as Element,
            transcludeFn,
            directivePriority,
            replaceDirective ? replaceDirective.name : undefined,
            {
              // Don't pass controller/scope/template directives through element transclusion:
              // the transcluded template will compile against its own directive context.
              _nonTlbTranscludeDirective: nonTlbTranscludeDirective,
            },
          );

          return {
            _compileNode: compileNode,
            _compileNodeRef: compileNodeRef,
            _childTranscludeFn: childTranscludeFn,
            _terminalPriority: directivePriority,
          };
        }

        function applyContentTransclusionDirective(
          directive: InternalDirective,
          directiveValue: unknown,
          compileNode: Node | Element,
          transcludeFn: ChildTranscludeOrLinkFn,
          mightHaveMultipleTransclusionError: boolean,
          previousCompileContext: PreviousCompileContext,
        ): ChildTranscludeOrLinkFn {
          const transclusionContentPlan = createTransclusionContentPlan(
            directiveValue,
            compileNode,
            transcludeFn,
            mightHaveMultipleTransclusionError,
            previousCompileContext,
          );

          emptyElement(compileNode as Element);

          const childTranscludeFn = compilationGenerator(
            mightHaveMultipleTransclusionError,
            transclusionContentPlan._nodes,
            transcludeFn,
            undefined,
            undefined,
            {
              _needsNewScope: directive._isolateScope || directive._newScope,
            },
          );

          (childTranscludeFn as ng.TranscludeFn)._slots =
            transclusionContentPlan._slots;

          return childTranscludeFn;
        }

        function resolveDirectiveTemplateValue(
          directive: InternalDirective,
          compileNodeRef: NodeRef,
          templateAttrs: Attributes,
        ): string {
          const template =
            typeof directive.template === "function"
              ? directive.template(
                  compileNodeRef.element as HTMLElement,
                  templateAttrs,
                )
              : directive.template;

          return denormalizeTemplate(template as string);
        }

        function createDirectiveTemplateNodes(
          directive: InternalDirective,
          template: string,
        ): any {
          if (isTextNode(template)) {
            return [];
          }

          const wrappedTemplate = wrapTemplate(
            directive.templateNamespace,
            trim(template),
          );

          return typeof wrappedTemplate === "string"
            ? collectElementTemplateNodes(
                createNodelistFromHTML(wrappedTemplate),
              )
            : wrappedTemplate;
        }

        function collectElementTemplateNodes(
          nodes: NodeList | NodeListOf<ChildNode>,
        ): Element[] {
          const elements: Element[] = [];

          for (let i = 0, l = nodes.length; i < l; i++) {
            const node = nodes[i];

            if (node.nodeType === NodeType._ELEMENT_NODE) {
              elements.push(node as Element);
            }
          }

          return elements;
        }

        function getSingleElementTemplateRoot(
          templateNodes: any,
          directiveName: string,
        ): Node | Element {
          const compileNode = templateNodes[0];

          if (
            templateNodes.length !== 1 ||
            compileNode.nodeType !== NodeType._ELEMENT_NODE
          ) {
            throw $compileError(
              "tplrt",
              "Template for directive '{0}' must have exactly one root element. {1}",
              directiveName,
              "",
            );
          }

          return compileNode;
        }

        function createTransclusionContentPlan(
          directiveValue: unknown,
          compileNode: Node | Element,
          transcludeFn: ChildTranscludeOrLinkFn,
          mightHaveMultipleTransclusionError: boolean,
          previousCompileContext: PreviousCompileContext,
        ): TransclusionContentPlan {
          if (directiveValue === null || typeof directiveValue !== "object") {
            return {
              _nodes:
                cloneChildNodesToTemporaryContainer(compileNode).childNodes,
              _slots: nullObject(),
            };
          }

          return createSlotTransclusionContentPlan(
            directiveValue as Record<string, string>,
            compileNode,
            transcludeFn,
            mightHaveMultipleTransclusionError,
            previousCompileContext,
          );
        }

        function cloneChildNodesToTemporaryContainer(
          compileNode: Node | Element,
        ): HTMLDivElement {
          const tempContainer = document.createElement("div");

          const { childNodes } = compileNode;

          // Clone each node individually to prevent browser DOM normalization
          // from merging adjacent text nodes.
          for (
            let childIndex = 0, childCount = childNodes.length;
            childIndex < childCount;
            childIndex++
          ) {
            tempContainer.appendChild(childNodes[childIndex].cloneNode(true));
          }

          return tempContainer;
        }

        function createSlotTransclusionContentPlan(
          directiveValue: Record<string, string>,
          compileNode: Node | Element,
          transcludeFn: ChildTranscludeOrLinkFn,
          mightHaveMultipleTransclusionError: boolean,
          previousCompileContext: PreviousCompileContext,
        ): TransclusionContentPlan {
          const tempContainer = document.createElement("div");

          const slots = nullObject();

          const slotMap = nullObject();

          const filledSlots = nullObject();

          for (const slotName in directiveValue) {
            if (!hasOwn(directiveValue, slotName)) {
              continue;
            }

            let elementSelector = directiveValue[slotName];

            const optional = elementSelector.charAt(0) === "?";

            elementSelector = optional
              ? elementSelector.substring(1)
              : elementSelector;

            slotMap[elementSelector] = slotName;
            slots[slotName] = null;
            filledSlots[slotName] = optional;
          }

          distributeTransclusionSlots(
            compileNode,
            tempContainer,
            slotMap,
            slots,
            filledSlots,
          );

          assertRequiredTransclusionSlotsFilled(filledSlots);

          compileFilledTransclusionSlots(
            slots,
            transcludeFn,
            mightHaveMultipleTransclusionError,
            previousCompileContext,
          );

          return {
            _nodes: tempContainer.childNodes,
            _slots: slots,
          };
        }

        function distributeTransclusionSlots(
          compileNode: Node | Element,
          tempContainer: HTMLDivElement,
          slotMap: Record<string, string>,
          slots: Record<string, DocumentFragment | null>,
          filledSlots: Record<string, boolean>,
        ): void {
          const { childNodes } = compileNode;

          for (
            let childIndex = 0, childCount = childNodes.length;
            childIndex < childCount;
            childIndex++
          ) {
            const node = childNodes[childIndex].cloneNode(true);

            const slotName =
              node.nodeType === NodeType._ELEMENT_NODE
                ? slotMap[normalizeDirectiveName(getNodeName(node as Element))]
                : undefined;

            if (slotName) {
              filledSlots[slotName] = true;
              slots[slotName] = slots[slotName] || createDocumentFragment();
              slots[slotName].appendChild(node);
            } else {
              tempContainer.appendChild(node);
            }
          }
        }

        function assertRequiredTransclusionSlotsFilled(
          filledSlots: Record<string, boolean>,
        ): void {
          for (const slotName in filledSlots) {
            if (!hasOwn(filledSlots, slotName)) {
              continue;
            }

            if (!filledSlots[slotName]) {
              throw $compileError(
                "reqslot",
                "Required transclusion slot `{0}` was not filled.",
                slotName,
              );
            }
          }
        }

        function compileFilledTransclusionSlots(
          slots: Record<
            string,
            DocumentFragment | null | ChildTranscludeOrLinkFn
          >,
          transcludeFn: ChildTranscludeOrLinkFn,
          mightHaveMultipleTransclusionError: boolean,
          previousCompileContext: PreviousCompileContext,
        ): void {
          for (const slotName in slots) {
            const slot = slots[slotName] as DocumentFragment | null;

            if (slot) {
              slots[slotName] = compilationGenerator(
                mightHaveMultipleTransclusionError,
                slot.childNodes,
                transcludeFn,
                undefined,
                undefined,
                previousCompileContext,
              );
            }
          }
        }

        function applyDirectiveScopeEffect(
          directive: InternalDirective,
          compileNodeRef: NodeRef,
          state: DirectiveCompileEffectState,
        ): void {
          const directiveScope = directive.scope;

          if (!directiveScope) {
            return;
          }

          // Async templates are checked when their derived sync directive is compiled.
          if (!directive.templateUrl) {
            if (directiveScope !== null && typeof directiveScope === "object") {
              assertNoDuplicate(
                "new/isolated scope",
                state._newIsolateScopeDirective || state._newScopeDirective,
                directive,
                compileNodeRef,
              );
              state._newIsolateScopeDirective = directive;
            } else {
              assertNoDuplicate(
                "new/isolated scope",
                state._newIsolateScopeDirective,
                directive,
                compileNodeRef,
              );
            }
          }

          state._newScopeDirective = state._newScopeDirective || directive;
        }

        function applyMultipleTransclusionScanEffect(
          directives: InternalDirective[],
          directiveIndex: number,
          directive: InternalDirective,
          directiveName: string,
          state: DirectiveCompileEffectState,
        ): void {
          if (
            state._didScanForMultipleTransclusion ||
            !shouldScanForMultipleTransclusion(directive, directiveName)
          ) {
            return;
          }

          state._mightHaveMultipleTransclusionError =
            hasRemainingTransclusionConflict(directives, directiveIndex + 1);
          state._didScanForMultipleTransclusion = true;
        }

        function applyDirectiveTransclusionOwnershipEffect(
          directive: InternalDirective,
          directiveName: string,
          compileNodeRef: NodeRef,
          nonTlbTranscludeDirective: ng.Directive | null | undefined,
        ): ng.Directive | null | undefined {
          // Special case ngIf and ngRepeat so that we don't complain about duplicate transclusion.
          // This option should only be used by directives that know how to safely handle element transclusion,
          // where the transcluded nodes are added or replaced after linking.
          if (isExcludedTransclusionDirective(directiveName)) {
            return nonTlbTranscludeDirective;
          }

          assertNoDuplicate(
            "transclusion",
            nonTlbTranscludeDirective,
            directive,
            compileNodeRef,
          );

          return directive;
        }

        function isExcludedTransclusionDirective(
          directiveName: string,
        ): boolean {
          return directiveName === "ngIf" || directiveName === "ngRepeat";
        }

        function isAllOrNothingAttr(name: string): boolean {
          return (
            name === "ngSrc" ||
            name === "ngSrcset" ||
            name === "src" ||
            name === "srcset"
          );
        }

        function createSyntheticDirective(
          directive: ng.Directive,
        ): InternalDirective {
          const internalDirective = directive as InternalDirective;
          internalDirective.priority = internalDirective.priority || 0;
          internalDirective.index = internalDirective.index || 0;

          return internalDirective;
        }

        function shouldScanForMultipleTransclusion(
          directive: InternalDirective,
          directiveName: string,
        ): boolean {
          const hasReplacedTemplate =
            directive.replace && (directive.templateUrl || directive.template);

          const shouldTransclude =
            directive.transclude &&
            !isExcludedTransclusionDirective(directiveName);

          return !!(hasReplacedTemplate || shouldTransclude);
        }

        function hasRemainingTransclusionConflict(
          directives: InternalDirective[],
          startIndex: number,
        ): boolean {
          for (
            let i = startIndex, directive: InternalDirective | undefined;
            ;
          ) {
            directive = directives[i++];

            if (!directive) {
              return false;
            }

            if (
              (directive.transclude &&
                !isExcludedTransclusionDirective(directive.name || "")) ||
              (directive.replace &&
                (directive.templateUrl || directive.template))
            ) {
              return true;
            }
          }
        }

        function applyDirectiveControllerEffect(
          directive: InternalDirective,
          directiveName: string,
          compileNodeRef: NodeRef,
          state: DirectiveCompileEffectState,
        ): void {
          if (directive.templateUrl || !directive.controller) {
            return;
          }

          const controllerDirectives =
            state._controllerDirectives ||
            (state._controllerDirectives = nullObject());

          assertNoDuplicate(
            `'${directiveName}' controller`,
            controllerDirectives[directiveName],
            directive,
            compileNodeRef,
          );

          controllerDirectives[directiveName] = directive;
        }

        function collectDirectiveLinkFns(
          directive: InternalDirective,
          directiveName: string,
          compileNodeRef: NodeRef,
          templateAttrs: Attributes,
          childTranscludeFn: ChildTranscludeOrLinkFn,
          preLinkFns: LinkFnRecord[],
          postLinkFns: LinkFnRecord[],
          newIsolateScopeDirective?: ng.Directive | null,
        ): void {
          try {
            const linkFn = directive.compile!(
              compileNodeRef._getAny() as HTMLElement,
              templateAttrs,
              childTranscludeFn,
            ) as CompileDirectiveLinkResult;

            appendDirectiveLinkResult(
              linkFn,
              directive,
              directiveName,
              preLinkFns,
              postLinkFns,
              newIsolateScopeDirective,
            );
          } catch (err) {
            $exceptionHandler(err);
          }
        }

        function appendDirectiveLinkResult(
          linkFn: CompileDirectiveLinkResult,
          directive: InternalDirective,
          directiveName: string,
          preLinkFns: LinkFnRecord[],
          postLinkFns: LinkFnRecord[],
          newIsolateScopeDirective?: ng.Directive | null,
        ): void {
          if (!linkFn) {
            return;
          }

          const context = directive._originalDirective || directive;

          const isolateScope =
            newIsolateScopeDirective === directive || !!directive._isolateScope;

          if (typeof linkFn === "function") {
            const linkCtx = linkFn._linkCtx;

            pushLinkFnRecord(
              postLinkFns,
              linkFn,
              directive.require,
              directiveName,
              isolateScope,
              linkCtx,
              linkCtx !== undefined ? undefined : context,
            );

            return;
          }

          const preLinkCtx = linkFn._preLinkCtx || linkFn._linkCtx;

          const postLinkCtx = linkFn._postLinkCtx || linkFn._linkCtx;

          pushLinkFnRecord(
            preLinkFns,
            linkFn.pre,
            directive.require,
            directiveName,
            isolateScope,
            preLinkCtx,
            preLinkCtx !== undefined ? undefined : context,
          );
          pushLinkFnRecord(
            postLinkFns,
            linkFn.post,
            directive.require,
            directiveName,
            isolateScope,
            postLinkCtx,
            postLinkCtx !== undefined ? undefined : context,
          );
        }

        /** Resolves required controllers from the current element or its ancestors. */
        function getControllers(
          directiveName: string,
          require: string | Array<any> | Record<string, any>,
          $element: Element | undefined,
          elementControllers: ElementControllers,
        ): any {
          let value: any;

          if (typeof require === "string") {
            const match = require.match(REQUIRE_PREFIX_REGEXP);

            if (!match) {
              return null;
            }

            const name = require.substring(match[0].length);

            const inheritType = match[1] || match[3];

            const optional = match[2] === "?";

            const originalElement = $element;

            // If only parents then start at the parent element
            if (inheritType === "^^") {
              if ($element && $element.parentElement) {
                $element = $element.parentElement;
              } else {
                $element = undefined;
              }
              // Otherwise attempt getting the controller from elementControllers in case
              // the element is transcluded (and has no data) and to avoid .data if possible
            } else {
              value = elementControllers && elementControllers[name];
              value = value && value._instance;
            }

            if (!value) {
              const dataName = `$${name}Controller`;

              if (
                inheritType === "^^" &&
                $element &&
                $element.nodeType === NodeType._DOCUMENT_NODE
              ) {
                // inheritedData() uses the documentElement when it finds the document, so we would
                // require from the element itself.
                value = null;
              } else {
                value = $element
                  ? inheritType
                    ? getInheritedData($element, dataName)
                    : getCacheData($element, dataName)
                  : undefined;
              }

              if (!value && inheritType && originalElement) {
                const futureParentElement = getInheritedData(
                  originalElement,
                  FUTURE_PARENT_ELEMENT_KEY,
                ) as Node | undefined;

                if (futureParentElement) {
                  value = getInheritedData(futureParentElement, dataName);
                }
              }
            }

            if (!value && !optional) {
              throw $compileError(
                "ctreq",
                "Controller '{0}', required by directive '{1}', can't be found!",
                name,
                directiveName,
              );
            }
          } else if (Array.isArray(require)) {
            value = [];

            for (let i = 0, ii = require.length; i < ii; i++) {
              value[i] = getControllers(
                directiveName,
                require[i],
                $element,
                elementControllers,
              );
            }
          } else if (require !== null && typeof require === "object") {
            value = {};

            for (const property in require) {
              if (!hasOwn(require, property)) {
                continue;
              }

              const controller = require[property];

              value[property] = getControllers(
                directiveName,
                controller,
                $element,
                elementControllers,
              );
            }
          }

          return value || null;
        }

        /** Instantiates and stores directive controllers for the current node. */
        function setupControllers(
          $element: NodeRef,
          attrs: Attributes,
          transcludeFn: ng.TranscludeFn,
          _controllerDirectives: Record<string, InternalDirective>,
          isolateScope: ng.Scope,
          scope: ng.Scope,
          _newIsolateScopeDirective?: InternalDirective | null,
        ): ElementControllers {
          const elementControllers: ElementControllers = nullObject();

          for (const controllerKey in _controllerDirectives) {
            const directive = _controllerDirectives[controllerKey];

            const locals: CompileControllerLocals = {
              $scope:
                directive === _newIsolateScopeDirective ||
                directive._isolateScope
                  ? isolateScope
                  : scope,
              $element: $element.node,
              $attrs: attrs,
              $transclude: transcludeFn,
            };

            let { controller } = directive;

            if (controller === "@") {
              controller = attrs[directive.name];
            }

            const controllerInstance = $controller(
              controller,
              locals,
              true,
              directive.controllerAs,
            ) as ControllerInstanceRef;

            // For directives with element transclusion the element is a comment.
            // In this case .data will not attach any data.
            // Instead, we save the controllers for the element in a local hash and attach to .data
            // later, once we have the actual element.
            elementControllers[directive.name] = controllerInstance;

            if ($element._isElement()) {
              setCacheData(
                $element.element,
                `$${directive.name}Controller`,
                controllerInstance._instance,
              );
            }
          }

          return elementControllers;
        }

        // Depending upon the context in which a directive finds itself it might need to have a new isolated
        // or child scope created. For instance:
        // * if the directive has been pulled into a template because another directive with a higher priority
        // asked for element transclusion
        // * if the directive itself asks for transclusion but it is at the root of a template and the original
        // element was replaced. See https://github.com/angular/angular.ts/issues/12936
        /** Marks a directive list with inherited isolate/new-scope metadata. */
        function markDirectiveScope(
          directives: InternalDirective[],
          isolateScope: any,
          newScope?: any,
        ): void {
          for (let j = 0, jj = directives.length; j < jj; j++) {
            directives[j] = inherit(directives[j], {
              _isolateScope: isolateScope,
              _newScope: newScope,
            });
          }
        }

        /**
         * Looks up a directive by normalized name and adds any matching definitions to the collection.
         *
         * `location` restricts which directive kinds are allowed, using the usual compile flags such as
         * `E` for elements and `A` for attributes.
         */
        function appendDirectivesForName(
          targetDirectives: DirectiveMatchList,
          name: string,
          matchLocation: DirectiveMatchLocation,
          maxPriority?: number,
        ): InternalDirective | false {
          const directives = getDirectiveDefinitions(name);

          const match = directives
            ? appendMatchingDirectives(
                targetDirectives,
                directives,
                matchLocation,
                maxPriority,
              )
            : false;

          return match;
        }

        function getDirectiveDefinitions(
          name: string,
        ): InternalDirective[] | null {
          const cachedDirectives = directiveDefinitionCache[name];

          if (cachedDirectives !== undefined) {
            return cachedDirectives;
          }

          if (!hasOwn(directiveFactoryRegistry, name)) {
            return null;
          }

          const directives =
            ($injector.get(name + DirectiveSuffix) as InternalDirective[]) ||
            EMPTY_DIRECTIVE_DEFINITIONS;

          directiveDefinitionCache[name] = directives;

          return directives;
        }

        function appendMatchingDirectives(
          targetDirectives: DirectiveMatchList,
          candidateDirectives: InternalDirective[],
          matchLocation: DirectiveMatchLocation,
          maxPriority?: number,
        ): InternalDirective | false {
          let match: InternalDirective | false = false;

          const useElementRestriction = matchLocation === "E";

          if (maxPriority === undefined) {
            if (useElementRestriction) {
              for (let i = 0, ii = candidateDirectives.length; i < ii; i++) {
                const directive = candidateDirectives[i];

                if (directive._restrictElement) {
                  ensureDirectiveBindingPlan(directive);
                  targetDirectives.push(directive);
                  match = directive;
                }
              }
            } else {
              for (let i = 0, ii = candidateDirectives.length; i < ii; i++) {
                const directive = candidateDirectives[i];

                if (directive._restrictAttribute) {
                  ensureDirectiveBindingPlan(directive);
                  targetDirectives.push(directive);
                  match = directive;
                }
              }
            }

            return match;
          }

          if (useElementRestriction) {
            for (let i = 0, ii = candidateDirectives.length; i < ii; i++) {
              const directive = candidateDirectives[i];

              if (
                directive._restrictElement &&
                maxPriority > (directive.priority as number)
              ) {
                ensureDirectiveBindingPlan(directive);
                targetDirectives.push(directive);
                match = directive;
              }
            }
          } else {
            for (let i = 0, ii = candidateDirectives.length; i < ii; i++) {
              const directive = candidateDirectives[i];

              if (
                directive._restrictAttribute &&
                maxPriority > (directive.priority as number)
              ) {
                ensureDirectiveBindingPlan(directive);
                targetDirectives.push(directive);
                match = directive;
              }
            }
          }

          return match;
        }

        function ensureDirectiveBindingPlan(
          directive: InternalDirective,
        ): void {
          if (directive._bindings) {
            return;
          }

          if (!directiveMayHaveBindings(directive)) {
            directive._bindings = EMPTY_PARSED_DIRECTIVE_BINDINGS;
            return;
          }

          const bindings = (directive._bindings = parseDirectiveBindings(
            directive,
            directive.name,
          ));

          if (
            bindings._isolateScope !== null &&
            typeof bindings._isolateScope === "object"
          ) {
            directive._isolateBindings = bindings._isolateScope;
          }
        }

        function directiveMayHaveBindings(
          directive: InternalDirective,
        ): boolean {
          return !!directive._mayHaveBindings;
        }

        /**
         * When the element is replaced with HTML template then the new attributes
         * on the template need to be merged with the existing attributes in the DOM.
         * The desired effect is to have both of the attributes present.
         *
         * @param dst - Destination attributes (original DOM).
         * @param src - Source attributes (from the directive template).
         */
        function mergeTemplateAttributes(
          dst: Attributes,
          src: Attributes,
        ): void {
          const dstAny = dst as Record<string, any>;

          const srcAny = src as Record<string, any>;

          const srcAttr = src.$attr;

          const dstAttr = dst.$attr;

          // reapply the old attributes to the new element
          for (const key in dstAny) {
            if (!hasOwn(dstAny, key)) {
              continue;
            }

            let value = dstAny[key];

            if (key[0] !== "$" && key[0] !== "_") {
              if (srcAny[key] && srcAny[key] !== value) {
                if (value.length) {
                  value += (key === "style" ? ";" : " ") + srcAny[key];
                } else {
                  value = srcAny[key];
                }
              }
              dst.$set(key, value, true, srcAttr[key]);
            }
          }

          // copy the new attributes on the old attrs object
          for (const key in srcAny) {
            if (!hasOwn(srcAny, key)) {
              continue;
            }

            const value = srcAny[key];

            // Check if we already set this attribute in the loop above.
            // `dst` will never contain hasOwnProperty as DOM parser won't let it.
            // You will get an "InvalidCharacterError: DOM Exception 5" error if you
            // have an attribute like "has-own-property" or "data-has-own-property", etc.
            if (!hasOwn(dst, key) && key.charAt(0) !== "$") {
              dstAny[key] = value;

              if (key !== "class" && key !== "style") {
                dstAttr[key] = srcAttr[key];
              }
            }
          }
        }

        /** Compiles an async `templateUrl` directive and returns a delayed node-link descriptor. */
        function compileTemplateUrl(
          directives: InternalDirective[],
          $compileNode: NodeRef,
          tAttrs: Attributes,
          $rootElement: any,
          childTranscludeFn: ChildTranscludeOrLinkFn,
          preLinkFns: LinkFnRecord[],
          postLinkFns: LinkFnRecord[],
          previousCompileContext: PreviousCompileContext,
        ): DelayedTemplateNodeLinkResult {
          const origAsyncDirective = directives.shift() as InternalDirective;

          const derivedSyncDirective = inherit(origAsyncDirective, {
            templateUrl: null,
            transclude: null,
            replace: null,
            _originalDirective: origAsyncDirective,
          }) as InternalDirective;

          let templateUrl: unknown;

          if (typeof origAsyncDirective.templateUrl === "function") {
            templateUrl = (
              origAsyncDirective.templateUrl as (
                element: Element,
                tAttrs: Attributes,
              ) => string
            ).call(
              origAsyncDirective,
              $compileNode.element as HTMLElement,
              tAttrs,
            );
          } else {
            ({ templateUrl } = origAsyncDirective);
          }

          templateUrl = stringify(templateUrl);

          if (typeof templateUrl !== "string" || !templateUrl) {
            throw $compileError(
              "tplurl",
              "Directive '{0}' produced an invalid templateUrl: {1}",
              origAsyncDirective.name,
              stringify(templateUrl),
            );
          }
          const { templateNamespace } = origAsyncDirective;

          const asyncTemplatePlan: AsyncTemplatePlan = {
            _url: templateUrl,
            _namespace: templateNamespace,
            _replace: !!origAsyncDirective.replace,
            _directiveName: origAsyncDirective.name,
          };

          const delayedState: DelayedTemplateLinkState = {
            _linkQueue: [] as any,
            _directives: directives,
            _afterTemplateChildLinkExecutor: null,
            _beforeTemplateCompileNode: $compileNode._getAny(),
            _childTranscludeFn: childTranscludeFn,
            _compileNodeRef: $compileNode,
            _derivedSyncDirective: derivedSyncDirective,
            _origAsyncDirective: origAsyncDirective,
            _postLinkFns: postLinkFns,
            _preLinkFns: preLinkFns,
            _previousCompileContext: previousCompileContext,
            _rootElement: $rootElement,
            _tAttrs: tAttrs,
            _templateUrl: templateUrl,
            _templateNamespace: templateNamespace,
            _asyncTemplatePlan: asyncTemplatePlan,
          };

          emptyElement($compileNode.element);

          requestTemplate(templateUrl)
            .then((content) => {
              handleDelayedTemplateLoaded(delayedState, content);
            })
            .catch((error) => {
              handleDelayedTemplateLoadError(delayedState, error);
            });

          return {
            _nodeLinkFn:
              executeDelayedTemplateNodeLinkPlan as StoredNodeLinkExecutor,
            _nodeLinkFnState: delayedState,
            _asyncTemplatePlan: asyncTemplatePlan,
          };
        }

        /** Throws when multiple directives request an incompatible exclusive feature on the same node. */
        function assertNoDuplicate(
          what: string,
          previousDirective:
            | ng.Directive<any>
            | InternalDirective
            | null
            | undefined,
          directive: ng.Directive<any> | InternalDirective,
          element: NodeRef,
        ): void {
          if (previousDirective) {
            throw $compileError(
              "multidir",
              "Multiple directives [{0}, {1}] asking for {3} on: {4}",
              previousDirective.name,
              directive.name,
              what,
              startingTag(element._getAny()),
            );
          }
        }

        /** Creates a synthetic text-interpolation directive for a text node. */
        function createTextInterpolateDirective(
          text: string,
        ): InternalDirective | undefined {
          if (text.indexOf(startSymbol) === -1) {
            return undefined;
          }

          const interpolateFn = $interpolate(text, true);

          if (!interpolateFn) {
            return undefined;
          }

          const { expressions } = interpolateFn;

          const watchExpression =
            buildInterpolationWatchExpression(expressions);

          const linkState: TextInterpolateLinkState = {
            _interpolateFn: interpolateFn,
            _watchExpression: watchExpression,
            _singleExpression:
              expressions.length === 1 &&
              text === startSymbol + watchExpression + endSymbol,
          };

          return {
            priority: 0,
            compile: compileTextInterpolateDirective,
            _compileState: linkState,
          } as unknown as InternalDirective;
        }

        /** Shared compile function for synthetic text-interpolation directives. */
        function compileTextInterpolateDirective(this: {
          _compileState: TextInterpolateLinkState;
        }) {
          return {
            post: textInterpolateLinkFn,
            _postLinkCtx: this._compileState,
          } as unknown as ContextualDirectivePrePost<
            never,
            TextInterpolateLinkState
          >;
        }

        /** Determines the trust context required for a DOM attribute binding. */
        function getTrustedAttrContext(
          nodeName: string,
          attrNormalizedName: string,
        ): SceContext | undefined {
          if (attrNormalizedName === "srcdoc") {
            return SCE_CONTEXTS._HTML;
          }

          // All nodes with src attributes require a RESOURCE_URL value, except for
          // img and various html5 media nodes, which require the MEDIA_URL context.
          if (attrNormalizedName === "src" || attrNormalizedName === "ngSrc") {
            if (
              ["img", "video", "audio", "source", "track"].indexOf(nodeName) ===
              -1
            ) {
              return SCE_CONTEXTS._RESOURCE_URL;
            }

            return SCE_CONTEXTS._MEDIA_URL;
          }

          if (
            nodeName === "image" &&
            (attrNormalizedName === "href" || attrNormalizedName === "ngHref")
          ) {
            return SCE_CONTEXTS._MEDIA_URL;
          }

          if (
            // Formaction
            (nodeName === "form" && attrNormalizedName === "action") ||
            // If relative URLs can go where they are not expected to, then
            // all sorts of trust issues can arise.
            (nodeName === "base" && attrNormalizedName === "href") ||
            // links can be stylesheets or imports, which can run script in the current origin
            (nodeName === "link" && attrNormalizedName === "href")
          ) {
            return SCE_CONTEXTS._RESOURCE_URL;
          }

          if (
            nodeName === "a" &&
            (attrNormalizedName === "href" || attrNormalizedName === "ngHref")
          ) {
            return SCE_CONTEXTS._URL;
          }

          return undefined;
        }

        /** Determines the trust context required for a DOM property binding. */
        function getTrustedPropContext(
          nodeName: string,
          propNormalizedName: string,
        ): SceContext | undefined {
          const prop = propNormalizedName.toLowerCase();

          return (
            PROP_CONTEXTS[`${nodeName}|${prop}`] || PROP_CONTEXTS[`*|${prop}`]
          );
        }

        /** Sanitizes a `srcset` string by trusting each URI entry individually. */
        function sanitizeSrcset(value: unknown, invokeType: string) {
          if (!value) {
            return value;
          }

          if (typeof value !== "string") {
            throw $compileError(
              "srcset",
              'Can\'t pass trusted values to `{0}`: "{1}"',
              invokeType,
              String(value),
            );
          }

          // Such values are a bit too complex to handle automatically inside the security adapter.
          // Instead, we sanitize each of the URIs individually, which works, even dynamically.
          // A single trusted media URL cannot represent a whole srcset list.
          // If you want to programmatically set explicitly trusted unsafe URLs, you should use
          // a trusted/sanitized HTML binding for the whole `img` tag and inject it using the
          // `ng-bind-html` directive.
          let result = "";

          // first check if there are spaces because it's not the same pattern
          const trimmedSrcset = trim(value);

          // Split on candidate separators, including malformed descriptor tokens such as `xyz,`.
          // Without the generic whitespace-token-comma branch, a payload like
          // `good.example/img.png xyz,evil.example/img.png` leaves the second URL unsanitized.
          const srcPattern =
            /(\s+\d+(?:\.\d+)?x\s*,|\s+\d+w\s*,|\s+[^\s,]+\s*,|\s+,|,\s+)/;

          const pattern = /\s/.test(trimmedSrcset) ? srcPattern : /(,)/;

          // split srcset into tuple of uri and descriptor except for the last item
          const rawUris = trimmedSrcset.split(pattern);

          // for each tuples
          const nbrUrisWith2parts = Math.floor(rawUris.length / 2);

          let i;

          for (i = 0; i < nbrUrisWith2parts; i++) {
            const innerIdx = i * 2;

            const uri = trim(rawUris[innerIdx]);

            // sanitize the uri
            result += uri.startsWith("unsafe:")
              ? uri
              : security.getTrustedMediaUrl(uri);
            // add the descriptor
            result += ` ${trim(rawUris[innerIdx + 1])}`;
          }

          // split the last item into uri and descriptor
          const lastTuple = trim(rawUris[i * 2]).split(/\s/);

          // sanitize the last uri
          const uri = trim(lastTuple[0]);

          result += uri.startsWith("unsafe:")
            ? uri
            : security.getTrustedMediaUrl(uri);

          // and add the last descriptor if any
          if (lastTuple.length === 2) {
            result += ` ${trim(lastTuple[1])}`;
          }

          return result;
        }

        /** Adds an `ng-prop-*` directive for the given property binding. */
        function addPropertyDirective(
          node: Element,
          directives: InternalDirective[],
          attrName: string,
          propName: string,
        ) {
          if (EVENT_HANDLER_ATTR_REGEXP.test(propName)) {
            throw $compileError(
              "nodomevents",
              "Property bindings for HTML DOM event properties are disallowed",
            );
          }

          const nodeName = getNodeName(node);

          const trustedContext = getTrustedPropContext(nodeName, propName);

          let sanitizer = (x: any) => x;

          // Sanitize img[srcset] + source[srcset] values.
          if (
            propName === "srcset" &&
            (nodeName === "img" || nodeName === "source")
          ) {
            sanitizer = (value) =>
              sanitizeSrcset(security.valueOf(value), "ng-prop-srcset");
          } else if (trustedContext) {
            sanitizer = (value) => security.getTrusted(trustedContext, value);
          }

          const directive = {
            priority: 100,
            compile: compilePropertyDirective,
            _compileState: {
              _attrName: attrName,
              _propName: propName,
              _sanitizer: sanitizer,
            } as PropertyDirectiveCompileState,
          } as unknown as InternalDirective;

          directives.push(directive);
        }

        /** Shared compile function for synthetic `ng-prop-*` directives. */
        function compilePropertyDirective(
          this: { _compileState: PropertyDirectiveCompileState },
          _: HTMLElement,
          attr: Attributes & Record<string, any>,
        ) {
          const compileState = this._compileState;

          return {
            pre: propertyDirectivePreLinkFn,
            _preLinkCtx: {
              _attrName: compileState._attrName,
              _propName: compileState._propName,
              _ngPropGetter: $parse(attr[compileState._attrName]),
              _sanitizer: compileState._sanitizer,
            },
          } as unknown as ContextualDirectivePrePost<PropertyDirectiveLinkState>;
        }

        /** Adds an interpolated-attribute directive for the given attribute value. */
        function addAttrInterpolateDirective(
          node: Element,
          directives: InternalDirective[],
          value: string,
          name: string,
          isNgAttr: boolean,
        ) {
          if (!isNgAttr && value.indexOf(startSymbol) === -1) {
            return;
          }

          const nodeName = getNodeName(node);

          const trustedContext = getTrustedAttrContext(nodeName, name);

          const mustHaveExpression = !isNgAttr;

          const allOrNothing = isNgAttr || isAllOrNothingAttr(name);

          const interpolateFn = $interpolate(
            value,
            mustHaveExpression,
            trustedContext,
            allOrNothing,
          ) as InterpolationFunction | undefined;

          // no interpolation found -> ignore
          if (!interpolateFn) {
            return;
          }

          if (name === "multiple" && nodeName === "select") {
            throw $compileError(
              "selmulti",
              "Binding to the 'multiple' attribute is not supported. Element: {0}",
              startingTag(node.outerHTML),
            );
          }

          if (EVENT_HANDLER_ATTR_REGEXP.test(name)) {
            throw $compileError(
              "nodomevents",
              "Interpolations for HTML DOM event attributes are disallowed",
            );
          }

          const directive = {
            priority: 100,
            compile: compileAttrInterpolateDirective,
            _compileState: {
              _name: name,
              _value: value,
              _trustedContext: trustedContext,
              _allOrNothing: allOrNothing,
              _isNgAttr: isNgAttr,
              _interpolateFn: interpolateFn,
            } as AttrInterpolateLinkState,
          } as unknown as InternalDirective;

          directives.push(directive);
        }

        /** Shared compile function for synthetic interpolated-attribute directives. */
        function compileAttrInterpolateDirective(this: {
          _compileState: AttrInterpolateLinkState;
        }) {
          return {
            pre: attrInterpolatePreLinkFn,
            _preLinkCtx: this._compileState,
          } as unknown as ContextualDirectivePrePost<AttrInterpolateLinkState>;
        }

        /** Enforces strict component binding requirements for required attributes. */
        function strictBindingsCheck(
          attrName: string,
          directiveName: string,
        ): void {
          if (strictComponentBindingsEnabled) {
            throw $compileError(
              "missingattr",
              "Attribute '{0}' of '{1}' is non-optional and must be set!",
              attrName,
              directiveName,
            );
          }
        }

        /**
         * Sets up `$watch` and `$observe` wiring for isolate-scope and controller bindings.
         */
        function initializeDirectiveBindings(
          scope: Scope,
          attrs: Attributes,
          destination: Scope,
          bindings: IsolateBindingMap | null | undefined,
          directive: InternalDirective,
        ): DirectiveBindingInfo {
          const removeWatchCollection: Array<Function | undefined> = [];

          const initialChanges: Record<string, SimpleChange> = {};

          const attrsAny = attrs as any;

          const destAny = destination as any;

          const scopeTarget = scope.$target as Record<string, any>;

          const destinationTarget = destAny.$target as Record<string, any>;

          const attrsObservers =
            attrs._observers || (attrs._observers = nullObject() as any);

          const bindingChangeState: DirectiveBindingChangeState = {
            _destAny: destAny,
            _onChangesQueue: onChangesQueueState,
            _scope: scope,
          };

          if (bindings) {
            for (const scopeName in bindings) {
              if (!hasOwn(bindings, scopeName)) {
                continue;
              }

              const definition = bindings[scopeName];

              const {
                _attrName: attrName,
                _optional: optional,
                _mode: mode, // @, =, <, or &
              } = definition;

              let lastValue: any;

              let parentGet: any;

              let parentSet: any;

              let compare: any;

              let removeWatch: Function | undefined;

              switch (mode) {
                case "@":
                  if (!optional && !hasOwn(attrs, attrName)) {
                    strictBindingsCheck(attrName, directive.name);
                    destAny[scopeName] = attrsAny[attrName] = undefined;
                  }

                  const stringBindingState: StringBindingState = {
                    _bindingChangeState: bindingChangeState,
                    _destAny: destAny,
                    _firstCall: true,
                    _firstChange: true,
                    _scopeName: scopeName,
                  };

                  removeWatch = attrs.$observe(attrName, (value) =>
                    handleStringBindingObserve(stringBindingState, value),
                  );
                  attrsObservers[attrName]!._scope = scope;
                  lastValue = attrsAny[attrName];

                  if (typeof lastValue === "string") {
                    // If the attribute has been provided then we trigger an interpolation to ensure
                    // the value is there for use in the link fn
                    destAny[scopeName] = (
                      $interpolate(lastValue) as InterpolationFunction
                    )(scope);
                  } else if (typeof lastValue === "boolean") {
                    // If the attributes is one of the BOOLEAN_ATTR then AngularTS will have converted
                    // the value to boolean rather than a string, so we special case this situation
                    destAny[scopeName] = lastValue;
                  }

                  initialChanges[scopeName] = {
                    currentValue: destAny[scopeName],
                    firstChange: true,
                  };
                  removeWatchCollection.push(removeWatch);
                  break;

                case "=": {
                  if (!hasOwn(attrs, attrName)) {
                    if (optional) {
                      break;
                    }
                    strictBindingsCheck(attrName, directive.name);
                    attrsAny[attrName] = undefined;
                  }

                  if (optional && !attrsAny[attrName]) {
                    break;
                  }

                  const attr = attrsAny[attrName];

                  parentGet = attr && $parse(attr);

                  if (parentGet && parentGet._literal) {
                    compare = equals;
                  } else {
                    compare = simpleCompare;
                  }

                  parentSet =
                    (parentGet && parentGet._assign) ||
                    function () {
                      throw $compileError(
                        "nonassign",
                        "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!",
                        attrsAny[attrName],
                        attrName,
                        directive.name,
                      );
                    };
                  // store the value that the parent scope had after the last check:
                  const initialValue = parentGet && parentGet(scopeTarget);

                  lastValue = destinationTarget[scopeName] = Array.isArray(
                    initialValue,
                  )
                    ? createScope(initialValue, destination.$handler)
                    : initialValue;

                  const twoWayBindingState: TwoWayBindingState = {
                    _attrName: attrName,
                    _attrsAny: attrsAny,
                    _compare: compare,
                    _destAny: destAny,
                    _destinationTarget: destinationTarget,
                    _directiveName: directive.name,
                    _lastValue: lastValue,
                    _parentGet: parentGet,
                    _parentSet: parentSet,
                    _scope: scope,
                    _scopeName: scopeName,
                    _scopeTarget: scopeTarget,
                  };

                  if (attrsAny[attrName]) {
                    const expr = attrsAny[attrName];

                    const syncParentValue = $parse(expr, (parentValue: any) =>
                      syncTwoWayParentValue(twoWayBindingState, parentValue),
                    );

                    // make it lazy as we dont want to trigger the two way data binding at this point
                    scope.$watch(
                      expr,
                      (val) =>
                        handleTwoWayExpressionChange(
                          twoWayBindingState,
                          syncParentValue,
                          val,
                        ),
                      true,
                    );
                  }

                  removeWatch = destination.$watch(
                    attrName,
                    (val) =>
                      handleTwoWayDestinationChange(twoWayBindingState, val),
                    true,
                  );
                  removeWatchCollection.push(removeWatch);
                  break;
                }

                case "<":
                  if (!hasOwn(attrs, attrName)) {
                    if (optional) {
                      break;
                    }
                    strictBindingsCheck(attrName, directive.name);
                    attrsAny[attrName] = undefined;
                  }

                  if (optional && !attrsAny[attrName]) {
                    break;
                  }

                  parentGet = attrsAny[attrName] && $parse(attrsAny[attrName]);

                  const initialOneWayValue =
                    parentGet && parentGet(scopeTarget);

                  destAny.$target[scopeName] =
                    parentGet?._literal ||
                    initialOneWayValue === null ||
                    typeof initialOneWayValue !== "object"
                      ? initialOneWayValue
                      : createScope(initialOneWayValue, scope.$handler);
                  const oneWayBindingState: OneWayBindingState = {
                    _bindingChangeState: bindingChangeState,
                    _destAny: destAny,
                    _firstChange: true,
                    _literal: !!parentGet?._literal,
                    _parentGet: parentGet,
                    _scopeName: scopeName,
                    _scopeTarget: scopeTarget,
                  };

                  oneWayBindingState._lastInputs =
                    evaluateOneWayBindingInputs(oneWayBindingState);

                  initialChanges[scopeName] = {
                    currentValue: destAny.$target[scopeName],
                    firstChange: oneWayBindingState._firstChange,
                  };
                  scope.$target.attrs = attrs;

                  if (attrsAny[attrName]) {
                    removeWatch = scope.$watch(
                      attrsAny[attrName],
                      (val) =>
                        handleOneWayBindingChange(oneWayBindingState, val),
                      true,
                    );
                    removeWatchCollection.push(removeWatch);
                  }
                  break;

                case "&":
                  if (!optional && !hasOwn(attrs, attrName)) {
                    strictBindingsCheck(attrName, directive.name);
                  }
                  // Don't assign Object.prototype method to scope
                  parentGet = hasOwn(attrs, attrName)
                    ? $parse(attrsAny[attrName])
                    : undefined;

                  // Don't assign noop to destination if expression is not valid
                  if (!parentGet && optional) {
                    break;
                  }

                  const expressionBindingState = {
                    _parentGet: parentGet,
                    _scopeTarget: scopeTarget,
                  } as ExpressionBindingState;

                  destAny.$target[scopeName] = function (locals: any) {
                    return invokeExpressionBinding(
                      expressionBindingState,
                      locals,
                    );
                  };

                  break;
              }
            }
          }

          return {
            _initialChanges: initialChanges,
            _removeWatches:
              removeWatchCollection.length > 0
                ? () => removeDirectiveBindingWatches(removeWatchCollection)
                : undefined,
          };
        }
      },
    ];
  }
}

/** Validates a directive/component name before registration. */
function assertValidDirectiveName(name: string): void {
  const letter = name.charAt(0);

  if (!letter || letter !== letter.toLowerCase()) {
    throw $compileError(
      "baddir",
      "Directive/Component name '{0}' is invalid. The first character must be a lowercase letter",
      name,
    );
  }

  if (name !== name.trim()) {
    throw $compileError(
      "baddir",
      "Directive/Component name '{0}' is invalid. The name should not contain leading or trailing whitespaces",
      name,
    );
  }
}

/**
 * Normalizes the `require` declaration for a directive.
 * Object-form requires inherit their own key when the value omits the directive name
 * (e.g. `{ foo: "^^" }` becomes `{ foo: "^^foo" }`).
 */
export function getDirectiveRequire(
  directive: ng.Directive,
): string | Array<any> | Record<string, string> | undefined {
  const require = directive.require || (directive.controller && directive.name);

  if (
    !Array.isArray(require) &&
    require !== null &&
    typeof require === "object"
  ) {
    for (const key in require) {
      if (!hasOwn(require, key)) {
        continue;
      }

      const value = require[key];

      const match = value.match(REQUIRE_PREFIX_REGEXP);

      if (!match) continue;

      const name = value.substring(match[0].length);

      if (!name) {
        require[key] = match[0] + key;
      }
    }
  }

  return require;
}

/**
 * Validates and normalizes a directive `restrict` value.
 */
export function getDirectiveRestrict(restrict: unknown, name: string): string {
  if (restrict && !(typeof restrict === "string" && /[EA]/.test(restrict))) {
    throw $compileError(
      "badrestrict",
      "Restrict property '{0}' of directive '{1}' is invalid",
      restrict,
      name,
    );
  }

  return typeof restrict === "string" ? restrict : "EA";
}

/**
 * Detects the namespace used when compiling child nodes beneath a parent element.
 * This is primarily used to decide whether template wrapping should happen in HTML or SVG mode.
 */
export function detectNamespaceForChildElements(
  parentElement: Element | Node | null | undefined,
): "html" | "svg" {
  const node = parentElement;

  if (!node) {
    return "html";
  }

  return (node.nodeType !== NodeType._ELEMENT_NODE ||
    getNodeName(node as Element) !== "foreignobject") &&
    toString.call(node).match(/SVG/)
    ? "svg"
    : "html";
}

/**
 * Builds a stable node array for linking so index-based mappings stay valid even if DOM shape changes.
 */
export function buildStableNodeList(
  plan: TemplateLinkPlan,
  nodeRef: TemplatePlanNodeList,
): Node[] {
  const nodeRefIsNodeRef = nodeRef instanceof NodeRef;

  const stableNodeList = new Array(plan._linkMappings.length);

  for (let i = 0, l = plan._linkMappings.length; i < l; i++) {
    const { _index: idx } = plan._linkMappings[i];

    stableNodeList[i] = nodeRefIsNodeRef
      ? (nodeRef._getIndex(idx) as Node)
      : nodeRef[idx];
  }

  return stableNodeList;
}

/**
 * Serializes one or more interpolation inputs into the watch expression used by `$watch`.
 * Single expressions stay unchanged; multi-input interpolations are packed into an array expression.
 */
export function buildInterpolationWatchExpression(
  expressions: string[],
): string {
  return expressions.length === 1
    ? expressions[0]
    : `[${expressions.join(",")}]`;
}

/**
 * Writes the interpolated text result to either an element node or a text node.
 */
export function applyTextInterpolationValue(node: Node, value: string): void {
  switch (node.nodeType) {
    case NodeType._ELEMENT_NODE:
      (node as Element).innerHTML = value;
      break;
    default:
      node.nodeValue = value;
  }
}

/**
 * Sorts directives by priority, then name, then registration index.
 * This matches the compiler's directive application order.
 */
export function byPriority(a: InternalDirective, b: InternalDirective): number {
  const diff = (b.priority || 0) - (a.priority || 0);

  if (diff !== 0) {
    return diff;
  }

  if (a.name !== b.name) {
    return a.name < b.name ? -1 : 1;
  }

  return (a.index || 0) - (b.index || 0);
}

/**
 * Wraps non-HTML templates in a temporary namespace container so the browser parses SVG/MathML correctly.
 */
export function wrapTemplate(
  type: string | undefined,
  template: string,
): string | NodeListOf<ChildNode> {
  type = (type || "html").toLowerCase();

  switch (type) {
    case "svg":
    case "math": {
      const wrapper = document.createElement("div");

      wrapper.innerHTML = `<${type}>${template}</${type}>`;

      return wrapper.childNodes[0].childNodes;
    }
    default:
      return template;
  }
}

/**
 * Replaces the node currently represented by `elementsToRemove` while preserving the removed nodes
 * in a fragment so traversal and later queries continue to work during compilation.
 */
export function replaceWith(
  elementsToRemove: NodeRef,
  newNode: Node | Element | ChildNode,
  index?: number,
): void {
  const firstElementToRemove = elementsToRemove._getAny();

  const parent = firstElementToRemove.parentNode;

  if (parent) {
    if (index !== undefined) {
      const oldChild = parent.childNodes[index];

      if (oldChild) {
        parent.replaceChild(newNode, oldChild);
      }
    } else {
      parent.replaceChild(newNode, firstElementToRemove);
    }
  }

  const fragment = createDocumentFragment();

  const removedElements = elementsToRemove._collection();

  for (let i = 0, l = removedElements.length; i < l; i++) {
    fragment.appendChild(removedElements[i]);
  }

  elementsToRemove.node = newNode;
}
