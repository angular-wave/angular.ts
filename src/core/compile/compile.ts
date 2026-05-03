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
  arrayFrom,
  assertArg,
  assertNotHasOwnProperty,
  deProxy,
  directiveNormalize,
  entries,
  equals,
  extend,
  getNodeName,
  hasOwn,
  inherit,
  isArray,
  isBoolean,
  isDefined,
  isError,
  isFunction,
  isInstanceOf,
  isObject,
  isScope,
  isUndefined,
  keys,
  minErr,
  nullObject,
  simpleCompare,
  stringify,
  trim,
  isString,
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
export interface LinkFnMapping {
  /** @internal */
  _index: number;
  /** @internal */
  _nodeLinkFnCtx?: NodeLinkFnCtx;
  /** @internal */
  _childLinkFn?: ChildLinkFn | CompositeLinkFn | null;
}

/**
 * Compiles a node (or list of nodes) into a single composite link function.
 */
export type CompileNodesFn = (
  nodeRefList: NodeRef | NodeList | null,
  transcludeFn?: ChildTranscludeOrLinkFn,
  maxPriority?: number,
  ignoreDirective?: string,
  previousCompileContext?: PreviousCompileContext | null,
) => CompositeLinkFn | null;

export type ChildLinkFn = (
  scope: Scope,
  nodeRef: NodeRef | NodeList,
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
  /** @internal */
  _nodeLinkFn: NodeLinkFn | StoredNodeLinkFn;
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

/**
 * Function that applies directives to a node and returns a NodeLinkFn.
 */
export type ApplyDirectivesToNodeFn = () => NodeLinkFn;

/**
 * Function that aggregates all linking functions for a compilation root (nodeList).
 */
export type CompositeLinkFn = (
  scope: Scope,
  $linkNode: NodeRef | NodeList,
  _parentBoundTranscludeFn?: BoundTranscludeFn | null,
) => void;

/**
 * Internal compile bookkeeping passed through compile/compileNodes/applyDirectivesToNode.
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

export type DirectiveRegistry = Record<string, ng.DirectiveFactory[]>;

export type DirectiveLookupCache = Record<string, InternalDirective[]>;

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
  _scopeName: string;
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
  if (!scope || !isFunction(scope.$on)) {
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

      refs.forEach((ref) => ref._release());
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

export type DelayedTemplateLinkQueueEntry = [
  Scope,
  Node | Element,
  BoundTranscludeFn | null | undefined,
];

export type DelayedTemplateLinkQueue = Array<
  Scope | Node | Element | BoundTranscludeFn | null | undefined
>;

export interface DelayedTemplateLinkState {
  /** @internal */
  _linkQueue: DelayedTemplateLinkQueue | null;
  /** @internal */
  _directives: InternalDirective[];
  /** @internal */
  _afterTemplateNodeLinkFnCtx?: NodeLinkFnCtx;
  /** @internal */
  _afterTemplateChildLinkFn: CompositeLinkFn | ChildLinkFn | null;
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
  _compiledNode?: Element;
}

export interface DelayedTemplateNodeLinkResult {
  /** @internal */
  _nodeLinkFn: StoredNodeLinkFn;
  /** @internal */
  _nodeLinkFnState: DelayedTemplateLinkState;
}

export interface CompositeLinkState {
  /** @internal */
  _linkFnsList: LinkFnMapping[];
  /** @internal */
  _nodeRefList?: NodeRef | null;
  /** @internal */
  _nodeLinkFnFound?: NodeLinkFn | StoredNodeLinkFn;
  /** @internal */
  _transcludeFn?: ChildTranscludeOrLinkFn;
}

export interface PublicLinkState {
  /** @internal */
  _nodeRef: NodeRef | null;
  /** @internal */
  _compositeLinkFn: CompositeLinkFn | null;
  /** @internal */
  _namespace: string | null;
  /** @internal */
  _previousCompileContext?: PreviousCompileContext | null;
}

const $compileMinErr = minErr("$compile");

const EXCLUDED_DIRECTIVES = ["ngIf", "ngRepeat"];

const ALL_OR_NOTHING_ATTRS = ["ngSrc", "ngSrcset", "src", "srcset"];

const REQUIRE_PREFIX_REGEXP = /^(?:(\^\^?)?(\?)?(\^\^?)?)?/;

const NG_PREFIX_BINDING = /^ng(Attr|Prop|On|Observe|Window)([A-Z].*)$/;

// Ref: http://developers.whatwg.org/webappapis.html#event-handler-idl-attributes
// The assumption is that future DOM event attribute names will begin with
// 'on' and be composed of only English letters.
const EVENT_HANDLER_ATTR_REGEXP = /^(on[a-z]+|formaction)$/;

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

    const hasDirectives: DirectiveRegistry = {};

    const bindingCache = nullObject() as Record<string, IsolateBinding>;

    const directiveLookupCache: DirectiveLookupCache = nullObject();

    /** Parses isolate-scope or controller binding definitions for a directive. */
    function parseIsolateBindings(
      scope: Record<string, string>,
      directiveName: string,
      isController: boolean,
    ): IsolateBindingMap {
      const LOCAL_REGEXP = /^([@&]|[=<]())(\??)\s*([\w$]*)$/;

      const bindings = nullObject() as IsolateBindingMap;

      const scopeNames = keys(scope);

      for (let i = 0, l = scopeNames.length; i < l; i++) {
        const scopeName = scopeNames[i];

        let definition = scope[scopeName];

        definition = definition.trim();

        if (definition in bindingCache) {
          bindings[scopeName] = bindingCache[definition];

          continue;
        }
        const match = definition.match(LOCAL_REGEXP);

        if (!match) {
          throw $compileMinErr(
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

        bindings[scopeName] = {
          _mode: match[1][0],
          _collection: match[2] === "*",
          _optional: match[3] === "?",
          _attrName: match[4] || scopeName,
        };

        if (match[4]) {
          bindingCache[definition] = bindings[scopeName];
        }
      }

      return bindings;
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

      if (isObject(directive.scope)) {
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

      if (isObject(directive.bindToController)) {
        bindings._bindToController = parseIsolateBindings(
          directive.bindToController,
          directiveName,
          true,
        );
      }

      if (bindings._bindToController && !directive.controller) {
        // There is no controller
        throw $compileMinErr(
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

      if (isString(name)) {
        assertNotHasOwnProperty(name, "directive");
        assertValidDirectiveName(name);
        assertArg(directiveFactory, "directiveFactory");
        const normalizedDirectiveFactory =
          directiveFactory as ng.DirectiveFactory;

        if (!hasOwn(hasDirectives, name)) {
          hasDirectives[name] = [];
          $provide.factory(name + DirectiveSuffix, [
            _injector,
            _exceptionHandler,
            /** Instantiates and normalizes the registered directive factories for one name. */
            function (
              $injector: ng.InjectorService,
              $exceptionHandler: ng.ExceptionHandlerService,
            ) {
              const directives: InternalDirective[] = [];

              for (let i = 0, l = hasDirectives[name].length; i < l; i++) {
                const directiveFactoryInstance = hasDirectives[name][i];

                try {
                  let directive = $injector.invoke(
                    directiveFactoryInstance as any,
                  ) as ng.Directive | Function;

                  if (isFunction(directive)) {
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
                  normalizedDirective.restrict = getDirectiveRestrict(
                    normalizedDirective.restrict,
                    name,
                  );

                  directives.push(normalizedDirective);
                } catch (err) {
                  $exceptionHandler(err);
                }
              }

              return directives;
            },
          ]);
        }
        hasDirectives[name].push(normalizedDirectiveFactory);
        delete directiveLookupCache[name];
      } else {
        entries(name).forEach(([k, v]) =>
          provider.directive(k, v as ng.DirectiveFactory),
        );
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
      if (!isString(name)) {
        entries(name).forEach(([key, val]) =>
          provider.component(key, val as Component),
        );

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
          if (isFunction(fn) || isArray(fn)) {
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
        entries(componentOptions).forEach(([key, val]) => {
          if (key.charAt(0) === "$") {
            (ddo as Record<string, any>)[key] = val;
          }
        });

        return ddo;
      }

      // Copy any annotation properties (starting with $) over to the factory and controller constructor functions
      // These could be used by libraries such as the new component router
      entries(componentOptions).forEach(([key, val]) => {
        if (key.charAt(0) === "$") {
          (factory as Record<string, any>)[key] = val;

          // Don't try to copy over annotations to named controller
          if (isFunction(controller)) {
            (controller as Record<string, any>)[key] = val;
          }
        }
      });

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
        if (isDefined(enabled)) {
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
        throw $compileMinErr(
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
        items.forEach((v) => {
          PROP_CONTEXTS[v.toLowerCase()] = ctx;
        });
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
          if (!isFunction(state._destAny.$onChanges)) {
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
          throw $compileMinErr(
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
            !isUndefined(state._attrsAny[state._attrName])
          ) {
            return;
          }

          if (
            (state._parentGet &&
              !!state._parentGet._inputs &&
              !state._parentGet._literal) ||
            (isUndefined(state._attrsAny[state._attrName]) && isDefined(val))
          ) {
            state._destinationTarget[state._scopeName] = state._lastValue;
            throwNonassignBindingError(state);
          }

          if (isObject(val)) {
            const valueKeys = keys(val);

            for (let i = 0, l = valueKeys.length; i < l; i++) {
              const key = valueKeys[i];

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
          if (!isString(value) && !isBoolean(value)) {
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
          state._destAny.$target[state._scopeName] = val;
          recordDirectiveBindingChange(
            state._bindingChangeState,
            state._scopeName,
            val,
            state._firstChange,
          );

          if (state._firstChange) {
            state._firstChange = false;
          }
        }

        function invokePublicLink(
          state: PublicLinkState,
          scope: Scope,
          cloneConnectFn?: CloneAttachFn,
          options?: TemplateLinkingFunctionOptions,
        ) {
          const { _nodeRef: nodeRef } = state;

          if (!nodeRef) {
            throw $compileMinErr(
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

          if (state._compositeLinkFn) {
            state._compositeLinkFn(scope, $linkNode, _parentBoundTranscludeFn);
          }

          if (!cloneConnectFn) {
            state._nodeRef = null;
            state._compositeLinkFn = null;
          }

          return $linkNode._getAll();
        }

        function invokeCompositeLink(
          state: CompositeLinkState,
          scope: Scope,
          nodeRef: NodeRef | NodeList,
          _parentBoundTranscludeFn?: BoundTranscludeFn | null,
        ): void {
          const stableNodeList = buildStableNodeList(state, nodeRef);

          linkCompositeNodes(
            state,
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
          const publicLinkState: PublicLinkState = {
            _nodeRef: element ? new NodeRef(element) : null,
            _compositeLinkFn: null,
            _namespace: null,
            _previousCompileContext: previousCompileContext || null,
          };

          publicLinkState._compositeLinkFn = compileNodes(
            publicLinkState._nodeRef,
            transcludeFn || undefined,
            maxPriority,
            ignoreDirective,
            previousCompileContext,
          );

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
        function linkCompositeNodes(
          state: CompositeLinkState,
          stableNodeList: Node[],
          scope: Scope,
          _parentBoundTranscludeFn: BoundTranscludeFn | null,
        ): void {
          for (let i = 0, l = state._linkFnsList.length; i < l; i++) {
            const { _index, _nodeLinkFnCtx, _childLinkFn } =
              state._linkFnsList[i];

            const node = stableNodeList[_index];

            let childScope: Scope;

            let childBoundTranscludeFn: BoundTranscludeFn | null;

            if (_nodeLinkFnCtx?._nodeLinkFn) {
              childScope = _nodeLinkFnCtx._newScope ? scope.$new() : scope;

              if (_nodeLinkFnCtx._transcludeOnThisElement) {
                childBoundTranscludeFn = createBoundTranscludeFn(
                  scope,
                  _nodeLinkFnCtx._transclude as ng.TranscludeFn,
                  _parentBoundTranscludeFn || null,
                );
              } else if (
                !_nodeLinkFnCtx._templateOnThisElement &&
                _parentBoundTranscludeFn
              ) {
                childBoundTranscludeFn = _parentBoundTranscludeFn;
              } else if (!_parentBoundTranscludeFn && state._transcludeFn) {
                childBoundTranscludeFn = createBoundTranscludeFn(
                  scope,
                  state._transcludeFn as ng.TranscludeFn,
                  null,
                );
              } else {
                childBoundTranscludeFn = null;
              }

              if (
                _nodeLinkFnCtx?._newScope &&
                node.nodeType === NodeType._ELEMENT_NODE
              ) {
                setScope(node, childScope);
              }

              if (isDefined(_nodeLinkFnCtx._nodeLinkFnState)) {
                (_nodeLinkFnCtx._nodeLinkFn as StoredNodeLinkFn)(
                  _nodeLinkFnCtx._nodeLinkFnState,
                  _childLinkFn,
                  childScope,
                  node,
                  childBoundTranscludeFn,
                );
              } else {
                (_nodeLinkFnCtx._nodeLinkFn as NodeLinkFn)(
                  _childLinkFn,
                  childScope,
                  node,
                  childBoundTranscludeFn,
                );
              }
            } else if (_childLinkFn) {
              _childLinkFn(scope, node.childNodes, _parentBoundTranscludeFn);
            }
          }
        }

        function isNodeRef(value: NodeRef | NodeList): value is NodeRef {
          return isInstanceOf(value, NodeRef);
        }

        function getCompileNodeListSize(nodes: NodeRef | NodeList): number {
          return isNodeRef(nodes) ? nodes.size : nodes.length;
        }

        function getCompileNodeAt(
          nodes: NodeRef | NodeList,
          index: number,
        ): Element | Node | ChildNode {
          return isNodeRef(nodes) ? nodes._getIndex(index) : nodes[index];
        }

        function ensureCompileNodeRef(nodes: NodeRef | NodeList): NodeRef {
          return isNodeRef(nodes) ? nodes : new NodeRef(nodes);
        }

        /**
         * Compiles a `NodeRef` into a composite linking function.
         *
         * Walks each node, applies directives, recursively compiles children when needed,
         * and returns a stable composite linker for the whole node list.
         */
        function compileNodes(
          nodeRefList: Parameters<CompileNodesFn>[0],
          transcludeFn?: Parameters<CompileNodesFn>[1],
          maxPriority?: Parameters<CompileNodesFn>[2],
          ignoreDirective?: Parameters<CompileNodesFn>[3],
          previousCompileContext?: Parameters<CompileNodesFn>[4],
        ): ReturnType<CompileNodesFn> {
          if (!nodeRefList) return null;
          const linkFnsList: LinkFnMapping[] = []; // An array to hold node indices and their linkFns

          let nodeRefListContext = isNodeRef(nodeRefList) ? nodeRefList : null;

          let nodeLinkFnFound: NodeLinkFn | StoredNodeLinkFn | undefined;

          let linkFnFound = false;

          for (let i = 0, l = getCompileNodeListSize(nodeRefList); i < l; i++) {
            const compileNode = getCompileNodeAt(nodeRefList, i);

            const attrs = new Attributes($injector, $exceptionHandler);

            const directives = collectDirectives(
              compileNode as Element,
              attrs,
              i === 0 ? maxPriority : undefined,
              ignoreDirective,
            );

            let nodeLinkFnCtx: NodeLinkFnCtx | undefined;

            if (directives.length) {
              nodeRefListContext =
                nodeRefListContext || ensureCompileNodeRef(nodeRefList);

              nodeLinkFnCtx = applyDirectivesToNode(
                directives,
                compileNode,
                attrs,
                transcludeFn as ChildTranscludeOrLinkFn,
                null,
                [],
                [],
                assign({}, previousCompileContext, {
                  _index: i,
                  _parentNodeRef: nodeRefListContext,
                  _ctxNodeRef: nodeRefListContext,
                }),
              );
            }

            let childLinkFn: CompositeLinkFn | ChildLinkFn | null;

            const nodeLinkFn = nodeLinkFnCtx?._nodeLinkFn;

            const childParentNode = nodeRefListContext
              ? nodeRefListContext._getIndex(i)
              : compileNode;

            const { childNodes } = childParentNode;

            if (
              (nodeLinkFn && nodeLinkFnCtx?._terminal) ||
              !childNodes ||
              !childNodes.length
            ) {
              childLinkFn = null;
            } else {
              const transcluded = nodeLinkFn
                ? nodeLinkFnCtx?._transcludeOnThisElement ||
                  !nodeLinkFnCtx?._templateOnThisElement
                  ? nodeLinkFnCtx?._transclude
                  : undefined
                : transcludeFn;

              childLinkFn = compileNodes(
                childNodes,
                transcluded || undefined,
                undefined,
                undefined,
                undefined,
              );
            }

            if (nodeLinkFn || childLinkFn) {
              linkFnsList.push({
                _index: i,
                _nodeLinkFnCtx: nodeLinkFnCtx,
                _childLinkFn: childLinkFn,
              });
              linkFnFound = true;
              nodeLinkFnFound = nodeLinkFnFound || nodeLinkFn;
            }

            // use the previous context only for the first element in the virtual group
            previousCompileContext = null;
          }

          if (!linkFnFound) {
            return null;
          }

          const compositeLinkState: CompositeLinkState = {
            _linkFnsList: linkFnsList,
            _nodeRefList: nodeRefListContext,
            _nodeLinkFnFound: nodeLinkFnFound,
            _transcludeFn: transcludeFn,
          };

          const compositeLinkFn = function compositeLinkFn(
            scope,
            nodeRef,
            _parentBoundTranscludeFn,
          ) {
            invokeCompositeLink(
              (
                compositeLinkFn as CompositeLinkFn & {
                  _state?: CompositeLinkState;
                }
              )._state as CompositeLinkState,
              scope,
              nodeRef,
              _parentBoundTranscludeFn,
            );
          } as CompositeLinkFn & {
            /** @internal */
            _state?: CompositeLinkState;
          };

          compositeLinkFn._state = compositeLinkState;

          return compositeLinkFn;
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
        function collectDirectives(
          node: Element,
          attrs: Attributes,
          maxPriority?: number,
          ignoreDirective?: string,
        ): InternalDirective[] {
          const directives: InternalDirective[] = [];

          const { nodeType } = node;

          const attrsMap = attrs.$attr;

          let nodeName;

          switch (nodeType) {
            case NodeType._ELEMENT_NODE /* Element */: {
              nodeName = getNodeName(node);

              if (ignoreDirective !== directiveNormalize(nodeName)) {
                // use the node name: <directive>
                addDirective(
                  directives,
                  directiveNormalize(nodeName),
                  "E",
                  maxPriority,
                );
              }

              // iterate over the attributes
              const nodeAttributes = node.attributes;

              for (
                let j = 0, nodeAttributesLength = nodeAttributes?.length || 0;
                j < nodeAttributesLength;
                j++
              ) {
                let isNgAttr = false;

                let isNgProp = false;

                let isNgEvent = false;

                let isNgObserve = false;

                let isWindow = false;

                const attr = nodeAttributes[j];

                let { name } = attr;

                const { value } = attr;

                let nName = directiveNormalize(name.toLowerCase());

                // Support ng-attr-*, ng-prop-* and ng-on-*
                const ngPrefixMatch = nName.match(NG_PREFIX_BINDING);

                if (ngPrefixMatch) {
                  isNgAttr = ngPrefixMatch[1] === "Attr";
                  isNgProp = ngPrefixMatch[1] === "Prop";
                  isNgEvent = ngPrefixMatch[1] === "On";
                  isNgObserve = ngPrefixMatch[1] === "Observe";
                  isWindow = ngPrefixMatch[1] === "Window";

                  // Normalize the non-prefixed name
                  name = name
                    .replace(PREFIX_REGEXP, "")
                    .toLowerCase()
                    .substring(4 + ngPrefixMatch[1].length)
                    .replace(/_(.)/g, (match, letter) => letter.toUpperCase());
                }

                if (isNgProp || isNgEvent || isWindow) {
                  attrs[nName] = value;
                  attrsMap[nName] = attr.name;

                  if (isNgProp) {
                    addPropertyDirective(node, directives, nName, name);
                  } else if (isNgEvent) {
                    directives.push(
                      createEventDirective(
                        $parse,
                        $exceptionHandler,
                        nName,
                        name,
                      ) as unknown as InternalDirective,
                    );
                  } else {
                    // isWindow
                    directives.push(
                      createWindowEventDirective(
                        $parse,
                        $exceptionHandler,
                        window,
                        nName,
                        name,
                      ) as unknown as InternalDirective,
                    );
                  }
                } else if (isNgObserve) {
                  directives.push(
                    ngObserveDirective(
                      name,
                      value,
                    ) as unknown as InternalDirective,
                  );
                } else {
                  // Update nName for cases where a prefix was removed
                  // NOTE: the .toLowerCase() is unnecessary and causes https://github.com/angular/angular.ts/issues/16624 for ng-attr-*
                  nName = directiveNormalize(name.toLowerCase());
                  attrsMap[nName] = name;

                  if (isNgAttr || !hasOwn(attrs, nName)) {
                    attrs[nName] = value;

                    if (getBooleanAttrName(node, nName)) {
                      attrs[nName] = true; // presence means true
                    }
                  }

                  addAttrInterpolateDirective(
                    node,
                    directives,
                    value,
                    nName,
                    isNgAttr,
                  );

                  if (nName !== ignoreDirective) {
                    addDirective(directives, nName, "A", maxPriority);
                  }
                }
              }

              if (
                nodeName === "input" &&
                node.getAttribute("type") === "hidden"
              ) {
                // Hidden input elements can have strange behaviour when navigating back to the page
                // This tells the browser not to try to cache and reinstate previous values
                node.setAttribute("autocomplete", "off");
              }

              break;
            }
            case NodeType._TEXT_NODE:
              addTextInterpolateDirective(directives, node.nodeValue ?? "");
              break;
            default:
              break;
          }

          if (directives.length > 1) {
            directives.sort(byPriority);
          }

          return directives;
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

          const lazyCompilationState: LazyCompilationState = {
            _nodes: nodes,
            _transcludeFn: transcludeFn,
            _maxPriority: maxPriority,
            _ignoreDirective: ignoreDirective,
            _previousCompileContext: previousCompileContext,
          };

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
          if (isDefined(linkFnRecord._linkCtx)) {
            return linkFnRecord._fn(
              linkFnRecord._linkCtx,
              linkFnRecord._isolateScope ? isolateScope : scope,
              node,
              attrs,
              controllers,
              transcludeFn,
            );
          }

          if (isDefined(linkFnRecord._thisArg)) {
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
            !(isString(value) && value.startsWith("unsafe:"))
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

          applyInterpolatedAttrValue(
            bindingState._linkState,
            bindingState._attr,
            interpolateFn(bindingState._scope),
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
          const afterTemplateNodeLinkFnCtx =
            delayedState._afterTemplateNodeLinkFnCtx;

          if (!afterTemplateNodeLinkFnCtx) {
            return;
          }

          let childBoundTranscludeFn = boundTranscludeFn;

          if (afterTemplateNodeLinkFnCtx._transcludeOnThisElement) {
            childBoundTranscludeFn = createBoundTranscludeFn(
              scope,
              afterTemplateNodeLinkFnCtx._transclude as ng.TranscludeFn,
              boundTranscludeFn,
            );
          }

          if (isDefined(afterTemplateNodeLinkFnCtx._nodeLinkFnState)) {
            (afterTemplateNodeLinkFnCtx._nodeLinkFn as StoredNodeLinkFn)(
              afterTemplateNodeLinkFnCtx._nodeLinkFnState,
              delayedState._afterTemplateChildLinkFn,
              scope,
              node,
              childBoundTranscludeFn || null,
            );
          } else {
            (afterTemplateNodeLinkFnCtx._nodeLinkFn as NodeLinkFn)(
              delayedState._afterTemplateChildLinkFn,
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
          const afterTemplateNodeLinkFnCtx =
            delayedState._afterTemplateNodeLinkFnCtx;

          const compiledNode = delayedState._compiledNode;

          const compileNodeRef = delayedState._compileNodeRef;

          if (!afterTemplateNodeLinkFnCtx || !compiledNode || !compileNodeRef) {
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
                compileNodeRef.element.classList.forEach((cls) =>
                  (beforeTemplateLinkNode as Element).classList.add(cls),
                );
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
        function removeDelayedTemplateNodeLinkEntry(
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
        function invokeDelayedTemplateNodeLinkFn(
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
            delayedState._linkQueue.push(scope, node, boundTranscludeFn);
            const removeOnDestroy = scope.$on("$destroy", () => {
              removeOnDestroy();
              removeDelayedTemplateNodeLinkEntry(
                delayedState,
                scope,
                node,
                boundTranscludeFn,
              );
            });

            return;
          }

          invokeResolvedTemplateNodeLink(
            delayedState,
            scope,
            node,
            boundTranscludeFn,
          );
        }

        function finalizeDelayedTemplateLinkState(
          delayedState: DelayedTemplateLinkState,
        ): void {
          delayedState._compileNodeRef?._release();
          delayedState._compileNodeRef = undefined;
          delayedState._linkQueue = null;
        }

        function replayDelayedTemplateLinkQueue(
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
            } else if (isString(content)) {
              templateNodes = arrayFrom(createNodelistFromHTML(content)).filter(
                (node): node is Element =>
                  node.nodeType !== NodeType._COMMENT_NODE &&
                  node.nodeType !== NodeType._TEXT_NODE &&
                  node.nodeType === NodeType._ELEMENT_NODE,
              );
            } else {
              templateNodes = arrayFrom(
                wrapTemplate(
                  delayedState._templateNamespace,
                  trim(content),
                ) as NodeListOf<ChildNode>,
              ).filter(
                (node): node is Element =>
                  node.nodeType === NodeType._ELEMENT_NODE,
              );
            }
            compileNode = templateNodes[0];

            if (
              templateNodes.length !== 1 ||
              compileNode.nodeType !== NodeType._ELEMENT_NODE
            ) {
              throw $compileMinErr(
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

            const templateDirectives = collectDirectives(
              compileNode,
              replacementState._templateAttrs,
            );

            if (isObject(delayedState._origAsyncDirective.scope)) {
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
          delayedState._afterTemplateNodeLinkFnCtx = applyDirectivesToNode(
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
            entries(delayedState._rootElement).forEach(([i, node]) => {
              if (node === compileNode) {
                delayedState._rootElement[i] = delayedState._compileNodeRef;
              }
            });
          }
          delayedState._compiledNode = compileNode;
          delayedState._afterTemplateChildLinkFn = compileNodes(
            new NodeRef(
              (delayedState._compileNodeRef as NodeRef)._getAny().childNodes,
            ),
            delayedState._childTranscludeFn,
            undefined,
            undefined,
            undefined,
          );

          try {
            replayDelayedTemplateLinkQueue(delayedState);
          } finally {
            finalizeDelayedTemplateLinkState(delayedState);
          }
        }

        function handleDelayedTemplateLoadError(
          delayedState: DelayedTemplateLinkState,
          error: unknown,
        ): void {
          delayedState._afterTemplateNodeLinkFnCtx = undefined;
          delayedState._afterTemplateChildLinkFn = null;
          delayedState._compiledNode = undefined;
          finalizeDelayedTemplateLinkState(delayedState);

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

            if (isUndefined(slotTranscludeFn)) {
              throw $compileMinErr(
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
        function invokeStoredNodeLinkFn(
          nodeLinkState: NodeLinkState,
          childLinkFn: ChildLinkFn | CompositeLinkFn | null | undefined,
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
            const controllerNames = keys(controllerDirectives);

            for (let i = 0, l = controllerNames.length; i < l; i++) {
              const name = controllerNames[i];

              const controllerDirective = controllerDirectives[name];

              const { require } = controllerDirective;

              if (
                controllerDirective.bindToController &&
                !isArray(require) &&
                isObject(require)
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
            const controllerNames = keys(elementControllers);

            for (let i = 0, l = controllerNames.length; i < l; i++) {
              const controller = elementControllers[controllerNames[i]];

              const controllerInstance = controller._instance;

              if (isFunction(controllerInstance.$onChanges)) {
                try {
                  controllerInstance.$onChanges(
                    controller._bindingInfo!._initialChanges,
                  );
                } catch (err) {
                  $exceptionHandler(err);
                }
              }

              if (isFunction(controllerInstance.$onInit)) {
                try {
                  controllerInstance.$target.$onInit();
                } catch (err) {
                  $exceptionHandler(err);
                }
              }

              if (isFunction(controllerInstance.$onDestroy)) {
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
            childLinkFn &&
            linkNode.childNodes &&
            linkNode.childNodes.length
          ) {
            childLinkFn(scopeToChild, linkNode.childNodes, boundTranscludeFn);
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
            const controllerNames = keys(elementControllers);

            for (let i = 0, l = controllerNames.length; i < l; i++) {
              const controller = elementControllers[controllerNames[i]];

              const controllerInstance = controller._instance;

              if (isFunction(controllerInstance.$postLink)) {
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
        ): NodeLinkFnCtx {
          previousCompileContext = previousCompileContext || {};
          preLinkFns = preLinkFns || [];
          postLinkFns = postLinkFns || [];

          let terminalPriority = -Number.MAX_VALUE;

          let terminal = false;

          let {
            _newScopeDirective,
            _controllerDirectives,
            _newIsolateScopeDirective,
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

          let $template: any;

          let replaceDirective = originalReplaceDirective;

          let childTranscludeFn: ChildTranscludeOrLinkFn = transcludeFn;

          let didScanForMultipleTransclusion = false;

          let mightHaveMultipleTransclusionError = false;

          let directiveValue: any;

          let nodeLinkFn: NodeLinkFn | StoredNodeLinkFn | undefined;

          let nodeLinkFnState:
            | NodeLinkState
            | DelayedTemplateLinkState
            | undefined;

          // executes all directives on the current element
          for (let i = 0, ii = directives.length; i < ii; i++) {
            directive = directives[i];
            const directivePriority = directive.priority || 0;

            if (terminalPriority > directivePriority) {
              break; // prevent further processing of directives
            }

            directiveValue = directive.scope;

            if (directiveValue) {
              // skip the check for directives with async templates, we'll check the derived sync
              // directive when the template arrives
              if (!directive.templateUrl) {
                if (isObject(directiveValue)) {
                  // This directive is trying to add an isolated scope.
                  // Check that there is no scope of any kind already
                  assertNoDuplicate(
                    "new/isolated scope",
                    _newIsolateScopeDirective || _newScopeDirective,
                    directive,
                    compileNodeRef,
                  );
                  _newIsolateScopeDirective = directive;
                } else {
                  // This directive is trying to add a child scope.
                  // Check that there is no isolated scope already
                  assertNoDuplicate(
                    "new/isolated scope",
                    _newIsolateScopeDirective,
                    directive,
                    compileNodeRef,
                  );
                }
              }

              _newScopeDirective = _newScopeDirective || directive;
            }

            directiveName = directive.name || "";

            // If we encounter a condition that can result in transclusion on the directive,
            // then scan ahead in the remaining directives for others that may cause a multiple
            // transclusion error to be thrown during the compilation process.  If a matching directive
            // is found, then we know that when we encounter a transcluded directive, we need to eagerly
            // compile the `transclude` function rather than doing it lazily in order to throw
            // exceptions at the correct time
            const hasReplacedTemplate =
              directive.replace &&
              (directive.templateUrl || directive.template);

            const shouldTransclude =
              directive.transclude &&
              !EXCLUDED_DIRECTIVES.includes(directiveName);

            if (
              !didScanForMultipleTransclusion &&
              (hasReplacedTemplate || shouldTransclude)
            ) {
              let candidateDirective;

              for (
                let scanningIndex = i + 1;
                (candidateDirective = directives[scanningIndex++]);
              ) {
                if (
                  (candidateDirective.transclude &&
                    !EXCLUDED_DIRECTIVES.includes(
                      candidateDirective.name || "",
                    )) ||
                  (candidateDirective.replace &&
                    (candidateDirective.templateUrl ||
                      candidateDirective.template))
                ) {
                  mightHaveMultipleTransclusionError = true;
                  break;
                }
              }

              didScanForMultipleTransclusion = true;
            }

            if (!directive.templateUrl && directive.controller) {
              _controllerDirectives = _controllerDirectives || nullObject();
              assertNoDuplicate(
                `'${directiveName}' controller`,
                _controllerDirectives[directiveName],
                directive,
                compileNodeRef,
              );
              _controllerDirectives[directiveName] = directive;
            }

            directiveValue = directive.transclude;

            if (directiveValue) {
              hasTranscludeDirective = true;

              // Special case ngIf and ngRepeat so that we don't complain about duplicate transclusion.
              // This option should only be used by directives that know how to safely handle element transclusion,
              // where the transcluded nodes are added or replaced after linking.
              if (!EXCLUDED_DIRECTIVES.includes(directiveName)) {
                assertNoDuplicate(
                  "transclusion",
                  _nonTlbTranscludeDirective,
                  directive,
                  compileNodeRef,
                );
                _nonTlbTranscludeDirective = directive;
              }

              if (directiveValue === "element") {
                _hasElementTranscludeDirective = true;
                terminalPriority = directivePriority;
                $template = compileNodeRef;
                compileNodeRef = new NodeRef(document.createComment(""));
                templateAttrs._nodeRef = compileNodeRef;
                compileNode = compileNodeRef.node;

                if (_ctxNodeRef) {
                  if (_ctxNodeRef._isList && _index !== undefined) {
                    _ctxNodeRef._setIndex(_index, compileNode);
                  } else {
                    _ctxNodeRef.node = compileNode;
                  }
                }
                replaceWith(
                  new NodeRef($template._element as Element),
                  compileNode,
                  _index,
                );

                childTranscludeFn = compilationGenerator(
                  mightHaveMultipleTransclusionError,
                  $template._element as Element,
                  transcludeFn,
                  terminalPriority,
                  replaceDirective ? replaceDirective.name : undefined,
                  {
                    // Don't pass in:
                    // - _controllerDirectives - otherwise we'll create duplicates controllers
                    // - _newIsolateScopeDirective or _templateDirective - combining templates with
                    //   element transclusion doesn't make sense.
                    //
                    // We need only _nonTlbTranscludeDirective so that we prevent putting transclusion
                    // on the same element more than once.
                    _nonTlbTranscludeDirective,
                  },
                );
              } else {
                const slots = nullObject();

                let nodes: NodeList | DocumentFragment;

                if (!isObject(directiveValue)) {
                  //
                  // Clone childnodes before clearing contents on transcluded directives
                  // Create a temporary container to preserve separate text nodes without browser normalization
                  // (see https://github.com/angular/angular.ts/issues/14924)
                  const tempContainer = document.createElement("div");

                  const { childNodes } = compileNode;

                  for (
                    let childIndex = 0, childCount = childNodes.length;
                    childIndex < childCount;
                    childIndex++
                  ) {
                    tempContainer.appendChild(
                      childNodes[childIndex].cloneNode(true),
                    );
                  }
                  nodes = tempContainer.childNodes;
                } else {
                  // We have transclusion slots,
                  // collect them up, compile them and store their transclusion functions
                  // Use a temporary container to preserve separate text nodes without browser normalization
                  // (see https://github.com/angular/angular.ts/issues/14924)
                  const tempContainer = document.createElement("div");

                  const slotMap = nullObject();

                  const filledSlots = nullObject();

                  // Parse the element selectors
                  const slotNames = keys(directiveValue);

                  for (
                    let slotIndex = 0, slotCount = slotNames.length;
                    slotIndex < slotCount;
                    slotIndex++
                  ) {
                    const slotName = slotNames[slotIndex];

                    let elementSelector = directiveValue[slotName];

                    // If an element selector starts with a ? then it is optional
                    const optional = elementSelector.charAt(0) === "?";

                    elementSelector = optional
                      ? elementSelector.substring(1)
                      : elementSelector;

                    slotMap[elementSelector] = slotName;

                    // We explicitly assign `null` since this implies that a slot was defined but not filled.
                    // Later when calling boundTransclusion functions with a slot name we only error if the
                    // slot is `undefined`
                    slots[slotName] = null;

                    // filledSlots contains `true` for all slots that are either optional or have been
                    // filled. This is used to check that we have not missed any required slots
                    filledSlots[slotName] = optional;
                  }

                  // Clone childnodes before distributing to slots
                  // Clone each node individually to prevent browser DOM normalization
                  // which can merge adjacent text nodes (see https://github.com/angular/angular.ts/issues/14924)
                  const { childNodes } = compileNode;

                  // Add the matching elements into their slot
                  for (
                    let childIndex = 0, childCount = childNodes.length;
                    childIndex < childCount;
                    childIndex++
                  ) {
                    const node = childNodes[childIndex].cloneNode(true);

                    const slotName =
                      node.nodeType === NodeType._ELEMENT_NODE
                        ? slotMap[
                            directiveNormalize(getNodeName(node as Element))
                          ]
                        : undefined;

                    if (slotName) {
                      filledSlots[slotName] = true;
                      slots[slotName] =
                        slots[slotName] || createDocumentFragment();
                      slots[slotName].appendChild(node);
                    } else {
                      tempContainer.appendChild(node);
                    }
                  }

                  // Check for required slots that were not filled
                  const filledSlotNames = keys(filledSlots);

                  for (
                    let slotIndex = 0, slotCount = filledSlotNames.length;
                    slotIndex < slotCount;
                    slotIndex++
                  ) {
                    const slotName = filledSlotNames[slotIndex];

                    const filled = filledSlots[slotName];

                    if (!filled) {
                      throw $compileMinErr(
                        "reqslot",
                        "Required transclusion slot `{0}` was not filled.",
                        slotName,
                      );
                    }
                  }

                  for (const slotName in slots) {
                    if (slots[slotName]) {
                      // Only define a transclusion function if the slot was filled
                      // Convert to static array to prevent DOM normalization of text nodes
                      const slotCompileNodes = slots[slotName].childNodes;

                      slots[slotName] = compilationGenerator(
                        mightHaveMultipleTransclusionError,
                        slotCompileNodes,
                        transcludeFn,
                        undefined,
                        undefined,
                        previousCompileContext,
                      );
                    }
                  }

                  nodes = tempContainer.childNodes;
                }

                emptyElement(compileNode as Element); // clear contents on transcluded directives

                // lazily compile transcluded template and generate a transcluded link function

                childTranscludeFn = compilationGenerator(
                  mightHaveMultipleTransclusionError,
                  nodes,
                  transcludeFn,
                  undefined,
                  undefined,
                  {
                    _needsNewScope:
                      directive._isolateScope || directive._newScope,
                  },
                );
                (childTranscludeFn as ng.TranscludeFn)._slots = slots;
              }
            }

            if (directive.template) {
              hasTemplate = true;
              assertNoDuplicate(
                "template",
                _templateDirective,
                directive,
                compileNodeRef,
              );
              _templateDirective = directive;

              directiveValue = isFunction(directive.template)
                ? directive.template(
                    compileNodeRef.element as HTMLElement,
                    templateAttrs,
                  )
                : directive.template;

              directiveValue = denormalizeTemplate(directiveValue);

              if (directive.replace) {
                replaceDirective = directive;

                if (isTextNode(directiveValue)) {
                  $template = [];
                } else {
                  $template = wrapTemplate(
                    directive.templateNamespace,
                    trim(directiveValue),
                  );
                }

                if (isString($template)) {
                  $template = arrayFrom(
                    createNodelistFromHTML($template),
                  ).filter((x) => x.nodeType === NodeType._ELEMENT_NODE);
                }
                compileNode = $template[0];

                if (
                  $template.length !== 1 ||
                  compileNode.nodeType !== NodeType._ELEMENT_NODE
                ) {
                  throw $compileMinErr(
                    "tplrt",
                    "Template for directive '{0}' must have exactly one root element. {1}",
                    directiveName,
                    "",
                  );
                }

                replaceWith(compileNodeRef, compileNode);

                if (_parentNodeRef && _index !== undefined) {
                  _parentNodeRef._setIndex(_index, compileNode);
                }

                const newTemplateAttrs = { $attr: {} } as Attributes;

                // combine directives from the original node and from the template:
                // - take the array of directives for this element
                // - split it into two parts, those that already applied (processed) and those that weren't (unprocessed)
                // - collect directives from the template and sort them by priority
                // - combine directives as: processed + template + unprocessed
                const _templateDirectives = collectDirectives(
                  compileNode as Element,
                  newTemplateAttrs,
                );

                const unprocessedDirectives = directives.splice(
                  i + 1,
                  directives.length - (i + 1),
                );

                if (_newIsolateScopeDirective || _newScopeDirective) {
                  // The original directive caused the current element to be replaced but this element
                  // also needs to have a new scope, so we need to tell the template directives
                  // that they would need to get their scope from further up, if they require transclusion
                  markDirectiveScope(
                    _templateDirectives,
                    _newIsolateScopeDirective,
                    _newScopeDirective,
                  );
                }
                directives = directives
                  .concat(_templateDirectives)
                  .concat(unprocessedDirectives);

                mergeTemplateAttributes(templateAttrs, newTemplateAttrs);

                ii = directives.length;
              } else {
                if (compileNodeRef._isElement()) {
                  compileNodeRef.element.innerHTML = directiveValue;
                }
              }
            }

            if (directive.templateUrl) {
              hasTemplate = true;
              assertNoDuplicate(
                "template",
                _templateDirective,
                directive,
                compileNodeRef,
              );
              _templateDirective = directive;

              if (directive.replace) {
                replaceDirective = directive;
              }

              ({ _nodeLinkFn: nodeLinkFn, _nodeLinkFnState: nodeLinkFnState } =
                compileTemplateUrl(
                  directives.splice(i, directives.length - i),
                  compileNodeRef,
                  templateAttrs,
                  compileNode as Element,
                  (hasTranscludeDirective &&
                    childTranscludeFn) as ChildTranscludeOrLinkFn,
                  preLinkFns,
                  postLinkFns,
                  {
                    _index,
                    _controllerDirectives,
                    _newScopeDirective:
                      _newScopeDirective !== directive
                        ? _newScopeDirective
                        : undefined,
                    _newIsolateScopeDirective,
                    _templateDirective,
                    _nonTlbTranscludeDirective,
                    _futureParentElement:
                      previousCompileContext._futureParentElement,
                  },
                ));
              ii = directives.length;
            } else if (directive.compile) {
              try {
                const linkFn = directive.compile(
                  compileNodeRef._getAny() as HTMLElement,
                  templateAttrs,
                  childTranscludeFn,
                ) as CompileDirectiveLinkResult;

                const context = directive._originalDirective || directive;

                const isolateScope =
                  _newIsolateScopeDirective === directive ||
                  !!directive._isolateScope;

                if (isFunction(linkFn)) {
                  const linkCtx = linkFn._linkCtx;

                  pushLinkFnRecord(
                    postLinkFns,
                    linkFn,
                    directive.require,
                    directiveName,
                    isolateScope,
                    linkCtx,
                    isDefined(linkCtx) ? undefined : context,
                  );
                } else if (linkFn) {
                  const preLinkCtx = linkFn._preLinkCtx || linkFn._linkCtx;

                  const postLinkCtx = linkFn._postLinkCtx || linkFn._linkCtx;

                  pushLinkFnRecord(
                    preLinkFns,
                    linkFn.pre,
                    directive.require,
                    directiveName,
                    isolateScope,
                    preLinkCtx,
                    isDefined(preLinkCtx) ? undefined : context,
                  );
                  pushLinkFnRecord(
                    postLinkFns,
                    linkFn.post,
                    directive.require,
                    directiveName,
                    isolateScope,
                    postLinkCtx,
                    isDefined(postLinkCtx) ? undefined : context,
                  );
                }
              } catch (err) {
                $exceptionHandler(err);
              }
            }

            if (directive.terminal) {
              terminal = true;
              terminalPriority = Math.max(terminalPriority, directivePriority);
            }
          }

          previousCompileContext._hasElementTranscludeDirective =
            _hasElementTranscludeDirective;

          if (!nodeLinkFn) {
            nodeLinkFn = invokeStoredNodeLinkFn as StoredNodeLinkFn;
            nodeLinkFnState = {
              _compileNode: compileNode,
              _templateAttrs: templateAttrs,
              _transcludeFn: childTranscludeFn,
              _controllerDirectives,
              _newIsolateScopeDirective,
              _newScopeDirective,
              _hasElementTranscludeDirective,
              _preLinkFns: preLinkFns,
              _postLinkFns: postLinkFns,
            } as NodeLinkState;
          }

          // might be normal or delayed nodeLinkFn depending on if templateUrl is present
          return {
            _nodeLinkFn: nodeLinkFn as NodeLinkFn | StoredNodeLinkFn,
            _nodeLinkFnState: nodeLinkFnState,
            _terminal: terminal,
            _transclude: childTranscludeFn,
            _transcludeOnThisElement: hasTranscludeDirective,
            _templateOnThisElement: hasTemplate,
            _newScope: !!(
              _newScopeDirective && _newScopeDirective.scope === true
            ),
          };
        }

        /** Resolves required controllers from the current element or its ancestors. */
        function getControllers(
          directiveName: string,
          require: string | Array<any> | Record<string, any>,
          $element: Element | undefined,
          elementControllers: ElementControllers,
        ): any {
          let value: any;

          if (isString(require)) {
            const match = require.match(REQUIRE_PREFIX_REGEXP);

            if (!match) {
              return null;
            }

            const name = require.substring(match[0].length);

            const inheritType = match[1] || match[3];

            const optional = match[2] === "?";

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
            }

            if (!value && !optional) {
              throw $compileMinErr(
                "ctreq",
                "Controller '{0}', required by directive '{1}', can't be found!",
                name,
                directiveName,
              );
            }
          } else if (isArray(require)) {
            value = [];

            for (let i = 0, ii = require.length; i < ii; i++) {
              value[i] = getControllers(
                directiveName,
                require[i],
                $element,
                elementControllers,
              );
            }
          } else if (isObject(require)) {
            value = {};
            const requireKeys = keys(require);

            for (let i = 0, l = requireKeys.length; i < l; i++) {
              const property = requireKeys[i];

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
        function addDirective(
          tDirectives: InternalDirective[],
          name: string,
          location: string,
          maxPriority?: number,
        ): InternalDirective | false {
          let match: InternalDirective | false = false;

          const maxPriorityValue = isUndefined(maxPriority)
            ? Number.MAX_VALUE
            : maxPriority;

          if (hasOwn(hasDirectives, name)) {
            const directives: InternalDirective[] =
              (hasOwn(directiveLookupCache, name)
                ? directiveLookupCache[name]
                : (directiveLookupCache[name] = $injector.get(
                    name + DirectiveSuffix,
                  ))) || [];

            for (let i = 0, ii = directives.length; i < ii; i++) {
              const directive = directives[i];

              if (
                maxPriorityValue > (directive.priority || 0) &&
                directive.restrict?.indexOf(location) !== -1
              ) {
                if (!directive._bindings) {
                  const bindings = (directive._bindings =
                    parseDirectiveBindings(directive, directive.name));

                  if (isObject(bindings._isolateScope)) {
                    directive._isolateBindings = bindings._isolateScope;
                  }
                }
                tDirectives.push(directive);
                match = directive;
              }
            }
          }

          return match;
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
          const dstKeys = keys(dstAny);

          for (let i = 0, l = dstKeys.length; i < l; i++) {
            const key = dstKeys[i];

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
          const srcKeys = keys(srcAny);

          for (let i = 0, l = srcKeys.length; i < l; i++) {
            const key = srcKeys[i];

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

          if (isFunction(origAsyncDirective.templateUrl)) {
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

          if (!isString(templateUrl) || !templateUrl) {
            throw $compileMinErr(
              "tplurl",
              "Directive '{0}' produced an invalid templateUrl: {1}",
              origAsyncDirective.name,
              stringify(templateUrl),
            );
          }
          const { templateNamespace } = origAsyncDirective;

          const delayedState: DelayedTemplateLinkState = {
            _linkQueue: [] as any,
            _directives: directives,
            _afterTemplateChildLinkFn: null,
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
            _nodeLinkFn: invokeDelayedTemplateNodeLinkFn as StoredNodeLinkFn,
            _nodeLinkFnState: delayedState,
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
            throw $compileMinErr(
              "multidir",
              "Multiple directives [{0}, {1}] asking for {3} on: {4}",
              previousDirective.name,
              directive.name,
              what,
              startingTag(element._getAny()),
            );
          }
        }

        /** Adds a synthetic text-interpolation directive for a text node. */
        function addTextInterpolateDirective(
          directives: InternalDirective[],
          text: string,
        ): void {
          const interpolateFn = $interpolate(text, true);

          if (interpolateFn) {
            const { expressions } = interpolateFn;

            const watchExpression =
              buildInterpolationWatchExpression(expressions);

            const linkState: TextInterpolateLinkState = {
              _interpolateFn: interpolateFn,
              _watchExpression: watchExpression,
              _singleExpression:
                expressions.length === 1 &&
                text ===
                  $interpolate.startSymbol() +
                    watchExpression +
                    $interpolate.endSymbol(),
            };

            const directive = {
              priority: 0,
              compile: compileTextInterpolateDirective,
              _compileState: linkState,
            } as unknown as InternalDirective;

            directives.push(directive);
          }
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

          if (!isString(value)) {
            throw $compileMinErr(
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
            throw $compileMinErr(
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
          const nodeName = getNodeName(node);

          const trustedContext = getTrustedAttrContext(nodeName, name);

          const mustHaveExpression = !isNgAttr;

          const allOrNothing = ALL_OR_NOTHING_ATTRS.includes(name) || isNgAttr;

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
            throw $compileMinErr(
              "selmulti",
              "Binding to the 'multiple' attribute is not supported. Element: {0}",
              startingTag(node.outerHTML),
            );
          }

          if (EVENT_HANDLER_ATTR_REGEXP.test(name)) {
            throw $compileMinErr(
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
            throw $compileMinErr(
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
            const bindingNames = keys(bindings);

            for (
              let bindingIndex = 0;
              bindingIndex < bindingNames.length;
              bindingIndex++
            ) {
              const scopeName = bindingNames[bindingIndex];

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

                  if (isString(lastValue)) {
                    // If the attribute has been provided then we trigger an interpolation to ensure
                    // the value is there for use in the link fn
                    destAny[scopeName] = (
                      $interpolate(lastValue) as InterpolationFunction
                    )(scope);
                  } else if (isBoolean(lastValue)) {
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
                      throw $compileMinErr(
                        "nonassign",
                        "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!",
                        attrsAny[attrName],
                        attrName,
                        directive.name,
                      );
                    };
                  // store the value that the parent scope had after the last check:
                  const initialValue = parentGet && parentGet(scopeTarget);

                  lastValue = destinationTarget[scopeName] = isArray(
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

                  destAny.$target[scopeName] =
                    parentGet && parentGet(scopeTarget);
                  const oneWayBindingState: OneWayBindingState = {
                    _bindingChangeState: bindingChangeState,
                    _destAny: destAny,
                    _firstChange: true,
                    _scopeName: scopeName,
                  };

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
    throw $compileMinErr(
      "baddir",
      "Directive/Component name '{0}' is invalid. The first character must be a lowercase letter",
      name,
    );
  }

  if (name !== name.trim()) {
    throw $compileMinErr(
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

  if (!isArray(require) && isObject(require)) {
    const entryList = entries(require);

    for (let i = 0; i < entryList.length; i++) {
      const [key, value] = entryList[i];

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
  if (restrict && !(isString(restrict) && /[EA]/.test(restrict))) {
    throw $compileMinErr(
      "badrestrict",
      "Restrict property '{0}' of directive '{1}' is invalid",
      restrict,
      name,
    );
  }

  return isString(restrict) ? restrict : "EA";
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
  state: CompositeLinkState,
  nodeRef: NodeRef | NodeList,
): Node[] {
  let stableNodeList = [];

  if (state._nodeLinkFnFound) {
    const stableLength = isInstanceOf(nodeRef, NodeRef)
      ? nodeRef.size
      : nodeRef.length;

    stableNodeList = new Array(stableLength);

    for (let i = 0, l = state._linkFnsList.length; i < l; i++) {
      const { _index: idx } = state._linkFnsList[i];

      stableNodeList[idx] = isInstanceOf(nodeRef, NodeRef)
        ? (nodeRef._getIndex(idx) as Node)
        : nodeRef[idx];
    }
  } else if (isInstanceOf(nodeRef, NodeRef)) {
    for (let i = 0, l = nodeRef.size; i < l; i++) {
      stableNodeList.push(nodeRef._getIndex(i) as Node);
    }
  } else {
    for (let i = 0, l = nodeRef.length; i < l; i++) {
      stableNodeList.push(nodeRef[i]);
    }
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
    if (isDefined(index)) {
      const oldChild = parent.childNodes[index];

      if (oldChild) {
        parent.replaceChild(newNode, oldChild);
      }
    } else {
      parent.replaceChild(newNode, firstElementToRemove);
    }
  }

  const fragment = createDocumentFragment();

  elementsToRemove._collection().forEach((element) => {
    fragment.appendChild(element);
  });

  elementsToRemove.node = newNode;
}
