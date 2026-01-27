/**
 * A node in a [[TreeChanges]] path
 *
 * For a [[TreeChanges]] path, this class holds the stateful information for a single node in the path.
 * Each PathNode corresponds to a state being entered, exited, or retained.
 * The stateful information includes parameter values and resolve data.
 */
export class PathNode {
  /**
   * @param {PathNode | ng.StateObject | undefined} stateOrNode
   */
  constructor(stateOrNode: PathNode | ng.StateObject | undefined);
  /** @type {ng.StateObject} */
  state: ng.StateObject;
  paramSchema: any;
  paramValues: any;
  resolvables: any;
  views: any;
  clone(): PathNode;
  /** Sets [[paramValues]] for the node, from the values of an object hash */
  applyRawParams(params: any): this;
  /** Gets a specific [[Param]] metadata that belongs to the node */
  parameter(name: any): any;
  /**
   * @returns true if the state and parameter values for another PathNode are
   * equal to the state and param values for this PathNode
   */
  equals(node: any, paramsFn: any): boolean;
  /**
   * Finds Params with different parameter values on another PathNode.
   *
   * Given another node (of the same state), finds the parameter values which differ.
   * Returns the [[Param]] (schema objects) whose parameter values differ.
   *
   * Given another node for a different state, returns `false`
   *
   * @param node The node to compare to
   * @param paramsFn A function that returns which parameters should be compared.
   * @returns The [[Param]]s which differ, or null if the two nodes are for different states
   */
  diff(node: any, paramsFn: any): false | Param[];
}
import { Param } from "../params/param.js";
