import {
  createElementFromHTML,
  createNodelistFromHTML,
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
import {
  assertArg,
  assertNotHasOwnProperty,
  bind,
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
  isObject,
  isScope,
  isString,
  isUndefined,
  minErr,
  nullObject,
  simpleCompare,
  trim,
} from "../../shared/utils.ts";
import { SCE_CONTEXTS } from "../../services/sce/sce.ts";
import { PREFIX_REGEXP } from "../../shared/constants.ts";
import {
  createEventDirective,
  createWindowEventDirective,
} from "../../directive/events/events.ts";
import { Attributes } from "./attributes.ts";
import { ngObserveDirective } from "../../directive/observe/observe.ts";
import { $injectTokens, $injectTokens as $t } from "../../injection-tokens.ts";
import type { Component } from "../../interface.ts";
import type { InterpolationFunction } from "../interpolate/interpolate.ts";
import type { SanitizeUriProvider } from "../sanitize/sanitize-uri.ts";
import type { CompiledExpression } from "../parse/parse.ts";

export type TranscludedNodes = Node | Node[] | NodeList | null;

export type ChildTranscludeOrLinkFn = TranscludeFn | PublicLinkFn;

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
  previousCompileContext?: any,
) => PublicLinkFn;

/**
 * Represents a mapping of linking functions.
 */
export interface LinkFnMapping {
  _index: number;
  _nodeLinkFnCtx?: NodeLinkFnCtx;
  _childLinkFn?: ChildLinkFn | CompositeLinkFn | null;
}

/**
 * Compiles a node (or list of nodes) into a single composite link function.
 */
export type CompileNodesFn = (
  nodeRefList: NodeRef | null,
  transcludeFn?: ChildTranscludeOrLinkFn,
  maxPriority?: number,
  ignoreDirective?: string,
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
 */
export interface PreviousCompileContext {
  _index?: number;
  _parentNodeRef?: NodeRef;
  _ctxNodeRef?: NodeRef;
  _needsNewScope?: boolean;
  _hasElementTranscludeDirective?: boolean;
  _nonTlbTranscludeDirective?: ng.Directive | null;
  _futureParentElement?: Node | Element | null;
  _controllerDirectives?: Record<string, ng.Directive> | null;
  _newScopeDirective?: ng.Directive | null;
  _newIsolateScopeDirective?: ng.Directive | null;
  _templateDirective?: ng.Directive | null;
}

/**
 * An internal augmentation of a directive definition object (DDO) used by the compiler.
 */
export interface InternalDirective extends ng.Directive {
  name: string;
  priority?: number;
  index?: number;
  _bindings?: any;
  _isolateBindings?: any;
  _isolateScope?: boolean;
  _newScope?: boolean;
  _originalDirective?: any;
  templateNamespace?: string;
}

export interface IsolateBinding {
  mode: string;
  collection: boolean;
  optional: boolean;
  attrName: string;
}

export type IsolateBindingMap = Record<string, IsolateBinding>;

export interface ParsedDirectiveBindings {
  isolateScope: IsolateBindingMap | null;
  bindToController: IsolateBindingMap | null;
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

export type TrustedUrlListAccessor = (regexp?: RegExp) => RegExp | undefined;

export type StrictComponentBindingsAccessor = (
  enabled?: boolean,
) => boolean | any;

export interface DirectiveBindingInfo {
  _initialChanges: Record<string, SimpleChange>;
  _removeWatches?: () => void;
}

export interface CompileControllerLocals {
  $scope: Scope;
  $element: Node;
  $attrs: Attributes;
  $transclude: ng.TranscludeFn;
}

export type ControllerInstanceRef = (() => any) & {
  _instance: any;
  _bindingInfo?: DirectiveBindingInfo;
};

export type ElementControllers = Record<string, ControllerInstanceRef>;

export type NodeLinkTranscludeFn =
  | ChildTranscludeOrLinkFn
  | ControllersBoundTranscludeFn
  | ng.TranscludeFn;

export interface TextInterpolateLinkState {
  _interpolateFn: InterpolationFunction;
  _watchExpression: string;
}

export interface AttrInterpolateLinkState {
  _name: string;
  _value: string;
  _trustedContext?: string;
  _allOrNothing: boolean;
  _interpolateFn?: InterpolationFunction;
}

export interface PropertyDirectiveLinkState {
  _attrName: string;
  _propName: string;
  _ngPropGetter: CompiledExpression;
  _sanitizer: (value: any) => any;
}

export type ContextualLinkFn<TLinkCtx = unknown> = ((...args: any[]) => any) & {
  _linkCtx?: TLinkCtx;
};

export interface ContextualDirectivePrePost<
  TPreLinkCtx = unknown,
  TPostLinkCtx = TPreLinkCtx,
> {
  pre?: (...args: any[]) => any;
  post?: (...args: any[]) => any;
  _linkCtx?: unknown;
  _preLinkCtx?: TPreLinkCtx;
  _postLinkCtx?: TPostLinkCtx;
}

export type CompileDirectiveLinkResult =
  | ContextualLinkFn
  | ContextualDirectivePrePost<any, any>
  | null
  | undefined;

export interface LinkFnRecord {
  _fn: Function;
  _require: string | Array<any> | Record<string, any> | undefined;
  _directiveName: string;
  _isolateScope: boolean;
  _linkCtx?: unknown;
}

export interface ControllersBoundTranscludeState {
  _boundTranscludeFn: BoundTranscludeFn;
  _elementControllers: ElementControllers;
  _hasElementTranscludeDirective: boolean;
  _scopeToChild: Scope;
  _elementRef: NodeRef;
}

export interface ControllersBoundTranscludeFn {
  (
    scopeParam?: Scope | CloneAttachFn | null,
    cloneAttachFn?: CloneAttachFn | Node | null,
    futureParentElement?: Node | null,
    slotName?: string | number,
  ): TranscludedNodes | void;
  isSlotFilled?: (slotName: string | number) => boolean;
  _boundTransclude?: BoundTranscludeFn;
}

export interface NodeLinkState {
  _compileNode: Node | Element;
  _templateAttrs: Attributes;
  _transcludeFn: NodeLinkTranscludeFn;
  _controllerDirectives?: Record<string, InternalDirective> | null;
  _newIsolateScopeDirective?: InternalDirective | null;
  _newScopeDirective?: InternalDirective | null;
  _hasElementTranscludeDirective: boolean;
  _preLinkFns: LinkFnRecord[];
  _postLinkFns: LinkFnRecord[];
}

export interface DelayedTemplateReplacementState {
  _templateNodes: Element[];
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
  _linkQueue: DelayedTemplateLinkQueue | null;
  _afterTemplateNodeLinkFnCtx?: NodeLinkFnCtx;
  _afterTemplateChildLinkFn: CompositeLinkFn | ChildLinkFn | null;
  _beforeTemplateCompileNode: Node | Element;
  _compileNodeRef: NodeRef;
  _origAsyncDirective: InternalDirective;
  _previousCompileContext: PreviousCompileContext;
  _compiledNode?: Element;
}

export interface DelayedTemplateNodeLinkResult {
  _nodeLinkFn: StoredNodeLinkFn;
  _nodeLinkFnState: DelayedTemplateLinkState;
}

export interface CompositeLinkState {
  _linkFnsList: LinkFnMapping[];
  _nodeRefList: NodeRef;
  _nodeLinkFnFound?: NodeLinkFn | StoredNodeLinkFn;
  _transcludeFn?: ChildTranscludeOrLinkFn;
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
  /* @ignore */ static $inject = [$t._provide, $t._sanitizeUriProvider];

  directive: RegisterDirectiveFn;
  component: RegisterComponentFn;
  aHrefSanitizationTrustedUrlList: TrustedUrlListAccessor;
  imgSrcSanitizationTrustedUrlList: TrustedUrlListAccessor;
  strictComponentBindingsEnabled: StrictComponentBindingsAccessor;
  addPropertySecurityContext: (
    elementName: string,
    propertyName: string,
    ctx: string,
  ) => this;

  $get: any;

  /** Configures directive registration and compile-time provider behavior. */
  constructor(
    $provide: ng.ProvideService,
    $sanitizeUriProvider: SanitizeUriProvider,
  ) {
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

      const scopeNames = Object.keys(scope);

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
          mode: match[1][0],
          collection: match[2] === "*",
          optional: match[3] === "?",
          attrName: match[4] || scopeName,
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
        isolateScope: null,
        bindToController: null,
      };

      if (isObject(directive.scope)) {
        if (directive.bindToController === true) {
          bindings.bindToController = parseIsolateBindings(
            directive.scope,
            directiveName,
            true,
          );
          bindings.isolateScope = {};
        } else {
          bindings.isolateScope = parseIsolateBindings(
            directive.scope,
            directiveName,
            false,
          );
        }
      }

      if (isObject(directive.bindToController)) {
        bindings.bindToController = parseIsolateBindings(
          directive.bindToController,
          directiveName,
          true,
        );
      }

      if (bindings.bindToController && !directive.controller) {
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
            $injectTokens._injector,
            $injectTokens._exceptionHandler,
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

      factory.$inject = [$injectTokens._injector];

      return provider.directive(
        name,
        factory as unknown as ng.DirectiveFactory,
      );
    } as RegisterComponentFn;

    this.component = registerComponent;

    /**
     * Retrieves or overrides the default regular expression that is used for determining trusted safe
     * urls during a[href] sanitization.
     *
     * The sanitization is a security measure aimed at preventing XSS attacks via html links.
     *
     * Any url about to be assigned to a[href] via data-binding is first normalized and turned into
     * an absolute url. Afterwards, the url is matched against the `aHrefSanitizationTrustedUrlList`
     * regular expression. If a match is found, the original url is written into the dom. Otherwise,
     * the absolute url is prefixed with `'unsafe:'` string and only then is it written into the DOM.
     *
     * @param regexp - New regexp to trust urls with.
     * @returns Current RegExp if called without value or self for
     *    chaining otherwise.
     */
    this.aHrefSanitizationTrustedUrlList = function (regexp?: RegExp) {
      if (isDefined(regexp)) {
        $sanitizeUriProvider.aHrefSanitizationTrustedUrlList(regexp);
      }

      return $sanitizeUriProvider.aHrefSanitizationTrustedUrlList() as RegExp;
    };

    /**
     * Retrieves or overrides the default regular expression that is used for determining trusted safe
     * urls during img[src] sanitization.
     *
     * The sanitization is a security measure aimed at prevent XSS attacks via html links.
     *
     * Any url about to be assigned to img[src] via data-binding is first normalized and turned into
     * an absolute url. Afterwards, the url is matched against the `imgSrcSanitizationTrustedUrlList`
     * regular expression. If a match is found, the original url is written into the dom. Otherwise,
     * the absolute url is prefixed with `'unsafe:'` string and only then is it written into the DOM.
     *
     * @param regexp - New regexp to trust urls with.
     * @returns Current RegExp if called without value or self for
     *    chaining otherwise.
     */
    this.imgSrcSanitizationTrustedUrlList = function (regexp?: RegExp) {
      if (isDefined(regexp)) {
        $sanitizeUriProvider.imgSrcSanitizationTrustedUrlList(regexp);

        return undefined;
      }

      return $sanitizeUriProvider.imgSrcSanitizationTrustedUrlList() as RegExp;
    };

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
    const PROP_CONTEXTS = nullObject() as Record<string, string>;

    /**
     * Defines the security context for DOM properties bound by ng-prop-*.
     *
     * @param elementName - The element name or '*' to match any element.
     * @param propertyName - The DOM property name.
     * @param ctx - The {@link _sce} security context in which this value is safe for use, e.g. `$sce.URL`
     * @returns `this` for chaining.
     */
    this.addPropertySecurityContext = function (
      elementName: string,
      propertyName: string,
      ctx: string,
    ) {
      const key = `${elementName.toLowerCase()}|${propertyName.toLowerCase()}`;

      if (key in PROP_CONTEXTS && PROP_CONTEXTS[key] !== ctx) {
        throw $compileMinErr(
          "ctxoverride",
          "Property context '{0}.{1}' already set to '{2}', cannot override to '{3}'.",
          elementName,
          propertyName,
          PROP_CONTEXTS[key],
          ctx,
        );
      }

      PROP_CONTEXTS[key] = ctx;

      return this;
    };

    /* Default property contexts.
     *
     * Copy of https://github.com/angular/angular/blob/6.0.6/packages/compiler/src/schema/dom_security_schema.ts#L31-L58
     * Changing:
     * - SecurityContext.* => SCE_CONTEXTS/$sce.*
     * - STYLE => CSS
     * - various URL => MEDIA_URL
     * - *|formAction, form|action URL => RESOURCE_URL (like the attribute)
     */
    (function registerNativePropertyContexts() {
      /** Registers the same security context for a list of `element|property` keys. */
      function registerContext(ctx: string, items: string[]) {
        items.forEach((v) => {
          PROP_CONTEXTS[v.toLowerCase()] = ctx;
        });
      }

      registerContext(SCE_CONTEXTS.HTML, [
        "iframe|srcdoc",
        "*|innerHTML",
        "*|outerHTML",
      ]);
      registerContext(SCE_CONTEXTS.CSS, ["*|style"]);
      registerContext(SCE_CONTEXTS.URL, [
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
      registerContext(SCE_CONTEXTS.MEDIA_URL, [
        "audio|src",
        "img|src",
        "img|srcset",
        "source|src",
        "source|srcset",
        "track|src",
        "video|src",
        "video|poster",
      ]);
      registerContext(SCE_CONTEXTS.RESOURCE_URL, [
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
      $t._injector,
      $t._interpolate,
      $t._exceptionHandler,
      $t._templateRequest,
      $t._parse,
      $t._controller,
      $t._sce,
      $t._animate,
      /** Creates the runtime `$compile` service and its shared helper closures. */
      (
        $injector: ng.InjectorService,
        $interpolate: ng.InterpolateService,
        $exceptionHandler: ng.ExceptionHandlerService,
        $templateRequest: ng.TemplateRequestService,
        $parse: ng.ParseService,
        $controller: ng.ControllerService,
        $sce: ng.SceService,
        $animate: ng.AnimateService,
      ) => {
        // The onChanges hooks should all be run together in a single digest
        // When changes occur, the call to trigger their hooks will be added to this queue
        const onChangesQueue: Array<() => void> = [];

        // This function is called in a $postUpdate to trigger all the onChanges hooks in a single digest
        function flushOnChangesQueue() {
          for (let i = 0, ii = onChangesQueue.length; i < ii; ++i) {
            try {
              onChangesQueue[i]();
            } catch (err) {
              $exceptionHandler(err);
            }
          }
          // Reset the queue to trigger a new schedule next time there is a change
          onChangesQueue.length = 0;
        }

        const startSymbol = $interpolate.startSymbol();

        const endSymbol = $interpolate.endSymbol();

        const denormalizeTemplate =
          startSymbol === "{{" && endSymbol === "}}"
            ? (x: string) => x
            : (x: string) =>
                x.replace(/\{\{/g, startSymbol).replace(/}}/g, endSymbol);

        return compile;

        function compile(
          element: Parameters<CompileFn>[0],
          transcludeFn?: Parameters<CompileFn>[1],
          maxPriority?: Parameters<CompileFn>[2],
          ignoreDirective?: Parameters<CompileFn>[3],
          previousCompileContext?: Parameters<CompileFn>[4],
        ): PublicLinkFn {
          let nodeRef = element ? new NodeRef(element) : null;

          /**
           * The composite link function is a composite of individual node linking functions.
           * It will be invoke by the public link function below.
           */
          let compositeLinkFn = compileNodes(
            nodeRef,
            transcludeFn || undefined,
            maxPriority,
            ignoreDirective,
            previousCompileContext,
          );

          let namespace: string | null = null;

          const publicLinkFn: PublicLinkFn = function (
            scope: Scope,
            cloneConnectFn?: CloneAttachFn,
            options?: TemplateLinkingFunctionOptions,
          ) {
            if (!nodeRef) {
              throw $compileMinErr(
                "multilink",
                "This element has already been linked.",
              );
            }

            assertArg(scope, "scope");

            // could be empty nodelist
            if (nodeRef._element) {
              setScope(nodeRef._element, scope);
            }

            if (
              previousCompileContext &&
              previousCompileContext._needsNewScope
            ) {
              // A parent directive did a replace and a directive on this element asked
              // for transclusion, which caused us to lose a layer of element on which
              // we could hold the new transclusion scope, so we will create it manually
              // here.
              scope = scope.$parent?.$new() || scope.$new();
            }

            options = options || {};
            let { _parentBoundTranscludeFn } = options;

            const { _transcludeControllers, _futureParentElement } = options;

            // When `_parentBoundTranscludeFn` is passed, it is a
            // `controllersBoundTransclude` function (it was previously passed
            // as `transclude` to directive.link) so we must unwrap it to get
            // its `boundTranscludeFn`
            if (
              _parentBoundTranscludeFn &&
              _parentBoundTranscludeFn._boundTransclude
            ) {
              _parentBoundTranscludeFn =
                _parentBoundTranscludeFn._boundTransclude;
            }

            if (!namespace) {
              namespace = detectNamespaceForChildElements(_futureParentElement);
            }
            let $linkNode;

            if (namespace !== "html") {
              // When using a directive with replace:true and templateUrl the jqCompileNodes
              // (or a child element inside of them)
              // might change, so we need to recreate the namespace adapted compileNodes
              // for call to the link function.
              // Note: This will already clone the nodes...
              const fragment = createElementFromHTML("<div></div>");

              fragment.append(nodeRef.node);
              const wrappedTemplate = wrapTemplate(
                namespace,
                fragment.innerHTML,
              );

              $linkNode = new NodeRef(wrappedTemplate[0]);
            } else if (cloneConnectFn) {
              $linkNode = nodeRef._clone();
            } else {
              $linkNode = nodeRef;
            }

            if (_transcludeControllers) {
              const controllers = _transcludeControllers as Record<
                string,
                { _instance: any }
              >;

              for (const controllerName in controllers) {
                assertArg($linkNode.element, "element");
                setCacheData(
                  $linkNode.element,
                  `$${controllerName}Controller`,
                  controllers[controllerName]._instance,
                );
              }
            }

            if (cloneConnectFn) {
              cloneConnectFn($linkNode.dom, scope);
            }

            if (compositeLinkFn) {
              compositeLinkFn(scope, $linkNode, _parentBoundTranscludeFn);
            }

            if (!cloneConnectFn) {
              nodeRef = compositeLinkFn = null;
            }

            return $linkNode._getAll();
          };

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

            (node as Node & { _stable?: boolean })._stable = true;

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

              if (_nodeLinkFnCtx?._newScope) {
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
              _childLinkFn(
                scope,
                new NodeRef(node.childNodes),
                _parentBoundTranscludeFn,
              );
            }
          }
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

          let nodeLinkFnFound: NodeLinkFn | StoredNodeLinkFn | undefined;

          let linkFnFound = false;

          for (let i = 0; i < nodeRefList.size; i++) {
            const attrs = new Attributes($animate, $exceptionHandler, $sce);

            const directives = collectDirectives(
              nodeRefList._getIndex(i) as Element,
              attrs,
              i === 0 ? maxPriority : undefined,
              ignoreDirective,
            );

            let nodeLinkFnCtx: NodeLinkFnCtx | undefined;

            if (directives.length) {
              nodeLinkFnCtx = applyDirectivesToNode(
                directives,
                nodeRefList?._getIndex(i),
                attrs,
                transcludeFn as ChildTranscludeOrLinkFn,
                null,
                [],
                [],
                Object.assign({}, previousCompileContext, {
                  _index: i,
                  _parentNodeRef: nodeRefList,
                  _ctxNodeRef: nodeRefList,
                }),
              );
            }

            let childLinkFn: CompositeLinkFn | ChildLinkFn | null;

            const nodeLinkFn = nodeLinkFnCtx?._nodeLinkFn;

            const { childNodes } = nodeRefList._getIndex(i);

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

              // recursive call
              const childNodeRef = new NodeRef(childNodes);

              childLinkFn = compileNodes(
                childNodeRef,
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
            _nodeRefList: nodeRefList,
            _nodeLinkFnFound: nodeLinkFnFound,
            _transcludeFn: transcludeFn,
          };

          return function compositeLinkFn(
            scope,
            nodeRef,
            _parentBoundTranscludeFn,
          ) {
            assertArg(nodeRef, "nodeRef");

            const stableNodeList = buildStableNodeList(
              compositeLinkState,
              nodeRef,
            );

            linkCompositeNodes(
              compositeLinkState,
              stableNodeList,
              scope,
              _parentBoundTranscludeFn || null,
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
          /**
           * Scope-bound wrapper that ensures a transcluded scope exists and forwards to `transcludeFn`.
           */
          function boundTranscludeFn(
            transcludedScope?: Scope | null,
            cloneFn?: CloneAttachFn,
            controllers?: unknown,
            _futureParentElement?: Node | Element | null,
            containingScope?: Scope,
          ) {
            if (!transcludedScope) {
              transcludedScope = scope.$transcluded(containingScope);
            }

            const transcludeRes = transcludeFn(transcludedScope, cloneFn, {
              _parentBoundTranscludeFn: previousBoundTranscludeFn,
              _transcludeControllers: controllers,
              _futureParentElement,
            });

            return transcludeRes;
          }

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
              nodeName = node.nodeName.toLowerCase();

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
            _nonTlbTranscludeDirective?: any;
            _needsNewScope?: any;
          } | null,
        ): ng.PublicLinkFn | ng.TranscludeFn {
          let compiled: ng.PublicLinkFn | undefined;

          if (eager) {
            return compile(
              nodes,
              transcludeFn,
              maxPriority,
              ignoreDirective,
              previousCompileContext,
            );
          }

          /** Defers compilation until the returned linker/transclude function is first invoked. */
          function lazyCompilation(...args: Parameters<PublicLinkFn>) {
            if (!compiled) {
              compiled = compile(
                nodes,
                transcludeFn,
                maxPriority,
                ignoreDirective,
                previousCompileContext,
              );

              nodes = transcludeFn = previousCompileContext = null;
            }

            return compiled(...args);
          }

          return lazyCompilation;
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
          scope.$watch(linkState._watchExpression, () => {
            applyTextInterpolationValue(
              node,
              linkState._interpolateFn(deProxy(scope)),
            );
          });
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

          attr.$set(
            linkState._name,
            linkState._name === "srcset"
              ? $sce.getTrustedMediaUrl(value)
              : value,
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

          if (expressions.length > 0) {
            const targetScope = observer._scope || scope;

            const watchExpression =
              buildInterpolationWatchExpression(expressions);

            targetScope.$watch(watchExpression, () => {
              applyInterpolatedAttrValue(linkState, attr, interpolateFn(scope));
            });
          } else {
            applyInterpolatedAttrValue(linkState, attr, interpolateFn(scope));
          }
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

          const update = () => {
            $element[linkState._propName] = linkState._sanitizer(
              linkState._ngPropGetter(scope),
            );
          };

          update();

          scope.$watch(linkState._propName, () => {
            update();
          });

          scope.$watch(attrsAny[linkState._attrName], (val: any) => {
            $sce.valueOf(val);
            update();
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

          if (!afterTemplateNodeLinkFnCtx || !compiledNode) {
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

            return;
          }

          invokeResolvedTemplateNodeLink(
            delayedState,
            scope,
            node,
            boundTranscludeFn,
          );
        }

        /** Handles `$transclude(...)` calls for the shared node-link executor. */
        function invokeControllersBoundTransclude(
          transcludeState: ControllersBoundTranscludeState,
          scopeParam?: Scope | CloneAttachFn | null,
          cloneAttachFn?: CloneAttachFn | Node | null,
          _futureParentElement?: Node | null,
          slotName?: string | number,
        ) {
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
            attrs = new Attributes(
              $animate,
              $exceptionHandler,
              $sce,
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

          if (boundTranscludeFn) {
            const transcludeState: ControllersBoundTranscludeState = {
              _boundTranscludeFn: boundTranscludeFn,
              _elementControllers: elementControllers,
              _hasElementTranscludeDirective:
                nodeLinkState._hasElementTranscludeDirective,
              _scopeToChild: scopeToChild,
              _elementRef: $element,
            };

            const newTranscludeFn = function (
              scopeParam,
              cloneAttachFn,
              _futureParentElement,
              slotName,
            ) {
              transcludeState._scopeToChild = scopeToChild;
              transcludeState._elementRef = $element;
              transcludeState._elementControllers = elementControllers;

              return invokeControllersBoundTransclude(
                transcludeState,
                scopeParam,
                cloneAttachFn,
                _futureParentElement,
                slotName,
              );
            } as ControllersBoundTranscludeFn & {
              _boundTransclude?: BoundTranscludeFn;
            };

            newTranscludeFn._boundTransclude = boundTranscludeFn;
            newTranscludeFn.isSlotFilled = function (
              slotName: string | number,
            ) {
              return !!boundTranscludeFn._slots[slotName];
            };
            transcludeFn = newTranscludeFn;
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
              .bindToController as any;

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
            const controllerNames = Object.keys(controllerDirectives);

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
            const controllerNames = Object.keys(elementControllers);

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
          }

          if (
            childLinkFn &&
            linkNode.childNodes &&
            linkNode.childNodes.length
          ) {
            childLinkFn(
              scopeToChild,
              new NodeRef(linkNode.childNodes),
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
            const controllerNames = Object.keys(elementControllers);

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
                  _ctxNodeRef.node = compileNode;
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
                  const slotNames = Object.keys(directiveValue);

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
                        slots[slotName] || document.createDocumentFragment();
                      slots[slotName].appendChild(node);
                    } else {
                      tempContainer.appendChild(node);
                    }
                  }

                  // Check for required slots that were not filled
                  const filledSlotNames = Object.keys(filledSlots);

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
                  $template = Array.from(
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
                    isDefined(linkCtx) ? linkFn : bind(context, linkFn),
                    directive.require,
                    directiveName,
                    isolateScope,
                    linkCtx,
                  );
                } else if (linkFn) {
                  const preLinkCtx = linkFn._preLinkCtx || linkFn._linkCtx;

                  const postLinkCtx = linkFn._postLinkCtx || linkFn._linkCtx;

                  pushLinkFnRecord(
                    preLinkFns,
                    isDefined(preLinkCtx)
                      ? linkFn.pre
                      : bind(context, linkFn.pre),
                    directive.require,
                    directiveName,
                    isolateScope,
                    preLinkCtx,
                  );
                  pushLinkFnRecord(
                    postLinkFns,
                    isDefined(postLinkCtx)
                      ? linkFn.post
                      : bind(context, linkFn.post),
                    directive.require,
                    directiveName,
                    isolateScope,
                    postLinkCtx,
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
            const requireKeys = Object.keys(require);

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

                  if (isObject(bindings.isolateScope)) {
                    directive._isolateBindings = bindings.isolateScope;
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
          const dstKeys = Object.keys(dstAny);

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
          const srcKeys = Object.keys(srcAny);

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

          const delayedState: DelayedTemplateLinkState = {
            _linkQueue: [] as any,
            _afterTemplateChildLinkFn: null,
            _beforeTemplateCompileNode: $compileNode._getAny(),
            _compileNodeRef: $compileNode,
            _origAsyncDirective: origAsyncDirective,
            _previousCompileContext: previousCompileContext,
          };

          const derivedSyncDirective = inherit(origAsyncDirective, {
            templateUrl: null,
            transclude: null,
            replace: null,
            _originalDirective: origAsyncDirective,
          }) as InternalDirective;

          let templateUrl: string;

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
            templateUrl = origAsyncDirective.templateUrl || "";
          }
          const { templateNamespace } = origAsyncDirective;

          emptyElement($compileNode.element);

          $templateRequest(templateUrl || "")
            .then((content) => {
              let compileNode: Element;

              let replacementState: DelayedTemplateReplacementState | undefined;

              content = denormalizeTemplate(content);

              if (origAsyncDirective.replace) {
                let templateNodes: Element[];

                if (isTextNode(content)) {
                  templateNodes = [];
                } else if (isString(content)) {
                  templateNodes = Array.from(
                    createNodelistFromHTML(content),
                  ).filter(
                    (node): node is Element =>
                      node.nodeType !== NodeType._COMMENT_NODE &&
                      node.nodeType !== NodeType._TEXT_NODE &&
                      node.nodeType === NodeType._ELEMENT_NODE,
                  );
                } else {
                  templateNodes = Array.from(
                    wrapTemplate(
                      templateNamespace,
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
                    origAsyncDirective.name,
                    templateUrl,
                  );
                }

                replacementState = {
                  _templateNodes: templateNodes,
                  _templateAttrs: { $attr: {} } as Attributes,
                };

                replaceWith(
                  $compileNode,
                  compileNode,
                  previousCompileContext._index,
                );

                const _templateDirectives = collectDirectives(
                  compileNode,
                  replacementState._templateAttrs,
                );

                if (isObject(origAsyncDirective.scope)) {
                  // the original directive that caused the template to be loaded async required
                  // an isolate scope
                  markDirectiveScope(_templateDirectives, true);
                }
                directives = _templateDirectives.concat(directives);

                mergeTemplateAttributes(
                  tAttrs,
                  replacementState._templateAttrs,
                );
              } else {
                compileNode =
                  delayedState._beforeTemplateCompileNode as Element;
                $compileNode.element.innerHTML = content;
              }

              directives.unshift(derivedSyncDirective);
              delayedState._afterTemplateNodeLinkFnCtx = applyDirectivesToNode(
                directives,
                compileNode,
                tAttrs,
                childTranscludeFn,
                origAsyncDirective,
                preLinkFns,
                postLinkFns,
                { ...previousCompileContext, _ctxNodeRef: $compileNode },
              );

              if ($rootElement) {
                entries($rootElement).forEach(([i, node]) => {
                  if (node === compileNode) {
                    $rootElement[i] = $compileNode;
                  }
                });
              }
              delayedState._compiledNode = compileNode;
              delayedState._afterTemplateChildLinkFn = compileNodes(
                new NodeRef($compileNode._getAny().childNodes),
                childTranscludeFn,
                undefined,
                undefined,
                undefined,
              );

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
              delayedState._linkQueue = null;
            })
            .catch((error) => {
              if (isError(error)) {
                $exceptionHandler(error);
              } else {
                $exceptionHandler(new Error(error));
              }
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
        ) {
          const interpolateFn = $interpolate(text, true);

          if (interpolateFn) {
            const linkState: TextInterpolateLinkState = {
              _interpolateFn: interpolateFn,
              _watchExpression: buildInterpolationWatchExpression(
                interpolateFn.expressions,
              ),
            };

            const directive = {
              priority: 0,
              compile: () =>
                ({
                  post: textInterpolateLinkFn,
                  _postLinkCtx: linkState,
                }) as unknown as ContextualDirectivePrePost<
                  never,
                  TextInterpolateLinkState
                >,
            } as unknown as InternalDirective;

            directives.push(directive);
          }
        }

        /** Determines the SCE trust context required for a DOM attribute binding. */
        function getTrustedAttrContext(
          nodeName: string,
          attrNormalizedName: string,
        ) {
          if (attrNormalizedName === "srcdoc") {
            return $sce.HTML;
          }

          // All nodes with src attributes require a RESOURCE_URL value, except for
          // img and various html5 media nodes, which require the MEDIA_URL context.
          if (attrNormalizedName === "src" || attrNormalizedName === "ngSrc") {
            if (
              ["img", "video", "audio", "source", "track"].indexOf(nodeName) ===
              -1
            ) {
              return $sce.RESOURCE_URL;
            }

            return $sce.MEDIA_URL;
          }

          if (attrNormalizedName === "xlinkHref") {
            // Some xlink:href are okay, most aren't
            if (nodeName === "image") {
              return $sce.MEDIA_URL;
            }

            if (nodeName === "a") {
              return $sce.URL;
            }

            return $sce.RESOURCE_URL;
          }

          if (
            nodeName === "image" &&
            (attrNormalizedName === "href" || attrNormalizedName === "ngHref")
          ) {
            return $sce.MEDIA_URL;
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
            return $sce.RESOURCE_URL;
          }

          if (
            nodeName === "a" &&
            (attrNormalizedName === "href" || attrNormalizedName === "ngHref")
          ) {
            return $sce.URL;
          }

          return undefined;
        }

        /** Determines the SCE trust context required for a DOM property binding. */
        function getTrustedPropContext(
          nodeName: string,
          propNormalizedName: string,
        ) {
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

          // Such values are a bit too complex to handle automatically inside $sce.
          // Instead, we sanitize each of the URIs individually, which works, even dynamically.
          // It's not possible to work around this using `$sce.trustAsMediaUrl`.
          // If you want to programmatically set explicitly trusted unsafe URLs, you should use
          // `$sce.trustAsHtml` on the whole `img` tag and inject it into the DOM using the
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

            // sanitize the uri
            result += $sce.getTrustedMediaUrl(trim(rawUris[innerIdx]));
            // add the descriptor
            result += ` ${trim(rawUris[innerIdx + 1])}`;
          }

          // split the last item into uri and descriptor
          const lastTuple = trim(rawUris[i * 2]).split(/\s/);

          // sanitize the last uri
          result += $sce.getTrustedMediaUrl(trim(lastTuple[0]));

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
              sanitizeSrcset($sce.valueOf(value), "ng-prop-srcset");
          } else if (trustedContext) {
            sanitizer = $sce.getTrusted.bind($sce, trustedContext);
          }

          const directive = {
            priority: 100,
            compile: function ngPropCompileFn(
              _: HTMLElement,
              attr: Attributes & Record<string, any>,
            ) {
              return {
                pre: propertyDirectivePreLinkFn,
                _preLinkCtx: {
                  _attrName: attrName,
                  _propName: propName,
                  _ngPropGetter: $parse(attr[attrName]),
                  _sanitizer: sanitizer,
                },
              } as unknown as ContextualDirectivePrePost<PropertyDirectiveLinkState>;
            },
          } as unknown as InternalDirective;

          directives.push(directive);
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
            compile() {
              return {
                pre: attrInterpolatePreLinkFn,
                _preLinkCtx: {
                  _name: name,
                  _value: value,
                  _trustedContext: trustedContext,
                  _allOrNothing: allOrNothing,
                  _interpolateFn: interpolateFn,
                },
              } as unknown as ContextualDirectivePrePost<AttrInterpolateLinkState>;
            },
          } as unknown as InternalDirective;

          directives.push(directive);
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

          let changes: Record<string, SimpleChange> | undefined;

          const attrsAny = attrs as any;

          const destAny = destination as any;

          const scopeTarget = scope.$target as Record<string, any>;

          const destinationTarget = destAny.$target as Record<string, any>;

          const attrsObservers =
            attrs._observers || (attrs._observers = nullObject() as any);

          if (bindings) {
            const bindingNames = Object.keys(bindings);

            for (
              let bindingIndex = 0;
              bindingIndex < bindingNames.length;
              bindingIndex++
            ) {
              const scopeName = bindingNames[bindingIndex];

              const definition = bindings[scopeName];

              const {
                attrName,
                optional,
                mode, // @, =, <, or &
              } = definition;

              let lastValue: any;

              let parentGet: any;

              let parentSet: any;

              let compare: any;

              let removeWatch: Function | undefined;

              let firstCall = true;

              let firstChange = true;

              switch (mode) {
                case "@":
                  if (!optional && !hasOwn(attrs, attrName)) {
                    strictBindingsCheck(attrName, directive.name);
                    destAny[scopeName] = attrsAny[attrName] = undefined;
                  }

                  removeWatch = attrs.$observe(
                    attrName,
                    /** @param value */
                    (value) => {
                      if (isString(value) || isBoolean(value)) {
                        recordChanges(scopeName, value, firstChange);

                        destAny[scopeName] = value;

                        if (firstCall) {
                          firstCall = false;
                        } else {
                          triggerOnChangesHook();
                          firstChange = false;
                        }
                      }
                    },
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
                      // reset the change, or we will throw this exception on every $digest

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

                  const parentValueWatch = function parentValueWatch(
                    parentValue: any,
                  ): any {
                    if (!compare(parentValue, destAny[scopeName])) {
                      // we are out of sync and need to copy
                      if (!compare(parentValue, lastValue)) {
                        // parent changed and it has precedence
                        destAny[scopeName] = parentValue;
                      } else {
                        // if the parent can be assigned then do so
                        parentSet(scope, (parentValue = destAny[scopeName]));
                      }
                    }
                    lastValue = parentValue;

                    return lastValue;
                  };

                  if (attrsAny[attrName]) {
                    const expr = attrsAny[attrName];

                    const syncParentValue = $parse(expr, parentValueWatch);

                    // make it lazy as we dont want to trigger the two way data binding at this point
                    scope.$watch(
                      expr,
                      (val) => {
                        if (val) {
                          if (parentGet && parentGet._literal) {
                            scopeTarget[attrName] = val;
                          } else {
                            (scope as any)[attrName] = val;
                          }
                          syncParentValue(scope);
                        } else {
                          (scope as any)[attrName] = (scope as any)[
                            attrsAny[attrName]
                          ];
                        }
                      },
                      true,
                    );
                  }

                  removeWatch = destination.$watch(
                    attrName,
                    (val) => {
                      if (
                        val === lastValue &&
                        !isUndefined(attrsAny[attrName])
                      ) {
                        return;
                      }

                      if (
                        (parentGet &&
                          !!parentGet._inputs &&
                          !parentGet._literal) ||
                        (isUndefined(attrsAny[attrName]) && isDefined(val))
                      ) {
                        destinationTarget[attrName] = lastValue;
                        throw $compileMinErr(
                          "nonassign",
                          "Expression '{0}' in attribute '{1}' used with directive '{2}' is non-assignable!",
                          attrsAny[attrName],
                          attrName,
                          directive.name,
                        );
                      } else {
                        // manually set the handler to avoid watch cycles
                        if (isObject(val)) {
                          const valueKeys = Object.keys(val);

                          for (let i = 0, l = valueKeys.length; i < l; i++) {
                            const key = valueKeys[i];

                            scopeTarget[key] = val[key];
                          }
                        } else {
                          parentSet(scopeTarget, (lastValue = val));
                          const attributeWatchers =
                            scope.$handler._watchers.get(attrsAny[attrName]);

                          if (attributeWatchers) {
                            for (
                              let i = 0, l = attributeWatchers.length;
                              i < l;
                              i++
                            ) {
                              attributeWatchers[i]._listenerFn(
                                val,
                                scope.$target,
                              );
                            }
                          }
                        }
                      }
                    },
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
                  initialChanges[scopeName] = {
                    currentValue: destAny.$target[scopeName],
                    firstChange,
                  };
                  scope.$target.attrs = attrs;

                  if (attrsAny[attrName]) {
                    removeWatch = scope.$watch(
                      attrsAny[attrName],
                      (val) => {
                        destAny.$target[scopeName] = val;
                        recordChanges(scopeName, val, firstChange);

                        if (firstChange) {
                          firstChange = false;
                        }
                      },
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

                  destAny.$target[scopeName] = function (locals: any) {
                    return parentGet && parentGet(scopeTarget, locals);
                  };

                  break;
              }
            }
          }

          /** Records a binding change so `$onChanges` can be invoked once per digest. */
          function recordChanges(
            key: string,
            currentValue: any,
            initial: boolean,
          ): void {
            if (isFunction(destAny.$onChanges)) {
              // If we have not already scheduled the top level onChangesQueue handler then do so now
              if (!onChangesQueue.length) {
                scope.$postUpdate(flushOnChangesQueue);
                onChangesQueue.length = 0;
              }

              // If we have not already queued a trigger of onChanges for this controller then do so now
              if (!changes) {
                changes = {};
                onChangesQueue.push(triggerOnChangesHook);
              }
              // Store this change
              changes[key] = {
                currentValue,
                firstChange: initial,
              };
            }
          }

          function triggerOnChangesHook(): void {
            destAny.$onChanges && changes && destAny.$onChanges(changes);
            // Now clear the changes so that we schedule onChanges when more changes arrive
            changes = undefined;
          }

          return {
            _initialChanges: initialChanges,
            _removeWatches:
              removeWatchCollection.length > 0
                ? function removeWatches() {
                    for (
                      let i = 0, ii = removeWatchCollection.length;
                      i < ii;
                      ++i
                    ) {
                      removeWatchCollection[i]?.();
                    }
                  }
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

    for (let i = 0, len = entryList.length; i < len; i++) {
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
  nodeRef: NodeRef,
): Node[] {
  let stableNodeList = [];

  if (state._nodeLinkFnFound) {
    const stableLength = nodeRef._isList ? nodeRef.nodes.length : 1;

    stableNodeList = new Array(stableLength);

    for (let i = 0, l = state._linkFnsList.length; i < l; i++) {
      const { _index: idx } = state._linkFnsList[i];

      if (idx === 0) {
        stableNodeList[idx] = nodeRef._isList
          ? nodeRef.nodes[idx]
          : nodeRef.node;
      } else if (state._nodeRefList?._getIndex(idx)) {
        stableNodeList[idx] = nodeRef.nodes[idx];
      }
    }
  } else if (nodeRef._isList) {
    for (let i = 0, l = nodeRef.nodes.length; i < l; i++) {
      stableNodeList.push(nodeRef.nodes[i]);
    }
  } else {
    stableNodeList.push(nodeRef.node);
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

  const fragment = document.createDocumentFragment();

  elementsToRemove._collection().forEach((element) => {
    fragment.appendChild(element);
  });

  elementsToRemove.node = newNode;
}
