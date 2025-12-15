/**
 * Determines if the given state matches the matchCriteria
 *
 * @internal
 *
 * @param state a State Object to test against
 * @param criterion
 * - If a string, matchState uses the string as a glob-matcher against the state name
 * - If an array (of strings), matchState uses each string in the array as a glob-matchers against the state name
 *   and returns a positive match if any of the globs match.
 * - If a function, matchState calls the function with the state and returns true if the function's result is truthy.
 * @returns {boolean}
 */
export function matchState(
  state: any,
  criterion: any,
  transition: any,
): boolean;
/**
 * Return a registration function of the requested type.
 * @param {ng.TransitionProvider| import("./transition.js").Transition} hookSource
 * @param {ng.TransitionProvider} transitionService
 * @param {import("./transition-event-type.js").TransitionEventType} eventType
 * @returns {( matchObject: any, callback: Function, options?: Record<string, any> ) => () => void }
 */
export function makeEvent(
  hookSource: ng.TransitionProvider | import("./transition.js").Transition,
  transitionService: ng.TransitionProvider,
  eventType: import("./transition-event-type.js").TransitionEventType,
): (
  matchObject: any,
  callback: Function,
  options?: Record<string, any>,
) => () => void;
/**
 * The registration data for a registered transition hook
 */
export class RegisteredHook {
  /**
   * @param {import("./transition-service.js").TransitionProvider} tranSvc
   * @param eventType
   * @param callback
   * @param matchCriteria
   * @param removeHookFromRegistry
   * @param options
   */
  constructor(
    tranSvc: import("./transition-service.js").TransitionProvider,
    eventType: any,
    callback: any,
    matchCriteria: any,
    removeHookFromRegistry: any,
    options?: {},
  );
  /** @type {import("./transition-service.js").TransitionProvider} */
  tranSvc: import("./transition-service.js").TransitionProvider;
  eventType: any;
  callback: any;
  matchCriteria: any;
  removeHookFromRegistry: any;
  invokeCount: number;
  _deregistered: boolean;
  priority: any;
  bind: any;
  invokeLimit: any;
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
   */
  _matchingNodes(nodes: any, criterion: any, transition: any): any;
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
   */
  _getDefaultMatchCriteria(): any;
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
   */
  _getMatchingNodes(treeChanges: any, transition: any): any;
  /**
   * Determines if this hook's [[matchCriteria]] match the given [[TreeChanges]]
   *
   * @returns an IMatchingNodes object, or null. If an IMatchingNodes object is returned, its values
   * are the matching [[PathNode]]s for each [[HookMatchCriterion]] (to, from, exiting, retained, entering)
   */
  matches(treeChanges: any, transition: any): any;
  deregister(): void;
}
