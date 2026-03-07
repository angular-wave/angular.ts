import type { RawParams } from "../params/interface.ts";
import type { TransitionOptions } from "../transition/interface.ts";
import type {
  StateDeclaration,
  StateOrName,
  TargetStateDef,
} from "./interface.ts";
import type { StateRegistryProvider } from "./state-registry.ts";
import type { StateObject } from "./state-object.ts";
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
export declare class TargetState {
  static isDef(obj: any): obj is TargetStateDef;
  _stateRegistry: StateRegistryProvider;
  _identifier: StateOrName;
  _params: RawParams;
  _options: TransitionOptions;
  _definition: StateObject | undefined;
  /** The name of the state this object targets */
  name(): StateOrName;
  /** The identifier used when creating this TargetState */
  identifier(): StateOrName;
  /** The target parameter values */
  params(): RawParams;
  /** The internal state object (if it was found) */
  $state(): StateObject | undefined;
  /** The internal state declaration (if it was found) */
  state(): StateDeclaration | undefined;
  /** The target options */
  options(): TransitionOptions;
  /** True if the target state was found */
  exists(): boolean;
  /** True if the object is valid */
  valid(): boolean;
  /** If the object is invalid, returns the reason why */
  error(): string | undefined;
  toString(): string;
  /**
   * Returns a copy of this TargetState which targets a different state.
   * The new TargetState has the same parameter values and transition options.
   *
   * @param {import("./interface.ts").StateOrName} state The new state that should be targeted
   * @returns {TargetState} A new TargetState instance which targets the desired state
   */
  withState(state: StateOrName): TargetState;
  /**
   * Returns a copy of this TargetState, using the specified parameter values.
   *
   * @param {import("../params/interface.ts").RawParams} params the new parameter values to use
   * @param {boolean} replace When false (default) the new parameter values will be merged with the current values.
   *                When true the parameter values will be used instead of the current values.
   * @returns {TargetState} A new TargetState instance which targets the same state with the desired parameters
   */
  withParams(params: RawParams, replace?: boolean): TargetState;
  /**
   * Returns a copy of this TargetState, using the specified Transition Options.
   *
   * @param {import("../transition/interface.ts").TransitionOptions} options the new options to use
   * @param {boolean} replace When false (default) the new options will be merged with the current options.
   *                When true the options will be used instead of the current options.
   * @returns {TargetState} A new TargetState instance which targets the same state with the desired options
   */
  withOptions(options: TransitionOptions, replace?: boolean): TargetState;
}
