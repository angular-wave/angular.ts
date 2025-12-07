import type { Scope } from "../scope/scope.js";
import type { NodeRef } from "../../shared/noderef.js";

/**
 * A function passed as the fifth argument to a `PublicLinkFn` link function.
 * It behaves like a linking function, with the `scope` argument automatically created
 * as a new child of the transcluded parent scope.
 *
 * The function returns the DOM content to be injected (transcluded) into the directive.
 */
export type TranscludeFn = {
  (clone?: Element | Node | ChildNode | NodeList | Node[], scope?: Scope): void;
  $$slots?: any;
};

/**
 * A specialized version of `TranscludeFn` with the scope argument already bound.
 * This function requires no parameters and returns the same result as `TranscludeFn`.
 */
export type BoundTranscludeFn = () => Element | Node;

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
    cloneConnectFn?: TranscludeFn,
    options?: any,
  ): Element | Node | ChildNode | Node[];
  pre?: any;
  post?: any;
};

/**
 * Entry point for the `$compile` service.
 */
export type CompileFn = (
  compileNode: string | Element | Node | ChildNode | NodeList,
  transcludeFn?: TranscludeFn,
  maxPriority?: number,
  ignoreDirective?: string,
  previousCompileContext?: any, // TODO: define type if known
) => PublicLinkFn;

/**
 * Represents a mapping of linking functions.
 */
export interface LinkFnMapping {
  index: number;
  nodeLinkFnCtx?: NodeLinkFnCtx;
  childLinkFn?: CompositeLinkFn;
}

/**
 * Function that compiles a list of nodes and returns a composite linking function.
 */
export type CompileNodesFn = () => CompositeLinkFn;

/**
 * A function used to link a specific node.
 */
export type NodeLinkFn = () => Node | Element | NodeList;

/**
 * Context information for a NodeLinkFn.
 */
export interface NodeLinkFnCtx {
  nodeLinkFn: NodeLinkFn;
  terminal: boolean;
  transclude: TranscludeFn;
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
  parentBoundTranscludeFn?: Function,
) => void;
