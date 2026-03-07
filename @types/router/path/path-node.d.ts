import { Param } from "../params/param.ts";
import type { RawParams } from "../params/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { GetParamsFn } from "./interface.ts";
import type { ViewConfig } from "../state/views.ts";
import type { Resolvable } from "../resolve/resolvable.js";
/**
 * A node in a [[TreeChanges]] path
 *
 * For a [[TreeChanges]] path, this class holds the stateful information for a single node in the path.
 * Each PathNode corresponds to a state being entered, exited, or retained.
 * The stateful information includes parameter values and resolve data.
 */
export declare class PathNode {
  state: StateObject;
  paramSchema: Param[];
  paramValues: RawParams;
  resolvables: Resolvable[];
  views?: ViewConfig[];
  /**
   * @param {PathNode | ng.StateObject | undefined} stateOrNode
   */
  constructor(stateOrNode?: PathNode | StateObject);
  clone(): PathNode;
  /**
   * Sets [[paramValues]] for the node, from the values of an object hash
   * @param {import("../params/interface.ts").RawParams} params
   * @returns {PathNode}
   */
  applyRawParams(params: RawParams): PathNode;
  /**
   * Gets a specific [[Param]] metadata that belongs to the node
   * @param {string} name
   * @returns {Param | undefined}
   */
  parameter(name: string): Param | undefined;
  /**
     * @param {PathNode} node
     * @param {import("./interface.ts").GetParamsFn} paramsFn
     * @returns {boolean} true if the state and parameter values for another PathNode are
    equal to the state and param values for this PathNode
     */
  equals(node: PathNode, paramsFn?: GetParamsFn): boolean;
  /**
   * Finds Params with different parameter values on another PathNode.
   *
   * Given another node (of the same state), finds the parameter values which differ.
   * Returns the [[Param]] (schema objects) whose parameter values differ.
   *
   * Given another node for a different state, returns `false`
   * @param {PathNode} node The node to compare to
   * @param {import("./interface.ts").GetParamsFn} paramsFn A function that returns which parameters should be compared.
   * @returns { Param[] | false} The [[Param]]s which differ, or null if the two nodes are for different states
   */
  diff(node: PathNode, paramsFn?: GetParamsFn): Param[] | false;
}
