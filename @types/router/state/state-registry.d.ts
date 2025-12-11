/** @typedef {import('../../interface.ts').ServiceProvider} ServiceProvider } */
/**
 * A registry for all of the application's [[StateDeclaration]]s
 *
 * This API is found at `$stateRegistry` ([[UIRouter.stateRegistry]])
 *
 */
export class StateRegistryProvider {
  static $inject: string[];
  /**
   * @param {ng.UrlService} urlService
   * @param {ng.StateService} stateService
   * @param {ng.RouterService} globals
   * @param {ng.ViewService} viewService
   */
  constructor(
    urlService: ng.UrlService,
    stateService: ng.StateService,
    globals: ng.RouterService,
    viewService: ng.ViewService,
  );
  /** @type {Record<string, import("./state-object.js").StateObject>} */
  states: Record<string, import("./state-object.js").StateObject>;
  urlService: import("../url/url-service.js").UrlService;
  urlServiceRules: import("../url/url-rules.js").UrlRules;
  $injector: any;
  listeners: any[];
  matcher: StateMatcher;
  builder: StateBuilder;
  stateQueue: StateQueueManager;
  $get: (string | (($injector: any) => StateRegistryProvider))[];
  /**
   * This is a [[StateBuilder.builder]] function for angular1 `onEnter`, `onExit`,
   * `onRetain` callback hooks on a [[StateDeclaration]].
   *
   * When the [[StateBuilder]] builds a [[StateObject]] object from a raw [[StateDeclaration]], this builder
   * ensures that those hooks are injectable for @uirouter/angularjs (ng1).
   *
   * @internalapi
   */
  getStateHookBuilder(
    hookName: any,
  ): (stateObject: any) => (trans: any, state: any) => any;
  /**
   * @private
   */
  private registerRoot;
  _root: import("./state-object.js").StateObject;
  /**
   * Listen for a State Registry events
   *
   * Adds a callback that is invoked when states are registered or deregistered with the StateRegistry.
   *
   * #### Example:
   * ```js
   * let allStates = registry.get();
   *
   * // Later, invoke deregisterFn() to remove the listener
   * let deregisterFn = registry.onStatesChanged((event, states) => {
   *   switch(event) {
   *     case: 'registered':
   *       states.forEach(state => allStates.push(state));
   *       break;
   *     case: 'deregistered':
   *       states.forEach(state => {
   *         let idx = allStates.indexOf(state);
   *         if (idx !== -1) allStates.splice(idx, 1);
   *       });
   *       break;
   *   }
   * });
   * ```
   *
   * @param listener a callback function invoked when the registered states changes.
   *        The function receives two parameters, `event` and `state`.
   *        See [[StateRegistryListener]]
   * @return a function that deregisters the listener
   */
  onStatesChanged(listener: any): any;
  /**
   * Gets the implicit root state
   *
   * Gets the root of the state tree.
   * The root state is implicitly created by ng-router.
   * Note: this returns the internal [[StateObject]] representation, not a [[StateDeclaration]]
   *
   * @return the root [[StateObject]]
   */
  root(): import("./state-object.js").StateObject;
  /**
   * Adds a state to the registry
   *
   * Registers a [[StateDeclaration]] or queues it for registration.
   *
   * Note: a state will be queued if the state's parent isn't yet registered.
   *
   * @param stateDefinition the definition of the state to register.
   * @returns the internal [[StateObject]] object.
   *          If the state was successfully registered, then the object is fully built (See: [[StateBuilder]]).
   *          If the state was only queued, then the object is not fully built.
   */
  register(stateDefinition: any): import("./state-object.js").StateObject;
  _deregisterTree(state: any): any[];
  /**
   * Removes a state from the registry
   *
   * This removes a state from the registry.
   * If the state has children, they are are also removed from the registry.
   *
   * @param stateOrName the state's name or object representation
   * @returns {import('./state-object').StateObject[]} a list of removed states
   */
  deregister(stateOrName: any): any[];
  /**
   * @return {ng.StateDeclaration[]}
   */
  getAll(): ng.StateDeclaration[];
  get(stateOrName: any, base: any, ...args: any[]): any;
  /**
   * Registers a [[BuilderFunction]] for a specific [[StateObject]] property (e.g., `parent`, `url`, or `path`).
   * More than one BuilderFunction can be registered for a given property.
   *
   * The BuilderFunction(s) will be used to define the property on any subsequently built [[StateObject]] objects.
   *
   * @param property The name of the State property being registered for.
   * @param builderFunction The BuilderFunction which will be used to build the State property
   * @returns a function which deregisters the BuilderFunction
   */
  decorator(property: any, builderFunction: any): any;
}
export function getLocals(ctx: any): any;
/**
 * }
 */
export type ServiceProvider = import("../../interface.ts").ServiceProvider;
import { StateMatcher } from "./state-matcher.js";
import { StateBuilder } from "./state-builder.js";
import { StateQueueManager } from "./state-queue-manager.js";
