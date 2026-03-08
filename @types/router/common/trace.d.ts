type CategoryValue = (typeof Category)[keyof typeof Category];
type TraceCategoryInput = CategoryValue | string | number;
type TraceLogger = Pick<Console, "log" | "table">;
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
export declare const Category: {
  readonly _RESOLVE: "RESOLVE";
  readonly _TRANSITION: "TRANSITION";
  readonly _HOOK: "HOOK";
  readonly _UIVIEW: "UIVIEW";
  readonly _VIEWCONFIG: "VIEWCONFIG";
};
/**
 * Prints ng-router Transition trace information to the console.
 */
export declare class Trace {
  _enabled: Record<string, boolean>;
  approximateDigests: number;
  $logger: TraceLogger;
  constructor();
  _set(enabled: boolean, categories: TraceCategoryInput[]): void;
  enable(...categories: TraceCategoryInput[]): void;
  disable(...categories: TraceCategoryInput[]): void;
  /**
   * Retrieves the enabled stateus of a [[Category]]
   *
   * ```js
   * trace.enabled("VIEWCONFIG"); // true or false
   * ```
   * @param {TraceCategoryInput} category
   * @returns {boolean} true if the category is enabled
   */
  enabled(category: TraceCategoryInput): boolean;
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
export declare const trace: Trace;
export {};
