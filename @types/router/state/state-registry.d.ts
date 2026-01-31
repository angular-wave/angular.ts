/** @typedef {import("./state-object.js").StateObject} StateObject */
/** @typedef {import("./interface.ts").BuiltStateDeclaration} BuiltStateDeclaration */
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
  /** @type {import("./interface.ts").StateStore} */
  states: import("./interface.ts").StateStore;
  /**
   * @type {ng.UrlService}
   */
  urlService: ng.UrlService;
  /**
   * @type {import("../url/url-rules.js").UrlRules}
   */
  urlServiceRules: import("../url/url-rules.js").UrlRules;
  /**
   * @type {ng.InjectorService|undefined}
   */
  $injector: ng.InjectorService | undefined;
  /**
   * @type {import("./interface.ts").StateRegistryListener[]}
   */
  listeners: import("./interface.ts").StateRegistryListener[];
  /**
   *@type {StateMatcher}
   */
  matcher: StateMatcher;
  /**
   * @type {StateBuilder}
   */
  builder: StateBuilder;
  stateQueue: StateQueueManager;
  $get: (string | (($injector: any) => StateRegistryProvider))[];
  /**
   * This is a [[StateBuilder.builder]] function for angular1 `onEnter`, `onExit`,
   * `onRetain` callback hooks on a [[StateDeclaration]].
   *
   * @param {string} hookName
   */
  getStateHookBuilder(
    hookName: string,
  ): (
    stateObject: any & Record<string, any>,
  ) =>
    | ((trans: ng.Transition, state: ng.BuiltStateDeclaration) => any)
    | undefined;
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
   * @param {import("./interface.ts").StateRegistryListener} listener a callback function invoked when the registered states changes.
   *        The function receives two parameters, `event` and `state`.
   *        See [[StateRegistryListener]]
   * @return a function that deregisters the listener
   */
  onStatesChanged(
    listener: import("./interface.ts").StateRegistryListener,
  ): () => void;
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
   * @param {import("./interface.ts")._StateDeclaration} stateDefinition the definition of the state to register.
   * @returns the internal [[StateObject]] object.
   *          If the state was successfully registered, then the object is fully built (See: [[StateBuilder]]).
   *          If the state was only queued, then the object is not fully built.
   */
  register(
    stateDefinition: import("./interface.ts")._StateDeclaration,
  ): import("./state-object.js").StateObject;
  /**
   *
   * @param {BuiltStateDeclaration} state
   * @returns {BuiltStateDeclaration[]}
   */
  _deregisterTree(state: BuiltStateDeclaration): BuiltStateDeclaration[];
  /**
   * Removes a state from the registry
   *
   * This removes a state from the registry.
   * If the state has children, they are are also removed from the registry.
   *
   * @param {import("./interface.ts").StateOrName} stateOrName the state's name or object representation
   * @returns {BuiltStateDeclaration[]} a list of removed states
   */
  deregister(
    stateOrName: import("./interface.ts").StateOrName,
  ): BuiltStateDeclaration[];
  /**
   * @return {ng.BuiltStateDeclaration[]}
   */
  getAll(): ng.BuiltStateDeclaration[];
  /**
   *
   * @param {import("./interface.ts").StateOrName} stateOrName
   * @param {import("./interface.ts").StateOrName} [base]
   * @returns {import("./state-service.js").StateDeclaration | import("./state-service.js").StateDeclaration[] | null}
   */
  get(
    stateOrName: import("./interface.ts").StateOrName,
    base?: import("./interface.ts").StateOrName,
    ...args: any[]
  ):
    | import("./state-service.js").StateDeclaration
    | import("./state-service.js").StateDeclaration[]
    | null;
  /**
   * Registers a [[BuilderFunction]] for a specific [[StateObject]] property (e.g., `parent`, `url`, or `path`).
   * More than one BuilderFunction can be registered for a given property.
   *
   * The BuilderFunction(s) will be used to define the property on any subsequently built [[StateObject]] objects.
   *
   * @param {string} property The name of the State property being registered for.
   * @param {import("./interface.ts").BuilderFunction} builderFunction The BuilderFunction which will be used to build the State property
   * @returns a function which deregisters the BuilderFunction
   */
  decorator(
    property: string,
    builderFunction: import("./interface.ts").BuilderFunction,
  ):
    | import("./interface.ts").BuilderFunction
    | import("./interface.ts").BuilderFunction[];
}
export function getLocals(ctx: ResolveContext): {
  [x: string]: any;
};
export type StateObject = import("./state-object.js").StateObject;
export type BuiltStateDeclaration =
  import("./interface.ts").BuiltStateDeclaration;
/**
 * }
 */
export type ServiceProvider = import("../../interface.ts").ServiceProvider;
import { StateMatcher } from "./state-matcher.js";
import { StateBuilder } from "./state-builder.js";
import { StateQueueManager } from "./state-queue-manager.js";
import { ResolveContext } from "../resolve/resolve-context.js";
