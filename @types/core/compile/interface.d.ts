import type { Scope } from "../scope/scope.js";
import type { NodeRef } from "../../shared/noderef.js";
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
  transcludeControllers?: unknown;
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
  index: number;
  nodeLinkFnCtx?: NodeLinkFnCtx;
  childLinkFn?: CompositeLinkFn | null;
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
 * Context information for a NodeLinkFn.
 */
export interface NodeLinkFnCtx {
  nodeLinkFn: NodeLinkFn;
  terminal: boolean;
  transclude: ChildTranscludeOrLinkFn;
  transcludeOnThisElement: boolean;
  templateOnThisElement: boolean;
  newScope: boolean;
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
  index?: number;
  /** The parent NodeRef list that the current node belongs to (used when replaced nodes must be re-indexed). */
  parentNodeRef?: NodeRef;
  /**
   * Mutable NodeRef pointing at the “current” compile node for this context.
   * Updated when directives replace or element-transclude the node (e.g. comment anchor).
   */
  ctxNodeRef?: NodeRef;
  /**
   * When true, linking must create a fresh scope anchor because a parent replace+transclusion
   * removed the element that would normally hold the transclusion scope.
   * Consumed by `publicLinkFn` to do `scope.$parent?.$new()` in that edge case.
   */
  needsNewScope?: boolean;
  /**
   * True if an element-transcluding directive has been applied (transclude === "element").
   * Affects how controllers/transclusion are resolved and how templateUrl linking re-attaches nodes.
   */
  hasElementTranscludeDirective?: boolean;
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
