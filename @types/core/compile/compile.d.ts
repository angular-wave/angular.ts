/**
 * Normalizes the `require` declaration for a directive.
 * Object-form requires inherit their own key when the value omits the directive name
 * (e.g. `{ foo: "^^" }` becomes `{ foo: "^^foo" }`).
 *
 * @param {ng.Directive} directive
 * @returns {string | Array<any> | Record<string, string> | undefined}
 */
export function getDirectiveRequire(
  directive: ng.Directive,
): string | Array<any> | Record<string, string> | undefined;
/**
 * Validates and normalizes a directive `restrict` value.
 *
 * @param {unknown} restrict
 * @param {string} name
 * @returns {string}
 */
export function getDirectiveRestrict(restrict: unknown, name: string): string;
/**
 * Detects the namespace used when compiling child nodes beneath a parent element.
 * This is primarily used to decide whether template wrapping should happen in HTML or SVG mode.
 *
 * @param {Element | Node | null | undefined} parentElement
 * @returns {"html" | "svg"}
 */
export function detectNamespaceForChildElements(
  parentElement: Element | Node | null | undefined,
): "html" | "svg";
/**
 * Builds a stable node array for linking so index-based mappings stay valid even if DOM shape changes.
 *
 * @param {CompositeLinkState} state
 * @param {NodeRef} nodeRef
 * @returns {Node[]}
 */
export function buildStableNodeList(
  state: CompositeLinkState,
  nodeRef: NodeRef,
): Node[];
/**
 * Serializes one or more interpolation inputs into the watch expression used by `$watch`.
 * Single expressions stay unchanged; multi-input interpolations are packed into an array expression.
 *
 * @param {string[]} expressions
 * @returns {string}
 */
export function buildInterpolationWatchExpression(
  expressions: string[],
): string;
/**
 * Writes the interpolated text result to either an element node or a text node.
 *
 * @param {Node} node
 * @param {string} value
 * @returns {void}
 */
export function applyTextInterpolationValue(node: Node, value: string): void;
/**
 * Sorts directives by priority, then name, then registration index.
 * This matches the compiler's directive application order.
 *
 * @param {InternalDirective} a
 * @param {InternalDirective} b
 * @returns {number}
 */
export function byPriority(a: InternalDirective, b: InternalDirective): number;
/**
 * Wraps non-HTML templates in a temporary namespace container so the browser parses SVG/MathML correctly.
 *
 * @param {string | undefined} type
 * @param {string} template
 * @returns {string | NodeListOf<ChildNode>}
 */
export function wrapTemplate(
  type: string | undefined,
  template: string,
): string | NodeListOf<ChildNode>;
/**
 * Replaces the node currently represented by `elementsToRemove` while preserving the removed nodes
 * in a fragment so traversal and later queries continue to work during compilation.
 *
 * @param {NodeRef} elementsToRemove
 * @param {Node} newNode
 * @param {number} [index]
 * @returns {void}
 */
export function replaceWith(
  elementsToRemove: NodeRef,
  newNode: Node,
  index?: number,
): void;
export const DirectiveSuffix: "Directive";
export class CompileProvider {
  static $inject: ("$$sanitizeUriProvider" | "$provide")[];
  /**
   * @param {ng.ProvideService} $provide
   * @param {import('../sanitize/sanitize-uri.ts').SanitizeUriProvider} $sanitizeUriProvider
   */
  constructor(
    $provide: ng.ProvideService,
    $sanitizeUriProvider: import("../sanitize/sanitize-uri.ts").SanitizeUriProvider,
  );
  /**
   * Register a new directive with the compiler.
   *
   * @param {string|Object} name Name of the directive in camel-case (i.e. `ngBind` which will match
   *    as `ng-bind`), or an object map of directives where the keys are the names and the values
   *    are the factories.
   * @param {Function|Array<Function>} directiveFactory An injectable directive factory function. See the
   *    {@link guide/directive directive guide} and the {@link $compile compile API} for more info.
   * @returns {CompileProvider} Self for chaining.
   */
  directive: (
    name: string | any,
    directiveFactory: Function | Array<Function>,
  ) => CompileProvider;
  /**
   * @param {string|Object} name Name of the component in camelCase (i.e. `myComp` which will match `<my-comp>`),
   *    or an object map of components where the keys are the names and the values are the component definition objects.
   * @param {import("../../interface.ts").Component} options Component definition object (a simplified
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
   * @returns {CompileProvider} the compile provider itself, for chaining of function calls.
   */
  component: (
    name: string | any,
    options: import("../../interface.ts").Component,
  ) => CompileProvider;
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
   * @param {RegExp=} regexp New regexp to trust urls with.
   * @returns {RegExp|import('../sanitize/sanitize-uri.ts').SanitizeUriProvider} Current RegExp if called without value or self for
   *    chaining otherwise.
   */
  aHrefSanitizationTrustedUrlList: (
    regexp?: RegExp | undefined,
  ) => RegExp | import("../sanitize/sanitize-uri.ts").SanitizeUriProvider;
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
   * @param {RegExp=} regexp New regexp to trust urls with.
   * @returns {RegExp|import('../sanitize/sanitize-uri.ts').SanitizeUriProvider | undefined} Current RegExp if called without value or self for
   *    chaining otherwise.
   */
  imgSrcSanitizationTrustedUrlList: (
    regexp?: RegExp | undefined,
  ) =>
    | RegExp
    | import("../sanitize/sanitize-uri.ts").SanitizeUriProvider
    | undefined;
  strictComponentBindingsEnabled: (enabled: boolean) => boolean | this;
  /**
   * Defines the security context for DOM properties bound by ng-prop-*.
   *
   * @param {string} elementName The element name or '*' to match any element.
   * @param {string} propertyName The DOM property name.
   * @param {string} ctx The {@link _sce} security context in which this value is safe for use, e.g. `$sce.URL`
   * @returns {object} `this` for chaining
   */
  addPropertySecurityContext: (
    elementName: string,
    propertyName: string,
    ctx: string,
  ) => object;
  $get: (
    | "$animate"
    | "$controller"
    | "$exceptionHandler"
    | "$interpolate"
    | "$parse"
    | "$sce"
    | "$templateRequest"
    | "$injector"
    | ((
        $injector: ng.InjectorService,
        $interpolate: ng.InterpolateService,
        $exceptionHandler: ng.ExceptionHandlerService,
        $templateRequest: ng.TemplateRequestService,
        $parse: ng.ParseService,
        $controller: ng.ControllerService,
        $sce: ng.SceService,
        $animate: ng.AnimateService,
      ) => ng.CompileService)
  )[];
}
export type BoundTranscludeFn = import("./interface.ts").BoundTranscludeFn;
export type ChildTranscludeOrLinkFn =
  import("./interface.ts").ChildTranscludeOrLinkFn;
export type ChildLinkFn = import("./interface.ts").ChildLinkFn;
export type CloneAttachFn = import("./interface.ts").CloneAttachFn;
export type CompileNodesFn = import("./interface.ts").CompileNodesFn;
export type CompositeLinkFn = import("./interface.ts").CompositeLinkFn;
export type NodeLinkFn = import("./interface.ts").NodeLinkFn;
export type NodeLinkFnCtx = import("./interface.ts").NodeLinkFnCtx;
export type PreviousCompileContext =
  import("./interface.ts").PreviousCompileContext;
export type PublicLinkFn = import("./interface.ts").PublicLinkFn;
export type StoredNodeLinkFn = import("./interface.ts").StoredNodeLinkFn;
export type TranscludedNodes = import("./interface.ts").TranscludedNodes;
export type InternalDirective = import("./interface.ts").InternalDirective;
export type LinkFnRecord = {
  _fn: Function;
  _require: string | Array<any> | Record<string, any> | undefined;
  _directiveName: string;
  _isolateScope: boolean;
  _linkCtx?: any;
};
export type CompositeLinkState = {
  _linkFnsList: import("./interface.ts").LinkFnMapping[];
  _nodeRefList: NodeRef;
  _nodeLinkFnFound?: Function;
  _transcludeFn: ChildTranscludeOrLinkFn | null | undefined;
};
export type NodeLinkState = {
  _compileNode: Node | Element;
  _templateAttrs: Attributes;
  _transcludeFn: ChildTranscludeOrLinkFn;
  _controllerDirectives?: Record<string, any>;
  _newIsolateScopeDirective?: InternalDirective | null;
  _newScopeDirective?: InternalDirective | null;
  _hasElementTranscludeDirective?: boolean;
  _preLinkFns: LinkFnRecord[];
  _postLinkFns: LinkFnRecord[];
};
export type ControllersBoundTranscludeState = {
  _boundTranscludeFn: BoundTranscludeFn;
  _elementControllers: Record<string, any>;
  _hasElementTranscludeDirective?: boolean;
  _scopeToChild: import("../scope/scope.js").Scope;
  _elementRef: NodeRef;
};
export type TextInterpolateLinkState = {
  _interpolateFn: import("../interpolate/interface.ts").InterpolationFunction;
  _watchExpression: string;
};
export type AttrInterpolateLinkState = {
  _name: string;
  _value: string;
  _trustedContext: string | undefined;
  _allOrNothing: boolean;
  _interpolateFn?: import("../interpolate/interface.ts").InterpolationFunction;
};
export type PropertyDirectiveLinkState = {
  _attrName: string;
  _propName: string;
  _ngPropGetter: Function;
  _sanitizer: Function;
};
export type DelayedTemplateLinkState = {
  _linkQueue: any[] | null;
  _afterTemplateChildLinkFn: CompositeLinkFn | null;
  _afterTemplateNodeLinkFnCtx?: NodeLinkFnCtx;
  _beforeTemplateCompileNode: Node | Element;
  _compileNodeRef: NodeRef;
  _compiledNode?: Element;
  _origAsyncDirective: InternalDirective;
  _previousCompileContext: PreviousCompileContext;
};
import { NodeRef } from "../../shared/noderef.ts";
import { Attributes } from "./attributes.ts";
