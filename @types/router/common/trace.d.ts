export type Category = number;
export namespace Category {
  let _RESOLVE: number;
  let _TRANSITION: number;
  let _HOOK: number;
  let _UIVIEW: number;
  let _VIEWCONFIG: number;
}
/**
 * Prints ng-router Transition trace information to the console.
 */
export class Trace {
  _enabled: {};
  approximateDigests: number;
  $logger: any;
  _set(enabled: any, categories: any): void;
  enable(...categories: any[]): void;
  disable(...categories: any[]): void;
  /**
   * Retrieves the enabled stateus of a [[Category]]
   *
   * ```js
   * trace.enabled("VIEWCONFIG"); // true or false
   * ```
   *
   * @returns boolean true if the category is enabled
   */
  enabled(category: any): boolean;
  /** @internal called by ng-router code */
  traceTransitionStart(trans: any): void;
  /** @internal called by ng-router code */
  traceTransitionIgnored(trans: any): void;
  /** @internal called by ng-router code */
  traceHookInvocation(step: any, trans: any, options: any): void;
  /** @internal called by ng-router code */
  traceHookResult(hookResult: any, trans: any): void;
  /** @internal called by ng-router code */
  traceResolvePath(path: any, when: any, trans: any): void;
  /** @internal called by ng-router code */
  traceResolvableResolved(resolvable: any, trans: any): void;
  /** @internal called by ng-router code */
  traceError(reason: any, trans: any): void;
  /** @internal called by ng-router code */
  traceSuccess(finalState: any, trans: any): void;
  /** @internal called by ng-router code */
  traceUIViewEvent(event: any, viewData: any, extra?: string): void;
  /** @internal called by ng-router code */
  traceUIViewConfigUpdated(viewData: any, context: any): void;
  /** @internal called by ng-router code */
  traceUIViewFill(viewData: any, html: any): void;
  /** @internal called by ng-router code */
  traceViewSync(pairs: any): void;
  /** @internal called by ng-router code */
  traceViewServiceEvent(event: any, viewConfig: any): void;
  /** @internal called by ng-router code */
  traceViewServiceUIViewEvent(event: any, viewData: any): void;
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
