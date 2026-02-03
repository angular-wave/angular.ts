import { find, tail, uniqR, unnestR } from "../../shared/common.js";
import { propEq } from "../../shared/hof.js";
import { trace } from "../common/trace.js";
import { Resolvable } from "./resolvable.js";
import { PathUtils } from "../path/path-utils.js";
import { stringify } from "../../shared/strings.js";
import { isUndefined } from "../../shared/utils.js";

/** @typedef {import("../path/path-node.js").PathNode} PathNode */

export const resolvePolicies = {
  when: {
    LAZY: "LAZY",
    EAGER: "EAGER",
  },
  async: {
    WAIT: "WAIT",
    NOWAIT: "NOWAIT",
  },
};

const ALL_WHENS = [resolvePolicies.when.EAGER, resolvePolicies.when.LAZY];

const EAGER_WHENS = [resolvePolicies.when.EAGER];

/**
 * Encapsulates Dependency Injection for a path of nodes
 *
 * ng-router states are organized as a tree.
 * A nested state has a path of ancestors to the root of the tree.
 * When a state is being activated, each element in the path is wrapped as a [[PathNode]].
 * A `PathNode` is a stateful object that holds things like parameters and resolvables for the state being activated.
 *
 * The ResolveContext closes over the [[PathNode]]s, and provides DI for the last node in the path.
 */
export class ResolveContext {
  /**
   * @param {import("../resolve/resolve-context.js").PathNode[]} _path
   */
  constructor(_path) {
    this._path = _path;
  }

  /** Gets all the tokens found in the resolve context, de-duplicated */
  getTokens() {
    return this._path
      .reduce(
        (acc, node) =>
          acc.concat(
            node.resolvables.map(
              (/** @type {Resolvable} */ resolve) => resolve.token,
            ),
          ),
        [],
      )
      .reduce(uniqR, []);
  }

  /**
   * Gets the Resolvable that matches the token
   *
   * Gets the last Resolvable that matches the token in this context, or undefined.
   * Throws an error if it doesn't exist in the ResolveContext
   * @param {string} token
   * @return {Resolvable}
   */
  getResolvable(token) {
    const matching = this._path
      .map((node) => node.resolvables)
      .reduce(unnestR, [])
      .filter((/** @type {Resolvable} */ resolve) => resolve.token === token);

    return /** @type {Resolvable} */ (tail(matching));
  }

  /**
   * Returns the [[ResolvePolicy]] for the given [[Resolvable]]
   * @param {Resolvable} resolvable
   * @return {import("./interface.ts").ResolvePolicy}
   */
  getPolicy(resolvable) {
    const node = this.findNode(resolvable);

    return resolvable.getPolicy(node);
  }

  /**
     * Returns a ResolveContext that includes a portion of this one
     *
     * Given a state, this method creates a new ResolveContext from this one.
     * The new context starts at the first node (root) and stops at the node for the `state` parameter.
     *
     * #### Why
     *
     * When a transition is created, the nodes in the "To Path" are injected from a ResolveContext.
     * A ResolveContext closes over a path of [[PathNode]]s and processes the resolvables.
     * The "To State" can inject values from its own resolvables, as well as those from all its ancestor state's (node's).
     * This method is used to create a narrower context when injecting ancestor nodes.
     * @example `let ABCD = new ResolveContext([A, B, C, D]);`

    Given a path `[A, B, C, D]`, where `A`, `B`, `C` and `D` are nodes for states `a`, `b`, `c`, `d`:
    When injecting `D`, `D` should have access to all resolvables from `A`, `B`, `C`, `D`.
    However, `B` should only be able to access resolvables from `A`, `B`.

    When resolving for the `B` node, first take the full "To Path" Context `[A,B,C,D]` and limit to the subpath `[A,B]`.
    `let AB = ABCD.subcontext(a)`
     * @param {ng.BuiltStateDeclaration} state
     */
  subContext(state) {
    return new ResolveContext(
      /** @type {PathNode[]} */ (
        PathUtils.subPath(
          /** @type {PathNode[]} */ (this._path),
          (node) => /** @type {PathNode} */ (node).state === state,
        )
      ),
    );
  }

  /**
   * Adds Resolvables to the node that matches the state
   *
   * This adds a [[Resolvable]] (generally one created on the fly; not declared on a [[StateDeclaration.resolve]] block).
   * The resolvable is added to the node matching the `state` parameter.
   *
   * These new resolvables are not automatically fetched.
   * The calling code should either fetch them, fetch something that depends on them,
   * or rely on [[resolvePath]] being called when some state is being entered.
   *
   * Note: each resolvable's [[ResolvePolicy]] is merged with the state's policy, and the global default.
   *
   * @param {Resolvable[] | import("./interface.ts").ResolvableLiteral[]} newResolvables the new Resolvables
   * @param {ng.StateObject} state Used to find the node to put the resolvable on
   */
  addResolvables(newResolvables, state) {
    /** @type {import('../path/path-node').PathNode} */
    const node = find(this._path, propEq("state", state));

    const keys = newResolvables.map((resolve) => resolve.token);

    node.resolvables = node.resolvables
      .filter(
        (/** @type {Resolvable} */ resolve) =>
          keys.indexOf(resolve.token) === -1,
      )
      .concat(newResolvables);
  }

  /**
   * Returns a promise for an array of resolved path Element promises
   *
   * @param {import("./interface.ts").PolicyWhen} when
   * @param {ng.Transition} trans
   * @returns {Promise<any>|any}
   */
  resolvePath(when = "LAZY", trans) {
    // This option determines which 'when' policy Resolvables we are about to fetch.
    const whenOption = ALL_WHENS.includes(when) ? when : "LAZY";

    // If the caller specified EAGER, only the EAGER Resolvables are fetched.
    // if the caller specified LAZY, both EAGER and LAZY Resolvables are fetched.`
    const matchedWhens =
      whenOption === resolvePolicies.when.EAGER ? EAGER_WHENS : ALL_WHENS;

    // get the subpath to the state argument, if provided
    trace.traceResolvePath(this._path, when, trans);
    const matchesPolicy =
      (
        /** @type {string | any[]} */ acceptedVals,
        /** @type {string} */ whenOrAsync,
      ) =>
      (/** @type {Resolvable} */ resolvable) =>
        acceptedVals.includes(
          /** @type {Record<string, any>} */ (this.getPolicy(resolvable))[
            whenOrAsync
          ],
        );

    // Trigger all the (matching) Resolvables in the path
    // Reduce all the "WAIT" Resolvables into an array
    /**
     * @type {any[]}
     */
    const promises = this._path.reduce((acc, node) => {
      const nodeResolvables = node.resolvables.filter(
        matchesPolicy(matchedWhens, "when"),
      );

      const nowait = nodeResolvables.filter(matchesPolicy(["NOWAIT"], "async"));

      const wait = nodeResolvables.filter(
        (/** @type {Resolvable} */ x) => !matchesPolicy(["NOWAIT"], "async")(x),
      );

      // For the matching Resolvables, start their async fetch process.
      const subContext = this.subContext(
        /** @type {ng.BuiltStateDeclaration} */ (node.state),
      );

      const getResult = (
        /** @type {{ get: (arg0: ResolveContext, arg1: ng.Transition) => Promise<any>; token: any; }} */ resolve,
      ) =>
        resolve
          .get(subContext, trans)
          // Return a tuple that includes the Resolvable's token
          .then((value) => ({ token: resolve.token, value }));

      nowait.forEach(getResult);

      return acc.concat(wait.map(getResult));
    }, []);

    // Wait for all the "WAIT" resolvables
    return Promise.all(promises);
  }

  /**
   * @param {Resolvable} resolvable
   */
  findNode(resolvable) {
    return find(this._path, (/** @type {PathNode} */ node) =>
      node.resolvables.includes(resolvable),
    );
  }

  /**
   * Gets the async dependencies of a Resolvable
   *
   * Given a Resolvable, returns its dependencies as a Resolvable[]
   * @param {Resolvable} resolvable
   * @returns {Resolvable[]}
   */
  getDependencies(resolvable) {
    const node = this.findNode(resolvable);

    // Find which other resolvables are "visible" to the `resolvable` argument
    // subpath stopping at resolvable's node, or the whole path (if the resolvable isn't in the path)
    const subPath =
      PathUtils.subPath(this._path, (/** @type {any} */ x) => x === node) ||
      this._path;

    const availableResolvables = /** @type {Resolvable[]} */ (
      subPath.reduce(
        (
          /** @type {string | any[]} */ acc,
          /** @type {{ resolvables: any; }} */ _node,
        ) => acc.concat(_node.resolvables),
        [],
      ) // all of subpath's resolvables
    ).filter((/** @type {Resolvable} */ res) => res !== resolvable); // filter out the `resolvable` argument

    return resolvable.deps.map((/** @type {string} */ token) => {
      const matching = availableResolvables.filter(
        (/** @type {{ token: string; }} */ resolve) => resolve.token === token,
      );

      if (matching.length) return tail(matching);
      const fromInjector = window.angular.$injector.get(token);

      if (isUndefined(fromInjector)) {
        throw new Error(
          `Could not find Dependency Injection token: ${stringify(token)}`,
        );
      }

      return new Resolvable(token, () => fromInjector, [], fromInjector);
    });
  }
}
