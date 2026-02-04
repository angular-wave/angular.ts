import { map, removeFrom, tail } from "../../shared/common.js";
import { isFunction, isString } from "../../shared/utils.js";
import { Glob } from "../glob/glob.js";
import { TransitionHookScope } from "./transition-hook.js";

/**
 * Determines if the given state matches the matchCriteria
 * @internal
 * @param {import("../state/state-object.js").StateObject} state a State Object to test against
 * @param {import("./interface.ts").HookMatchCriterion} criterion - If a string, matchState uses the string as a glob-matcher against the state name
- If an array (of strings), matchState uses each string in the array as a glob-matchers against the state name
  and returns a positive match if any of the globs match.
- If a function, matchState calls the function with the state and returns true if the function's result is truthy.
 * @param {ng.Transition} transition
 * @returns {boolean}
 */
export function matchState(state, criterion, transition) {
  const toMatch = isString(criterion) ? [criterion] : criterion;

  /**
   * @param {ng.BuiltStateDeclaration} _state
   */
  function matchGlobs(_state) {
    const globStrings = /** @type {string[]}*/ (toMatch);

    for (let i = 0; i < globStrings.length; i++) {
      const glob = new Glob(globStrings[i]);

      if (
        (glob && glob.matches(_state.name)) ||
        (!glob && globStrings[i] === _state.name)
      ) {
        return true;
      }
    }

    return false;
  }
  const matchFn = /** @type {any} */ (
    isFunction(toMatch) ? toMatch : matchGlobs
  );

  return !!matchFn(state, transition);
}
/**
 * The registration data for a registered transition hook
 */
export class RegisteredHook {
  /**
   * @param {ng.TransitionService} tranSvc
   * @param {import("./transition-event-type.js").TransitionEventType} eventType
   * @param {import("./interface.ts").HookFn} callback
   * @param {import("./interface.ts").HookMatchCriteria} matchCriteria
   * @param {(hook: RegisteredHook) => void} removeHookFromRegistry
   * @param {import("./interface.ts").HookRegOptions} options
   */
  constructor(
    tranSvc,
    eventType,
    callback,
    matchCriteria,
    removeHookFromRegistry,
    options = {},
  ) {
    this.tranSvc = tranSvc;
    this.eventType = eventType;
    this.callback = callback;
    this.matchCriteria = matchCriteria;
    this.removeHookFromRegistry = removeHookFromRegistry;
    this.invokeCount = 0;
    this._deregistered = false;
    this.priority = options.priority || 0;
    this.bind = options.bind || null;
    this.invokeLimit = options.invokeLimit;
  }

  /**
   * Gets the matching [[PathNode]]s
   *
   * Given an array of [[PathNode]]s, and a [[HookMatchCriterion]], returns an array containing
   * the [[PathNode]]s that the criteria matches, or `null` if there were no matching nodes.
   *
   * Returning `null` is significant to distinguish between the default
   * "match-all criterion value" of `true` compared to a `() => true` function,
   * when the nodes is an empty array.
   *
   * This is useful to allow a transition match criteria of `entering: true`
   * to still match a transition, even when `entering === []`.  Contrast that
   * with `entering: (state) => true` which only matches when a state is actually
   * being entered.
   * @param {import("../resolve/resolve-context.js").PathNode[]} nodes
   * @param {import("./interface.ts").HookMatchCriterion} criterion
   * @param {ng.Transition} transition
   * @return {import("../resolve/resolve-context.js").PathNode[] | null}
   */
  _matchingNodes(nodes, criterion, transition) {
    if (criterion === true) return nodes;
    const matching = nodes.filter((node) =>
      matchState(node.state, criterion, transition),
    );

    return matching.length ? matching : null;
  }

  /**
   * Gets the default match criteria (all `true`)
   *
   * Returns an object which has all the criteria match paths as keys and `true` as values, i.e.:
   *
   * ```js
   * {
   *   to: true,
   *   from: true,
   *   entering: true,
   *   exiting: true,
   *   retained: true,
   * }
   * @returns {import("./interface.ts").HookMatchCriteria}
   */
  _getDefaultMatchCriteria() {
    return /** @type {import("./interface.ts").HookMatchCriteria} */ (
      map(this.tranSvc._getPathTypes(), () => true)
    );
  }

  /**
   * Gets matching nodes as [[IMatchingNodes]]
   *
   * Create a IMatchingNodes object from the TransitionHookTypes that is roughly equivalent to:
   *
   * ```js
   * let matches: IMatchingNodes = {
   *   to:       _matchingNodes([tail(treeChanges.to)],   mc.to),
   *   from:     _matchingNodes([tail(treeChanges.from)], mc.from),
   *   exiting:  _matchingNodes(treeChanges.exiting,      mc.exiting),
   *   retained: _matchingNodes(treeChanges.retained,     mc.retained),
   *   entering: _matchingNodes(treeChanges.entering,     mc.entering),
   * };
   * ```
   * @param {import("./interface.ts").TreeChanges} treeChanges
   * @param {ng.Transition} transition
   * @returns {{}}
   */
  _getMatchingNodes(treeChanges, transition) {
    const criteria = Object.assign(
      this._getDefaultMatchCriteria(),
      this.matchCriteria,
    );

    const paths = Object.values(this.tranSvc._getPathTypes());

    return paths.reduce((mn, pathtype) => {
      // STATE scope criteria matches against every node in the path.
      // TRANSITION scope criteria matches against only the last node in the path
      const isStateHook = pathtype.scope === TransitionHookScope._STATE;

      const path = treeChanges[pathtype.name] || [];

      const nodes = isStateHook ? path : [tail(path)];

      /** @type {Record<string, any>} */ (mn)[pathtype.name] =
        this._matchingNodes(
          nodes,
          /** @type {import("./interface.ts").HookMatchCriterion} */ (
            criteria[pathtype.name]
          ),
          transition,
        );

      return mn;
    }, {});
  }

  /**
   * Determines if this hook's [[matchCriteria]] match the given [[TreeChanges]]
   * @param {import("./interface.ts").TreeChanges} treeChanges
   * @param {ng.Transition} transition
   * @returns {import("./interface.ts").IMatchingNodes | null} an IMatchingNodes object, or null. If an IMatchingNodes object is returned,
   * its values are the matching [[PathNode]]s for each [[HookMatchCriterion]] (to, from, exiting, retained, entering)
   */
  matches(treeChanges, transition) {
    const matches = this._getMatchingNodes(treeChanges, transition);

    // Check if all the criteria matched the TreeChanges object
    const allMatched = Object.values(matches).every((x) => x);

    return allMatched
      ? /** @type {import("./interface.ts").IMatchingNodes } */ (matches)
      : null;
  }

  deregister() {
    this.removeHookFromRegistry(this);
    this._deregistered = true;
  }
}
/**
 * Register a transition hook without mutating the hookSource surface.
 * @param {ng.TransitionProvider| import("./transition.js").Transition} hookSource
 * @param {ng.TransitionProvider} transitionService
 * @param {import("./transition-event-type.js").TransitionEventType} eventType
 * @param {import("./interface.ts").HookMatchCriteria} matchCriteria
 * @param {import("./interface.ts").HookFn} callback
 * @param {import("./interface.ts").HookRegOptions} options
 * @returns {import("./interface.ts").DeregisterFn}
 */
export function registerHook(
  hookSource,
  transitionService,
  eventType,
  matchCriteria,
  callback,
  options = {},
) {
  // Create the object which holds the registered transition hooks.
  /** @type {{ [x: string]: RegisteredHook[] } & Record<string, any>} */
  const _registeredHooks = (hookSource._registeredHooks =
    hookSource._registeredHooks || {});

  const hooks = (_registeredHooks[eventType.name] =
    _registeredHooks[eventType.name] || []);

  const removeHookFn = (/** @type {RegisteredHook} */ hook) =>
    removeFrom(hooks, hook);

  const registeredHook = new RegisteredHook(
    transitionService,
    eventType,
    callback,
    matchCriteria,
    removeHookFn,
    options,
  );

  hooks.push(registeredHook);

  return registeredHook.deregister.bind(registeredHook);
}
/**
 * Return a registration function of the requested type.
 * @param {ng.TransitionProvider| import("./transition.js").Transition} hookSource
 * @param {ng.TransitionService} transitionService
 * @param {import("./transition-event-type.js").TransitionEventType} eventType
 * @returns {function(import("./interface.ts").HookMatchCriteria, import("./interface.ts").HookFn, {}=): (function(): void)|*}
 */
export function makeEvent(hookSource, transitionService, eventType) {
  // Create the object which holds the registered transition hooks.
  /** @type {{ [x: string]: RegisteredHook[] } & Record<string, any>} */
  const _registeredHooks = (hookSource._registeredHooks =
    hookSource._registeredHooks || {});

  /**
   * @type {any[]}
   */
  const hooks = (_registeredHooks[eventType.name] = []);

  const removeHookFn = (/** @type {any} */ x) => removeFrom(hooks, x);

  // Create hook registration function on the HookRegistry for the event
  /** @type Record<string, any> */ (hookSource)[eventType.name] =
    hookRegistrationFn;

  /**
   * @param {import("./interface.ts").HookMatchCriteria} matchObject
   * @param {import("./interface.ts").HookFn} callback
   */
  function hookRegistrationFn(matchObject, callback, options = {}) {
    const registeredHook = new RegisteredHook(
      transitionService,
      eventType,
      callback,
      matchObject,
      removeHookFn,
      options,
    );

    hooks.push(registeredHook);

    return registeredHook.deregister.bind(registeredHook);
  }

  return hookRegistrationFn;
}
