/**
 * # Transition tracing (debug)
 *
 * Enable transition tracing to print transition information to the console,
 * in order to help debug your application.
 * Tracing logs detailed information about each Transition to your console.
 *
 * To enable tracing, import the [[Trace]] singleton and enable one or more categories.
 *
 * ### ES6
 * ```js
 * import {trace} from "@uirouter/core/index";
 * trace.enable(1, 5); // TRANSITION and VIEWCONFIG
 * ```
 *
 * ### CJS
 * ```js
 * let trace = require("@uirouter/core").trace;
 * trace.enable("TRANSITION", "VIEWCONFIG");
 * ```
 *
 * ### Globals
 * ```js
 * let trace = window["@uirouter/core"].trace;
 * trace.enable(); // Trace everything (very verbose)
 * ```
 *
 * ### Angular 1:
 * ```js
 * app.run($trace => $trace.enable());
 * ```
 *
 * @packageDocumentation
 */
import { parse } from "../../shared/hof.ts";
import { isNumber, keys } from "../../shared/utils.ts";
import {
  functionToString,
  maxLength,
  padString,
  stringify,
} from "../../shared/strings.ts";
import type { HookResult } from "../transition/interface.ts";
import type {
  TransitionHook,
  TransitionHookOptions,
} from "../transition/transition-hook.ts";
import type { PathNode } from "../path/path-node.ts";
import type { PolicyWhen, Resolvable } from "../resolve/resolvable.ts";
import type { StateObject } from "../state/state-object.ts";
import type {
  ActiveUIView,
  ViewConfig,
  ViewContext,
  ViewTuple,
} from "../view/view.ts";

const MAX_PAD_LENGTH = 30;

type CategoryValue = (typeof Category)[keyof typeof Category];

type TraceCategoryInput = CategoryValue | string | number;

type TraceLogger = Pick<Console, "log" | "table">;

function ngViewString(ngView: ActiveUIView | null | undefined): string {
  if (!ngView) return "ng-view (defunct)";
  const state = ngView.creationContext
    ? ngView.creationContext.name || "(root)"
    : "(none)";

  return `[ng-view#${ngView.id}:${ngView.fqn} (${ngView.name}@${state})]`;
}

const viewConfigString = (viewConfig: ViewConfig): string => {
  const view = viewConfig.viewDecl;

  const state = view.$context?.name || "(root)";

  return `[View#${viewConfig.$id} from '${state}' state]: target ng-view: '${view.$ngViewName}@${view.$ngViewContextAnchor}'`;
};

function normalizedCat(input: TraceCategoryInput): string {
  if (isNumber(input)) {
    return String(input);
  }

  const normalized = String(input);

  const categoryKey = keys(Category).find(
    (key) => Category[key as keyof typeof Category] === normalized,
  );

  return categoryKey
    ? Category[categoryKey as keyof typeof Category]
    : normalized;
}
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

export const Category = {
  _RESOLVE: "RESOLVE",
  _TRANSITION: "TRANSITION",
  _HOOK: "HOOK",
  _UIVIEW: "UIVIEW",
  _VIEWCONFIG: "VIEWCONFIG",
} as const;

const _tid = parse("$id");

const _rid = parse("router.$id");

function transLbl(trans: ng.Transition): string {
  return `Transition #${_tid(trans)}-${_rid(trans)}`;
}

/**
 * Prints ng-router Transition trace information to the console.
 */
export class Trace {
  private _enabled: Record<string, boolean>;
  private _logger: TraceLogger;

  constructor() {
    this._enabled = {};
    this._logger = console;
  }

  /** @internal */
  _setLogger(logger: TraceLogger): void {
    this._logger = logger;
  }

  /** @internal */
  _set(enabled: boolean, categories: TraceCategoryInput[]): void {
    if (!categories.length) {
      categories = Object.values(Category);
    }
    categories
      .map(normalizedCat)
      .forEach((category) => (this._enabled[category] = enabled));
  }

  enable(...categories: TraceCategoryInput[]): void {
    this._set(true, categories);
  }

  disable(...categories: TraceCategoryInput[]): void {
    this._set(false, categories);
  }

  /**
   * Retrieves the enabled stateus of a [[Category]]
   *
   * ```js
   * trace.enabled("VIEWCONFIG"); // true or false
   * ```
   * @returns True if the category is enabled.
   */
  enabled(category: TraceCategoryInput): boolean {
    return !!this._enabled[normalizedCat(category)];
  }

  /** @internal called by ng-router code */
  traceTransitionStart(trans: ng.Transition): void {
    if (!this.enabled(Category._TRANSITION)) return;
    this._logger.log(`${transLbl(trans)}: Started  -> ${stringify(trans)}`);
  }

  /** @internal called by ng-router code */
  traceTransitionIgnored(trans: ng.Transition): void {
    if (!this.enabled(Category._TRANSITION)) return;
    this._logger.log(`${transLbl(trans)}: Ignored  <> ${stringify(trans)}`);
  }

  /** @internal called by ng-router code */
  traceHookInvocation(
    step: TransitionHook,
    trans: ng.Transition,
    options: TransitionHookOptions,
  ): void {
    if (!this.enabled(Category._HOOK)) return;
    const event = parse("traceData.hookType")(options) || "internal",
      context =
        parse("traceData.context.state.name")(options) ||
        parse("traceData.context")(options) ||
        "unknown",
      name = functionToString(step.registeredHook.callback);

    this._logger.log(
      `${transLbl(trans)}:   Hook -> ${event} context: ${context}, ${maxLength(200, name)}`,
    );
  }

  /** @internal called by ng-router code */
  traceHookResult(hookResult: HookResult, trans: ng.Transition): void {
    if (!this.enabled(Category._HOOK)) return;
    this._logger.log(
      `${transLbl(trans)}:   <- Hook returned: ${maxLength(200, stringify(hookResult))}`,
    );
  }

  /** @internal called by ng-router code */
  traceResolvePath(
    path: PathNode[],
    when: PolicyWhen,
    trans: ng.Transition,
  ): void {
    if (!this.enabled(Category._RESOLVE)) return;
    this._logger.log(`${transLbl(trans)}:         Resolving ${path} (${when})`);
  }

  /** @internal called by ng-router code */
  traceResolvableResolved(resolvable: Resolvable, trans: ng.Transition): void {
    if (!this.enabled(Category._RESOLVE)) return;
    this._logger.log(
      `${transLbl(trans)}:               <- Resolved  ${resolvable} to: ${maxLength(200, stringify(resolvable.data))}`,
    );
  }

  /** @internal called by ng-router code */
  traceError(reason: unknown, trans: ng.Transition): void {
    if (!this.enabled(Category._TRANSITION)) return;
    this._logger.log(
      `${transLbl(trans)}: <- Rejected ${stringify(trans)}, reason: ${reason}`,
    );
  }

  /** @internal called by ng-router code */
  traceSuccess(finalState: StateObject, trans: ng.Transition): void {
    if (!this.enabled(Category._TRANSITION)) return;
    this._logger.log(
      `${transLbl(trans)}: <- Success  ${stringify(trans)}, final state: ${finalState.name}`,
    );
  }

  /** @internal called by ng-router code */
  traceUIViewEvent(
    event: string,
    viewData: ActiveUIView | null | undefined,
    extra = "",
  ): void {
    if (!this.enabled(Category._UIVIEW)) return;
    this._logger.log(
      `ng-view: ${padString(MAX_PAD_LENGTH, event)} ${ngViewString(viewData)}${extra}`,
    );
  }

  /** @internal called by ng-router code */
  traceUIViewConfigUpdated(
    viewData: ActiveUIView,
    context: ViewContext | undefined,
  ): void {
    if (!this.enabled(Category._UIVIEW)) return;
    this.traceUIViewEvent(
      "Updating",
      viewData,
      ` with ViewConfig from context='${context}'`,
    );
  }

  /** @internal called by ng-router code */
  traceUIViewFill(viewData: ActiveUIView, html: string): void {
    if (!this.enabled(Category._UIVIEW)) return;
    this.traceUIViewEvent("Fill", viewData, ` with: ${maxLength(200, html)}`);
  }

  /** @internal called by ng-router code */
  traceViewSync(pairs: ViewTuple[]): void {
    if (!this.enabled(Category._VIEWCONFIG)) return;
    const uivheader = "uiview component fqn";

    const cfgheader = "view config state (view name)";

    const mapping = pairs
      .map(({ ngView, viewConfig }) => {
        const uiv = ngView && ngView.fqn;

        const cfg =
          viewConfig &&
          `${viewConfig.viewDecl.$context?.name}: (${viewConfig.viewDecl.$name})`;

        return { [uivheader]: uiv, [cfgheader]: cfg };
      })
      .sort((a, b) => (a[uivheader] || "").localeCompare(b[uivheader] || ""));

    this._logger.table(mapping);
  }

  /** @internal called by ng-router code */
  traceViewServiceEvent(event: string, viewConfig: ViewConfig): void {
    if (!this.enabled(Category._VIEWCONFIG)) return;
    this._logger.log(`VIEWCONFIG: ${event} ${viewConfigString(viewConfig)}`);
  }

  /** @internal called by ng-router code */
  traceViewServiceUIViewEvent(event: string, viewData: ActiveUIView): void {
    if (!this.enabled(Category._VIEWCONFIG)) return;
    this._logger.log(`VIEWCONFIG: ${event} ${ngViewString(viewData)}`);
  }
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
export const trace = new Trace();
