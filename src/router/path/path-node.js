import { applyPairs, find } from "../../shared/common.js";
import { propEq } from "../../shared/hof.js";
import { Param } from "../params/param.js";

/**
 * A node in a [[TreeChanges]] path
 *
 * For a [[TreeChanges]] path, this class holds the stateful information for a single node in the path.
 * Each PathNode corresponds to a state being entered, exited, or retained.
 * The stateful information includes parameter values and resolve data.
 */
export class PathNode {
  constructor(stateOrNode) {
    if (stateOrNode instanceof PathNode) {
      const node = stateOrNode;

      /** @type {ng.StateObject} */
      this.state = node.state;
      this.paramSchema = node.paramSchema.slice();
      this.paramValues = Object.assign({}, node.paramValues);
      this.resolvables = node.resolvables.slice();
      this.views = node.views && node.views.slice();
    } else {
      const state = stateOrNode;

      this.state = state;
      this.paramSchema = state.parameters({ inherit: false });
      this.paramValues = {};

      this.resolvables = state.resolvables.map((res) => res.clone());
    }
  }

  clone() {
    return new PathNode(this);
  }

  /** Sets [[paramValues]] for the node, from the values of an object hash */
  applyRawParams(params) {
    const getParamVal = (paramDef) => [
      paramDef.id,
      paramDef.value(params[paramDef.id]),
    ];

    this.paramValues = this.paramSchema.reduce(
      (memo, pDef) => applyPairs(memo, getParamVal(pDef)),
      {},
    );

    return this;
  }

  /** Gets a specific [[Param]] metadata that belongs to the node */
  parameter(name) {
    return find(this.paramSchema, propEq("id", name));
  }

  /**
   * @returns true if the state and parameter values for another PathNode are
   * equal to the state and param values for this PathNode
   */
  equals(node, paramsFn) {
    const diff = this.diff(node, paramsFn);

    return diff && diff.length === 0;
  }

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
  diff(node, paramsFn) {
    if (this.state !== node.state) return false;
    const params = paramsFn ? paramsFn(this) : this.paramSchema;

    return Param.changed(params, this.paramValues, node.paramValues);
  }
}
