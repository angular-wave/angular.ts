/**
 * Encapsulate the target (destination) state/params/options of a [[Transition]].
 *
 * This class is frequently used to redirect a transition to a new destination.
 *
 * See:
 *
 * - [[HookResult]]
 * - [[TransitionHookFn]]
 * - [[TransitionService.onStart]]
 *
 * To create a `TargetState`, use [[StateService.target]].
 *
 * ---
 *
 * This class wraps:
 *
 * 1) an identifier for a state
 * 2) a set of parameters
 * 3) and transition options
 * 4) the registered state object (the [[StateDeclaration]])
 *
 * Many ng-router APIs such as [[StateService.go]] take a [[StateOrName]] argument which can
 * either be a *state object* (a [[StateDeclaration]] or [[StateObject]]) or a *state name* (a string).
 * The `TargetState` class normalizes those options.
 *
 * A `TargetState` may be valid (the state being targeted exists in the registry)
 * or invalid (the state being targeted is not registered).
 */
export class TargetState {
  /**
   * The TargetState constructor
   *
   * Note: Do not construct a `TargetState` manually.
   * To create a `TargetState`, use the [[StateService.target]] factory method.
   *
   * @param {import("./state-service.js").StateRegistryProvider} _stateRegistry The StateRegistry to use to look up the _definition
   * @param {import("./interface.ts").StateOrName} _identifier An identifier for a state.
   *    Either a fully-qualified state name, or the object used to define the state.
   * @param {import("../params/interface.ts").RawParams} _params Parameters for the target state
   * @param {import("../transition/interface.ts").TransitionOptions} _options Transition options.
   *
   * @internal
   */
  constructor(
    _stateRegistry: import("./state-service.js").StateRegistryProvider,
    _identifier: import("./interface.ts").StateOrName,
    _params: import("../params/interface.ts").RawParams,
    _options: import("../transition/interface.ts").TransitionOptions,
  );
  _stateRegistry: import("./state-registry.js").StateRegistryProvider;
  _identifier: import("./interface.ts").StateOrName;
  _params: import("../params/interface.ts").RawParams;
  _options: import("../transition/interface.ts").TransitionOptions;
  _definition: import("./state-object.js").StateObject;
  /** The name of the state this object targets */
  name(): import("./interface.ts").StateOrName;
  /** The identifier used when creating this TargetState */
  identifier(): import("./interface.ts").StateOrName;
  /** The target parameter values */
  params(): import("../params/interface.ts").RawParams;
  /** The internal state object (if it was found) */
  $state(): import("./state-object.js").StateObject;
  /** The internal state declaration (if it was found) */
  state(): import("./interface.ts").StateDeclaration;
  /** The target options */
  options(): import("../transition/interface.ts").TransitionOptions;
  /** True if the target state was found */
  exists(): boolean;
  /** True if the object is valid */
  valid(): boolean;
  /** If the object is invalid, returns the reason why */
  error(): string;
  toString(): string;
  /**
   * Returns a copy of this TargetState which targets a different state.
   * The new TargetState has the same parameter values and transition options.
   *
   * @param {import("./interface.ts").StateOrName} state The new state that should be targeted
   * @returns {TargetState} A new TargetState instance which targets the desired state
   */
  withState(state: import("./interface.ts").StateOrName): TargetState;
  /**
   * Returns a copy of this TargetState, using the specified parameter values.
   *
   * @param {import("../params/interface.ts").RawParams} params the new parameter values to use
   * @param {boolean} replace When false (default) the new parameter values will be merged with the current values.
   *                When true the parameter values will be used instead of the current values.
   * @returns {TargetState} A new TargetState instance which targets the same state with the desired parameters
   */
  withParams(
    params: import("../params/interface.ts").RawParams,
    replace?: boolean,
  ): TargetState;
  /**
   * Returns a copy of this TargetState, using the specified Transition Options.
   *
   * @param {import("../transition/interface.ts").TransitionOptions} options the new options to use
   * @param {boolean} replace When false (default) the new options will be merged with the current options.
   *                When true the options will be used instead of the current options.
   * @returns {TargetState} A new TargetState instance which targets the same state with the desired options
   */
  withOptions(
    options: import("../transition/interface.ts").TransitionOptions,
    replace?: boolean,
  ): TargetState;
}
export namespace TargetState {
  /** Returns true if the object has a state property that might be a state or state name */
  function isDef(obj: any): boolean;
}
