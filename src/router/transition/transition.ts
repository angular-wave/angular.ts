import { trace } from "../common/trace.ts";
import { stringify } from "../../shared/strings.ts";
import {
  anyTrueR,
  arrayTuples,
  find,
  omit,
  unnestR,
  withResolvers,
} from "../../shared/common.ts";
import {
  assert,
  isNullOrUndefined,
  isObject,
  isUndefined,
} from "../../shared/utils.ts";
import { is, propEq, val } from "../../shared/hof.ts";
import { TransitionHook, TransitionHookPhase } from "./transition-hook.ts";
import { registerHook } from "./hook-registry.ts";
import type { RegisteredHook } from "./hook-registry.ts";
import { HookBuilder } from "./hook-builder.ts";
import { PathUtils } from "../path/path-utils.ts";
import type { PathNode } from "../path/path-node.ts";
import { Param } from "../params/param.ts";
import { Resolvable } from "../resolve/resolvable.ts";
import { ResolveContext } from "../resolve/resolve-context.ts";
import { Rejection } from "./reject-factory.ts";
import type { RouterProvider } from "../router.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookRegOptions,
} from "./interface.ts";
import type { StateDeclaration, StateOrName } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { TargetState } from "../state/target-state.ts";
import type { TransitionProvider } from "./transition-service.ts";
import type { ViewConfig } from "../state/views.ts";
import type { RawParams } from "../params/param.ts";
import type { RegisteredHooks } from "./hook-registry.ts";

export type { PathNode } from "../path/path-node.ts";

/**
 * The TransitionOptions object can be used to change the behavior of a transition.
 */
export interface TransitionOptions {
  location?: boolean | "replace";
  relative?: string | StateDeclaration | StateObject;
  inherit?: boolean;
  notify?: boolean;
  reload?: boolean | string | StateDeclaration | StateObject;
  custom?: unknown;
  supercede?: boolean;
  reloadState?: StateObject;
  redirectedFrom?: Transition;
  current?: () => Transition | null;
  source?: "sref" | "url" | "redirect" | "otherwise" | "unknown";
}

/**
 * TreeChanges encapsulates the path arrays involved in a transition.
 */
export interface TreeChanges {
  [key: string]: PathNode[] | undefined;
  from: PathNode[];
  to: PathNode[];
  retained: PathNode[];
  retainedWithToParams: PathNode[];
  exiting: PathNode[];
  entering: PathNode[];
}

const REDIRECT_MAX = 20;

/**
 * Represents a single router transition from one path of states to another.
 *
 * It owns hook execution, resolvable resolution, path/tree change metadata,
 * redirect handling, and the completion promise observed by router consumers.
 */
export class Transition {
  static diToken = Transition;

  _globals: RouterProvider;
  _transitionService: TransitionProvider;
  _deferred: import("../../shared/common.ts").PromiseResolvers<any>;
  promise: Promise<any>;
  _registeredHooks: RegisteredHooks;
  _hookBuilder: HookBuilder;
  isActive: () => boolean;
  _targetState: TargetState;
  _options: TransitionOptions;
  $id: number;
  _treeChanges: TreeChanges;
  success: boolean | undefined;
  _error: Rejection | undefined;
  _aborted: boolean | undefined;

  constructor(
    fromPath: PathNode[],
    targetState: TargetState,
    transitionService: TransitionProvider,
    globals: RouterProvider,
  ) {
    this._globals = globals;
    this._transitionService = transitionService;
    this._deferred = withResolvers();
    this.promise = this._deferred.promise;
    this._registeredHooks = {};
    this._hookBuilder = new HookBuilder(this);
    this.isActive = () => this._globals.transition === this;
    this._targetState = targetState;
    this.success = undefined;
    this._error = undefined;
    this._aborted = undefined;

    if (!targetState.valid()) {
      throw new Error(targetState.error());
    }

    this._options = Object.assign(
      { current: val(this) },
      targetState.options(),
    );
    this.$id = transitionService._transitionCount++;
    const toPath = PathUtils.buildToPath(fromPath, targetState) as PathNode[];
    this._treeChanges = PathUtils.treeChanges(
      fromPath,
      toPath,
      this._options.reloadState as any,
    ) as TreeChanges;

    const onCreateHooks = this._hookBuilder.buildHooksForPhase(
      TransitionHookPhase._CREATE,
    );

    TransitionHook.invokeHooks(onCreateHooks, () => Promise.resolve());
    this.applyViewConfigs();
  }

  /**
   * Returns hooks registered directly on this transition for the given event name.
   */
  getHooks(hookName: string): RegisteredHook[] {
    return this._registeredHooks[hookName] || [];
  }

  /**
   * Registers a hook on this transition instance.
   */
  on(
    eventName: string,
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    const eventType = this._getEventType(eventName);

    if (eventType.hookPhase === TransitionHookPhase._CREATE) {
      throw new Error("onCreate hooks can only be registered on the service");
    }

    return registerHook(
      this,
      this._transitionService,
      eventType,
      matchCriteria,
      callback,
      options,
    );
  }

  /**
   * Registers an `onBefore` hook on this transition.
   */
  onBefore(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onBefore", matchCriteria, callback, options);
  }

  /**
   * Registers an `onStart` hook on this transition.
   */
  onStart(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onStart", matchCriteria, callback, options);
  }

  /**
   * Registers an `onEnter` hook on this transition.
   */
  onEnter(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onEnter", matchCriteria, callback, options);
  }

  /**
   * Registers an `onRetain` hook on this transition.
   */
  onRetain(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onRetain", matchCriteria, callback, options);
  }

  /**
   * Registers an `onExit` hook on this transition.
   */
  onExit(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onExit", matchCriteria, callback, options);
  }

  /**
   * Registers an `onFinish` hook on this transition.
   */
  onFinish(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onFinish", matchCriteria, callback, options);
  }

  /**
   * Registers an `onSuccess` hook on this transition.
   */
  onSuccess(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onSuccess", matchCriteria, callback, options);
  }

  /**
   * Registers an `onError` hook on this transition.
   */
  onError(
    matchCriteria: HookMatchCriteria,
    callback: HookFn,
    options?: HookRegOptions,
  ): DeregisterFn {
    return this.on("onError", matchCriteria, callback, options);
  }

  _getEventType(eventName: string) {
    const eventType = this._transitionService
      ._getEvents()
      .find((type) => type.name === eventName);

    if (!eventType) {
      throw new Error(`Unknown Transition hook event: ${eventName}`);
    }

    return eventType;
  }

  /**
   * Applies the entering path's view configs before the transition runs.
   */
  applyViewConfigs(): void {
    const enteringStates = this._treeChanges.entering.map((node) => node.state);

    PathUtils.applyViewConfigs(
      this._transitionService.$view,
      this._treeChanges.to,
      enteringStates,
    );
  }

  /**
   * Returns the leaf `from` state object.
   */
  $from(): StateObject {
    return this._treeChanges.from[this._treeChanges.from.length - 1]!.state;
  }

  /**
   * Returns the leaf `to` state object.
   */
  $to(): StateObject {
    return this._treeChanges.to[this._treeChanges.to.length - 1]!.state;
  }

  /**
   * Returns the public `from` state declaration.
   */
  from(): StateDeclaration {
    return this.$from().self;
  }

  /**
   * Returns the public `to` state declaration.
   */
  to(): StateDeclaration {
    return this.$to().self;
  }

  /**
   * Returns the target state that seeded this transition.
   */
  targetState(): TargetState {
    return this._targetState;
  }

  /**
   * Returns parameter values for one transition path (`to` by default).
   */
  params(pathname: keyof TreeChanges | string = "to"): RawParams {
    return Object.freeze(
      (this._treeChanges[pathname] as PathNode[])
        .map((x) => x.paramValues)
        .reduce((acc, obj) => ({ ...acc, ...obj }), {} as RawParams),
    );
  }

  /**
   * Returns the resolve tokens visible on one transition path (`to` by default).
   */
  getResolveTokens(pathname: keyof TreeChanges | string = "to"): any[] {
    return new ResolveContext(
      this._treeChanges[pathname] as PathNode[],
    ).getTokens();
  }

  /**
   * Adds a new resolvable to the target path, optionally scoped to one state.
   */
  addResolvable(
    resolvable:
      | Resolvable
      | import("../resolve/resolvable.ts").ResolvableLiteral,
    state: StateOrName = "",
  ): void {
    const normalized = is(Resolvable)(resolvable)
      ? (resolvable as Resolvable)
      : new Resolvable(resolvable);
    const stateName = typeof state === "string" ? state : state.name;
    const topath = this._treeChanges.to;
    const targetNode = find(
      topath,
      (node: PathNode) => node.state.name === stateName,
    ) as PathNode | undefined;

    assert(!!targetNode, `targetNode not found ${stateName}`);
    const resolveContext = new ResolveContext(topath);

    resolveContext.addResolvables([normalized], targetNode!.state);
  }

  /**
   * Returns the transition that redirected to this transition, if any.
   */
  redirectedFrom(): Transition | null {
    return this._options.redirectedFrom || null;
  }

  /**
   * Returns the first transition in a redirect chain.
   */
  originalTransition(): Transition {
    const rf = this.redirectedFrom();

    return (rf && rf.originalTransition()) || this;
  }

  /**
   * Returns the transition options.
   */
  options(): TransitionOptions {
    return this._options;
  }

  /**
   * Returns declarations for states being entered.
   */
  entering(): StateDeclaration[] {
    return this._treeChanges.entering.map((x) => x.state.self);
  }

  /**
   * Returns declarations for states being exited.
   */
  exiting(): StateDeclaration[] {
    return this._treeChanges.exiting.map((x) => x.state.self).reverse();
  }

  /**
   * Returns declarations for states being retained.
   */
  retained(): StateDeclaration[] {
    return this._treeChanges.retained.map((x) => x.state.self);
  }

  /**
   * Returns view configs for the selected path, optionally filtered to one state.
   */
  views(
    pathname: keyof TreeChanges | string = "entering",
    state?: StateObject,
  ): ViewConfig[] {
    let path = this._treeChanges[pathname] as PathNode[];

    path = !state ? path : path.filter(propEq("state", state));

    return path.map((x) => x.views || []).reduce(unnestR, []);
  }

  /**
   * Returns either the full tree changes object or one named path within it.
   */
  treeChanges(pathname?: keyof TreeChanges | string): PathNode[] | TreeChanges {
    return pathname
      ? (this._treeChanges[pathname] as PathNode[])
      : this._treeChanges;
  }

  /**
   * Creates a redirected transition to a new target state.
   */
  redirect(targetState: TargetState): Transition {
    let redirects = 1;
    let trans: Transition = this;

    while (!isNullOrUndefined((trans = trans.redirectedFrom() as Transition))) {
      if (++redirects > REDIRECT_MAX) {
        throw new Error("Too many consecutive Transition redirects (20+)");
      }
    }

    const redirectOpts: TransitionOptions = {
      redirectedFrom: this,
      source: "redirect",
    };

    if (
      this.options().source === "url" &&
      targetState.options().location !== false
    ) {
      redirectOpts.location = "replace";
    }

    const newOptions = Object.assign(
      {},
      this.options(),
      targetState.options(),
      redirectOpts,
    );

    targetState = targetState.withOptions(newOptions, true);
    const newTransition = this._transitionService.create(
      this._treeChanges.from,
      targetState,
    );

    const originalEnteringNodes = this._treeChanges.entering;
    const redirectEnteringNodes = newTransition._treeChanges.entering;
    const nodeIsReloading =
      (reloadState?: StateObject) =>
      (node: PathNode): boolean =>
        !!(reloadState && node.state.includes[reloadState.name]);

    const params = PathUtils.matching(
      redirectEnteringNodes,
      originalEnteringNodes,
      PathUtils.nonDynamicParams,
    ) as PathNode[];

    const matchingEnteringNodes = params.filter(
      (x) => !nodeIsReloading(targetState.options().reloadState)(x),
    );

    matchingEnteringNodes.forEach((node, idx) => {
      node.resolvables = originalEnteringNodes[idx].resolvables;
    });

    return newTransition;
  }

  /**
   * Returns the changed non-dynamic and dynamic params for this transition,
   * or `undefined` when the transition structure changed in a larger way.
   */
  _changedParams(): Param[] | undefined {
    const tc = this._treeChanges;

    if (this._options.reload) return undefined;
    if (tc.exiting.length || tc.entering.length) return undefined;
    if (tc.to.length !== tc.from.length) return undefined;

    const pathsDiffer = arrayTuples(tc.to, tc.from)
      .map((tuple) => tuple[0].state !== tuple[1].state)
      .reduce(anyTrueR, false);

    if (pathsDiffer) return undefined;

    const nodeSchemas = tc.to.map((node) => node.paramSchema);
    const [toValues, fromValues] = [tc.to, tc.from].map((path) =>
      path.map((x) => x.paramValues),
    );
    const tuples = arrayTuples(nodeSchemas, toValues, fromValues);

    return tuples
      .map(([schema, toVals, fromVals]) =>
        Param.changed(schema, toVals, fromVals),
      )
      .reduce(unnestR, []);
  }

  dynamic(): boolean {
    const changes = this._changedParams();

    return !changes
      ? false
      : changes.map((x: Param) => x.dynamic).reduce(anyTrueR, false);
  }

  /**
   * Returns true when this transition would be ignored by the router.
   */
  ignored(): boolean {
    return !!this._ignoredReason();
  }

  _ignoredReason(): string | undefined {
    const pending = this._globals.transition;
    const { reloadState } = this._options;

    const same = (pathA: PathNode[], pathB: PathNode[]): boolean => {
      if (pathA.length !== pathB.length) return false;
      const matching = PathUtils.matching(pathA, pathB) as PathNode[];

      return (
        pathA.length ===
        matching.filter(
          (node) => !reloadState || !node.state.includes[reloadState.name],
        ).length
      );
    };

    const newTC = this._treeChanges;
    const pendTC = pending && pending._treeChanges;

    if (
      pendTC &&
      same(pendTC.to, newTC.to) &&
      same(pendTC.exiting, newTC.exiting)
    ) {
      return "SameAsPending";
    }

    if (
      newTC.exiting.length === 0 &&
      newTC.entering.length === 0 &&
      same(newTC.from, newTC.to)
    ) {
      return "SameAsCurrent";
    }

    return undefined;
  }

  run(): Promise<any> {
    const getHooksFor = (phase: number) =>
      this._hookBuilder.buildHooksForPhase(phase);

    const transitionSuccess = (): void => {
      trace.traceSuccess(this.$to(), this);
      this.success = true;
      this._deferred.resolve(this.to());
      const hooks = this._hookBuilder.buildHooksForPhase(
        TransitionHookPhase._SUCCESS,
      );

      hooks.forEach((hook) => hook.invokeHook());
    };

    const transitionError = (reason: Rejection): void => {
      trace.traceError(reason, this);
      this.success = false;
      this._deferred.reject(reason);
      this._error = reason;
      const hooks = getHooksFor(TransitionHookPhase._ERROR);

      hooks.forEach((hook) => hook.invokeHook());
    };

    const runTransition = (): Promise<any> => {
      const allRunHooks = getHooksFor(TransitionHookPhase._RUN);

      return TransitionHook.invokeHooks(allRunHooks, () => Promise.resolve());
    };

    const startTransition = (): Promise<void> => {
      const { _globals } = this;

      _globals._lastStartedTransitionId = this.$id;
      _globals.transition = this;
      _globals._transitionHistory.enqueue(this);
      trace.traceTransitionStart(this);

      return Promise.resolve();
    };

    const allBeforeHooks = getHooksFor(TransitionHookPhase._BEFORE);

    TransitionHook.invokeHooks(allBeforeHooks, startTransition)
      .then(runTransition)
      .then(transitionSuccess, transitionError);

    return this.promise;
  }

  /**
   * Returns true when the transition is valid or already completed.
   */
  valid(): boolean {
    return !this.error() || this.success !== undefined;
  }

  /**
   * Aborts the transition before completion.
   */
  abort(): void {
    if (isUndefined(this.success)) {
      this._aborted = true;
    }
  }

  /**
   * Returns the computed rejection, if any, that makes this transition invalid.
   */
  error(): Rejection | undefined {
    const state = this.$to();

    if (state.self.abstract) {
      return Rejection.invalid(
        `Cannot transition to abstract state '${state.name}'`,
      );
    }

    const paramDefs = state.parameters();
    const values = this.params();
    const invalidParams = paramDefs.filter(
      (param) => !param.validates(values[param.id]),
    );

    if (invalidParams.length) {
      const invalidValues = invalidParams
        .map((param) => `[${param.id}:${stringify(values[param.id])}]`)
        .join(", ");

      return Rejection.invalid(
        `The following parameter values are not valid for state '${state.name}': ${invalidValues}`,
      );
    }

    if (this.success === false) return this._error;

    return undefined;
  }

  toString(): string {
    const fromStateOrName = this.from();
    const toStateOrName = this.to();
    const avoidEmptyHash = (params: RawParams): RawParams =>
      params["#"] !== null && params["#"] !== undefined
        ? params
        : omit(params, ["#"]);

    const from = isObject(fromStateOrName)
      ? fromStateOrName.name
      : (fromStateOrName as any);
    const fromParams = stringify(
      avoidEmptyHash(
        this._treeChanges.from
          .map((x) => x.paramValues)
          .reduce((acc, obj) => ({ ...acc, ...obj }), {} as RawParams),
      ),
    );
    const toValid = this.valid() ? "" : "(X) ";
    const to = isObject(toStateOrName)
      ? toStateOrName.name
      : (toStateOrName as any);
    const toParams = stringify(avoidEmptyHash(this.params()));

    return `Transition#${this.$id}( '${from}'${fromParams} -> ${toValid}'${to}'${toParams} )`;
  }
}
