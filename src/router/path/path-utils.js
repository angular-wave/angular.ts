import { arrayTuples, find, omit, pick, unnestR } from "../../shared/common.js";
import { propEq } from "../../shared/hof.js";
import { TargetState } from "../state/target-state.js";
import { PathNode } from "./path-node.js";

/** @typedef {import("../params/param.js").Param} Param */
/** @typedef {import("./interface.ts").GetParamsFn} GetParamsFn */
/** @typedef {import("../state/state-object.js").StateObject} StateObject */
/** @typedef {import("../params/interface.ts").RawParams} RawParams */

/**
 * This class contains functions which convert TargetStates, Nodes and paths from one type to another.
 */
export class PathUtils {
  /**
   * @param {TargetState} targetState
   */
  static buildPath(targetState) {
    const toParams = targetState.params();

    const stateObject = /** @type {ng.StateObject} */ (targetState.$state());

    return stateObject.path?.map((state) =>
      new PathNode(state).applyRawParams(toParams),
    );
  }

  /**
   * Given a fromPath: PathNode[] and a TargetState, builds a toPath: PathNode[]
   * @param {PathNode[]} fromPath
   * @param {TargetState} targetState
   */
  static buildToPath(fromPath, targetState) {
    const toPath = PathUtils.buildPath(targetState);

    if (targetState.options().inherit) {
      return PathUtils.inheritParams(
        fromPath,
        /** @type {PathNode[]} */ (toPath),
        Object.keys(targetState.params()),
      );
    }

    return toPath;
  }

  /**
   * Creates ViewConfig objects and adds to nodes.
   *
   * On each [[PathNode]], creates ViewConfig objects from the views: property of the node's state
   * @param {ng.ViewService} $view
   * @param {PathNode[]} path
   * @param {StateObject[]} states
   */
  static applyViewConfigs($view, path, states) {
    // Only apply the viewConfigs to the nodes for the given states
    path
      .filter((node) => states.includes(node.state))
      .forEach((node) => {
        const viewDecls = Object.values(node.state.views || {});

        const subPath = PathUtils.subPath(path, (x) => x === node);

        const viewConfigs = viewDecls.map((view) => {
          return $view._createViewConfig(
            /** @type {PathNode[]} */ (subPath),
            view,
          );
        });

        node.views = viewConfigs.reduce(unnestR, []);
      });
  }

  /**
   * Given a fromPath and a toPath, returns a new to path which inherits parameters from the fromPath
   *
   * For a parameter in a node to be inherited from the from path:
   * - The toPath's node must have a matching node in the fromPath (by state).
   * - The parameter name must not be found in the toKeys parameter array.
   *
   * Note: the keys provided in toKeys are intended to be those param keys explicitly specified by some
   * caller, for instance, $state.transitionTo(..., toParams).  If a key was found in toParams,
   * it is not inherited from the fromPath.
   * @param {PathNode[]} fromPath
   * @param {PathNode[]} toPath
   * @param {string[]} [toKeys]
   * @returns {PathNode[]}
   */
  static inheritParams(fromPath, toPath, toKeys = []) {
    /**
     * @param {PathNode[]} path
     * @param {StateObject} state
     * @returns {RawParams}
     */
    function nodeParamVals(path, state) {
      /** @type {PathNode} */
      const node = find(path, propEq("state", state));

      return Object.assign({}, node && node.paramValues);
    }
    const noInherit = fromPath
      .map((node) => node.paramSchema)
      .reduce(unnestR, [])
      .filter((/** @type {RawParams} */ param) => !param.inherit)
      .map((/** @type {RawParams} */ x) => x.id);

    /**
     * Given an [[PathNode]] "toNode", return a new [[PathNode]] with param values inherited from the
     * matching node in fromPath.  Only inherit keys that aren't found in "toKeys" from the node in "fromPath""
     * @param {PathNode} toNode
     * @return {PathNode}
     */
    function makeInheritedParamsNode(toNode) {
      // All param values for the node (may include default key/vals, when key was not found in toParams)
      let toParamVals = Object.assign({}, toNode && toNode.paramValues);

      // limited to only those keys found in toParams
      const incomingParamVals = pick(toParamVals, toKeys);

      toParamVals = omit(toParamVals, toKeys);
      const fromParamVals = omit(
        nodeParamVals(fromPath, toNode.state) || {},
        noInherit,
      );

      // extend toParamVals with any fromParamVals, then override any of those those with incomingParamVals
      const ownParamVals = Object.assign(
        toParamVals,
        fromParamVals,
        incomingParamVals,
      );

      return new PathNode(toNode.state).applyRawParams(ownParamVals);
    }

    // The param keys specified by the incoming toParams
    return toPath.map(makeInheritedParamsNode);
  }

  /**
   * Computes the tree changes (entering, exiting) between a fromPath and toPath.
   * @param {PathNode[]} fromPath
   * @param {PathNode[]} toPath
   * @param {StateObject} reloadState
   * @returns {import("../transition/interface.ts").TreeChanges}
   */
  static treeChanges(fromPath, toPath, reloadState) {
    const max = Math.min(fromPath.length, toPath.length);

    let keep = 0;

    const nodesMatch = (
      /** @type {PathNode} */ node1,
      /** @type {PathNode} */ node2,
    ) => node1.equals(node2, PathUtils.nonDynamicParams);

    while (
      keep < max &&
      fromPath[keep].state !== reloadState &&
      nodesMatch(fromPath[keep], toPath[keep])
    ) {
      keep++;
    }

    /**
     * Given a retained node, return a new node which uses the to node's param values
     * @param {PathNode} retainedNode
     * @param {number} idx
     */
    function applyToParams(retainedNode, idx) {
      const cloned = retainedNode.clone();

      cloned.paramValues = toPath[idx].paramValues;

      return cloned;
    }

    const from = fromPath;

    const retained = from.slice(0, keep);

    const exiting = from.slice(keep);

    // Create a new retained path (with shallow copies of nodes) which have the params of the toPath mapped
    const retainedWithToParams = retained.map(applyToParams);

    const entering = toPath.slice(keep);

    const to = retainedWithToParams.concat(entering);

    return { from, to, retained, retainedWithToParams, exiting, entering };
  }

  /**
   * Returns a new path which is: the subpath of the first path which matches the second path.
   *
   * The new path starts from root and contains any nodes that match the nodes in the second path.
   * It stops before the first non-matching node.
   *
   * Nodes are compared using their state property and their parameter values.
   * If a `paramsFn` is provided, only the [[Param]] returned by the function will be considered when comparing nodes.
   *
   * @param {PathNode[]} pathA the first path
   * @param {PathNode[]} pathB the second path
   * @param {GetParamsFn} [paramsFn] a function which returns the parameters to consider when comparing
   *
   * @returns {PathNode[]} an array of PathNodes from the first path which match the nodes in the second path
   */
  static matching(pathA, pathB, paramsFn) {
    let done = false;

    const tuples = arrayTuples(pathA, pathB);

    return tuples.reduce((matching, [nodeA, nodeB]) => {
      done = done || !nodeA.equals(nodeB, paramsFn);

      return done ? matching : matching.concat(nodeA);
    }, []);
  }

  /**
   * Returns true if two paths are identical.
   *
   * @param {PathNode[]} pathA
   * @param {PathNode[]} pathB
   * @param {GetParamsFn} [paramsFn] a function which returns the parameters to consider when comparing
   * @returns true if the the states and parameter values for both paths are identical
   */
  static equals(pathA, pathB, paramsFn) {
    return (
      pathA.length === pathB.length &&
      PathUtils.matching(pathA, pathB, paramsFn).length === pathA.length
    );
  }

  /**
   * Return a subpath of a path, which stops at the first matching node
   *
   * Given an array of nodes, returns a subset of the array starting from the first node,
   * stopping when the first node matches the predicate.
   * @param {PathNode[]} path a path of [[PathNode]]s
   * @param {import("../../shared/interface.ts").Predicate<PathNode>} predicate a [[Predicate]] fn that matches [[PathNode]]s
   * @returns {PathNode[] | undefined} a subpath up to the matching node, or undefined if no match is found
   */
  static subPath(path, predicate) {
    const node = find(path, predicate);

    const elementIdx = path.indexOf(node);

    return elementIdx === -1 ? undefined : path.slice(0, elementIdx + 1);
  }

  /**
   * @param {PathNode} node
   * @return {Param[]}
   */
  static nonDynamicParams(node) {
    return node.state
      .parameters({ inherit: false })
      .filter((param) => !param.dynamic);
  }

  /**
   * Gets the raw parameter values from a path
   * @param {PathNode[]} path
   */
  static paramValues(path) {
    return path.reduce((acc, node) => Object.assign(acc, node.paramValues), {});
  }
}

/** Given a PathNode[], create an TargetState
 * @param {import("../state/state-registry.js").StateRegistryProvider} registry
 * @param {Array<PathNode>} path
 * @returns {TargetState}
 */
export function makeTargetState(registry, path) {
  return new TargetState(
    registry,
    /** @type {PathNode} */ (path.at(-1)).state,
    path
      .map((x) => x.paramValues)
      .reduce((acc, obj) => ({ ...acc, ...obj }), {}),
    {},
  );
}
