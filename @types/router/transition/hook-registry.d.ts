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
export function matchState(
  state: import("../state/state-object.js").StateObject,
  criterion: import("./interface.ts").HookMatchCriterion,
  transition: ng.Transition,
): boolean;
/**
 * Return a registration function of the requested type.
 * @param {ng.TransitionProvider| import("./transition.js").Transition} hookSource
 * @param {ng.TransitionService} transitionService
 * @param {import("./transition-event-type.js").TransitionEventType} eventType
 * @returns {function(import("./interface.ts").HookMatchCriteria, import("./interface.ts").HookFn, {}=): (function(): void)|*}
 */
export function makeEvent(
  hookSource: ng.TransitionProvider | import("./transition.js").Transition,
  transitionService: ng.TransitionService,
  eventType: import("./transition-event-type.js").TransitionEventType,
): (
  arg0: import("./interface.ts").HookMatchCriteria,
  arg1: import("./interface.ts").HookFn,
  arg2: {} | undefined,
) => (() => void) | any;
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
    tranSvc: ng.TransitionService,
    eventType: import("./transition-event-type.js").TransitionEventType,
    callback: import("./interface.ts").HookFn,
    matchCriteria: import("./interface.ts").HookMatchCriteria,
    removeHookFromRegistry: (hook: RegisteredHook) => void,
    options?: import("./interface.ts").HookRegOptions,
  );
  tranSvc: import("./interface.ts").TransitionService;
  eventType: import("./transition-event-type.js").TransitionEventType;
  callback: import("./interface.ts").HookFn;
  matchCriteria: import("./interface.ts").HookMatchCriteria;
  removeHookFromRegistry: (hook: RegisteredHook) => void;
  invokeCount: number;
  _deregistered: boolean;
  priority: number;
  bind: unknown;
  invokeLimit: number;
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
  _matchingNodes(
    nodes: import("../resolve/resolve-context.js").PathNode[],
    criterion: import("./interface.ts").HookMatchCriterion,
    transition: ng.Transition,
  ): import("../resolve/resolve-context.js").PathNode[] | null;
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
  _getDefaultMatchCriteria(): import("./interface.ts").HookMatchCriteria;
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
  _getMatchingNodes(
    treeChanges: import("./interface.ts").TreeChanges,
    transition: ng.Transition,
  ): {};
  /**
   * Determines if this hook's [[matchCriteria]] match the given [[TreeChanges]]
   * @param {import("./interface.ts").TreeChanges} treeChanges
   * @param {ng.Transition} transition
   * @returns {import("./interface.ts").IMatchingNodes | null} an IMatchingNodes object, or null. If an IMatchingNodes object is returned,
   * its values are the matching [[PathNode]]s for each [[HookMatchCriterion]] (to, from, exiting, retained, entering)
   */
  matches(
    treeChanges: import("./interface.ts").TreeChanges,
    transition: ng.Transition,
  ): import("./interface.ts").IMatchingNodes | null;
  deregister(): void;
}
