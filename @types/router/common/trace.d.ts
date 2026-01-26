/**
 * Trace categories Enum
 *
 * Enable or disable a category using [[Trace.enable]] or [[Trace.disable]]
 *
 * `trace.enable(Category.TRANSITION)`
 *
 * These can also be provided using a matching string, or position ordinal
 *
 * `trace.enable("TRANSITION")`
 *
 * `trace.enable(1)`
 */
/**
 * @type {Record<string, string>}
 */
export const Category: Record<string, string>;
/**
 * Prints ng-router Transition trace information to the console.
 */
export class Trace {
  /** @type {Record<string, boolean> } */
  _enabled: Record<string, boolean>;
  approximateDigests: number;
  $logger: any;
  /**
   * @param {boolean} enabled
   * @param {string[]} categories
   */
  _set(enabled: boolean, categories: string[]): void;
  /**
   * @param {string[]} categories
   */
  enable(...categories: string[]): void;
  /**
   * @param {string[]} categories
   */
  disable(...categories: string[]): void;
  /**
   * Retrieves the enabled stateus of a [[Category]]
   *
   * ```js
   * trace.enabled("VIEWCONFIG"); // true or false
   * ```
   * @param {string} category
   * @returns {boolean} true if the category is enabled
   */
  enabled(category: string): boolean;
  /**
   * @internal called by ng-router code
   * @param {ng.Transition} trans
   */
  traceTransitionStart(trans: ng.Transition): void;
  /**
   * @internal called by ng-router code
   * @param {ng.Transition} trans
   */
  traceTransitionIgnored(trans: ng.Transition): void;
  /**
   * @internal called by ng-router code
   * @param {import("../transition/transition-hook.js").TransitionHook} step
   * @param {ng.Transition} trans
   * @param {import("../transition/interface.ts").TransitionHookOptions} options
   */
  traceHookInvocation(
    step: import("../transition/transition-hook.js").TransitionHook,
    trans: ng.Transition,
    options: import("../transition/interface.ts").TransitionHookOptions,
  ): void;
  /** @internal called by ng-router code */
  /**
   * @param {HookResult} hookResult
   * @param {ng.Transition} trans
   */
  traceHookResult(hookResult: HookResult, trans: ng.Transition): void;
  /**
   * @internal called by ng-router code
   * @param {import("../path/path-node.js").PathNode[]} path
   * @param {import("../resolve/interface.ts").PolicyWhen} when
   * @param {ng.Transition} trans
   */
  traceResolvePath(
    path: import("../path/path-node.js").PathNode[],
    when: import("../resolve/interface.ts").PolicyWhen,
    trans: ng.Transition,
  ): void;
  /**
   * @internal called by ng-router code
   * @param {import("../resolve/resolvable.js").Resolvable} resolvable
   * @param {ng.Transition} trans
   */
  traceResolvableResolved(
    resolvable: import("../resolve/resolvable.js").Resolvable,
    trans: ng.Transition,
  ): void;
  /**
   * @internal called by ng-router code
   * @param {any} reason
   * @param {ng.Transition} trans
   */
  traceError(reason: any, trans: ng.Transition): void;
  /**
   * @internal called by ng-router code
   * @param {import("../state/state-object.js").StateObject} finalState
   * @param {ng.Transition} trans
   */
  traceSuccess(
    finalState: import("../state/state-object.js").StateObject,
    trans: ng.Transition,
  ): void;
  /**
   * @internal called by ng-router code
   * @param {string} event
   * @param {import("../view/interface.ts").ActiveUIView} viewData
   */
  traceUIViewEvent(
    event: string,
    viewData: import("../view/interface.ts").ActiveUIView,
    extra?: string,
  ): void;
  /**
   * @internal called by ng-router code
   * @param {import("../view/interface.ts").ActiveUIView} viewData
   * @param {import("../view/interface.ts").ViewContext | undefined} context
   */
  traceUIViewConfigUpdated(
    viewData: import("../view/interface.ts").ActiveUIView,
    context: import("../view/interface.ts").ViewContext | undefined,
  ): void;
  /**
   * @internal called by ng-router code
   * @param {import("../view/interface.ts").ActiveUIView} viewData
   * @param {string} html
   */
  traceUIViewFill(
    viewData: import("../view/interface.ts").ActiveUIView,
    html: string,
  ): void;
  /**
   * @internal called by ng-router code
   * @param {import("../view/interface.ts").ViewTuple[]} pairs
   */
  traceViewSync(pairs: import("../view/interface.ts").ViewTuple[]): void;
  /**
   * @internal called by ng-router code
   * @param {string} event
   * @param {import("../view/interface.ts").ViewConfig} viewConfig
   */
  traceViewServiceEvent(
    event: string,
    viewConfig: import("../view/interface.ts").ViewConfig,
  ): void;
  /**
   * @internal called by ng-router code
   * @param {string} event
   * @param {import("../view/interface.ts").ActiveUIView} viewData
   */
  traceViewServiceUIViewEvent(
    event: string,
    viewData: import("../view/interface.ts").ActiveUIView,
  ): void;
}
/**
 * The [[Trace]] singleton
 *
 * #### Example:
 * ```js
 * import {trace} from "@uirouter/core/index";
 * trace.enable(1, 5);
 * ```
 */
export const trace: Trace;
export type HookResult = import("../transition/interface.ts").HookResult;
export type TransitionHook =
  import("../transition/transition-hook.js").TransitionHook;
