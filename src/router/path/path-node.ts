import { applyPairs, find } from "../../shared/common.ts";
import { propEq } from "../../shared/hof.ts";
import { Param } from "../params/param.ts";
import type { RawParams } from "../params/param.ts";
import type { StateObject } from "../state/state-object.ts";
import type { ViewConfig } from "../state/views.ts";
import type { Resolvable } from "../resolve/resolvable.ts";

export type GetParamsFn = (pathNode: PathNode) => Param[];

/**
 * A node in a [[TreeChanges]] path
 *
 * For a [[TreeChanges]] path, this class holds the stateful information for a single node in the path.
 * Each PathNode corresponds to a state being entered, exited, or retained.
 * The stateful information includes parameter values and resolve data.
 */
export class PathNode {
  state: StateObject;
  paramSchema: Param[];
  paramValues: RawParams;
  resolvables: Resolvable[];
  views?: ViewConfig[];

  /** Creates a path node from either an existing node or a state object. */
  constructor(stateOrNode?: PathNode | StateObject) {
    if (stateOrNode instanceof PathNode) {
      const node = stateOrNode;
      this.state = node.state;
      this.paramSchema = node.paramSchema.slice();
      this.paramValues = Object.assign({}, node.paramValues);
      this.resolvables = node.resolvables.slice();
      this.views = node.views && node.views.slice();
    } else {
      const state = stateOrNode;
      if (!state) throw new Error("PathNode requires a state");

      this.state = state;
      this.paramSchema = state.parameters({
        inherit: false,
      });
      this.paramValues = {};
      this.resolvables = state.resolvables?.map((res) => res.clone()) || [];
    }
  }

  clone(): PathNode {
    return new PathNode(this);
  }

  /**
   * Sets [[paramValues]] for the node, from the values of an object hash
   */
  applyRawParams(params: RawParams): PathNode {
    const getParamVal = (paramDef: Param): [string, any] => [
      paramDef.id,
      paramDef.value(params[paramDef.id]),
    ];

    this.paramValues = this.paramSchema.reduce(
      (memo: RawParams, pDef: Param) => applyPairs(memo, getParamVal(pDef)),
      {},
    );

    return this;
  }

  /**
   * Gets a specific [[Param]] metadata that belongs to the node
   */
  parameter(name: string): Param | undefined {
    return find(this.paramSchema, propEq("id", name));
  }

  /**
   * Returns true when another node has the same state and equivalent parameter values.
   */
  equals(node: PathNode, paramsFn?: GetParamsFn): boolean {
    const diff = this.diff(node, paramsFn);

    return diff !== false && diff.length === 0;
  }

  /**
   * Finds Params with different parameter values on another PathNode.
   *
   * Given another node (of the same state), finds the parameter values which differ.
   * Returns the [[Param]] (schema objects) whose parameter values differ.
   *
   * Given another node for a different state, returns `false`.
   * @param node - The node to compare to.
   * @param paramsFn - A function that returns which parameters should be compared.
   * @returns The [[Param]]s which differ, or `false` if the two nodes are for different states.
   */
  diff(node: PathNode, paramsFn?: GetParamsFn): Param[] | false {
    if (this.state !== node.state) return false;
    const params = paramsFn ? paramsFn(this) : this.paramSchema;

    return Param.changed(params, this.paramValues, node.paramValues);
  }
}
