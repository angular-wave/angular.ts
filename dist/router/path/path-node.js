import { isInstanceOf, assign } from '../../shared/utils.js';
import { Param } from '../params/param.js';

/**
 * A node in a [[TreeChanges]] path
 *
 * For a [[TreeChanges]] path, this class holds the stateful information for a single node in the path.
 * Each PathNode corresponds to a state being entered, exited, or retained.
 * The stateful information includes parameter values and resolve data.
 */
class PathNode {
    /**
     * @param {PathNode | ng.StateObject | undefined} stateOrNode
     */
    constructor(stateOrNode) {
        if (isInstanceOf(stateOrNode, PathNode)) {
            const node = stateOrNode;
            this.state = node.state;
            this.paramSchema = node.paramSchema.slice();
            this.paramValues = assign({}, node.paramValues);
            this.resolvables = node.resolvables.slice();
            this._views = node._views && node._views.slice();
        }
        else {
            const state = stateOrNode;
            if (!state)
                throw new Error("PathNode requires a state");
            this.state = state;
            this.paramSchema = state.parameters({
                inherit: false,
            });
            this.paramValues = {};
            this.resolvables = state.resolvables?.map((res) => res.clone()) || [];
        }
    }
    clone() {
        return new PathNode(this);
    }
    /**
     * Sets [[paramValues]] for the node, from the values of an object hash
     * @param {RawParams} params
     * @returns {PathNode}
     */
    applyRawParams(params) {
        const paramValues = {};
        for (let i = 0; i < this.paramSchema.length; i++) {
            const paramDef = this.paramSchema[i];
            paramValues[paramDef.id] = paramDef.value(params[paramDef.id]);
        }
        this.paramValues = paramValues;
        return this;
    }
    /**
     * Gets a specific [[Param]] metadata that belongs to the node
     * @param {string} name
     * @returns {Param | undefined}
     */
    parameter(name) {
        for (let i = 0; i < this.paramSchema.length; i++) {
            const param = this.paramSchema[i];
            if (param.id === name)
                return param;
        }
        return undefined;
    }
    /**
     * @param {PathNode} node
     * @param {GetParamsFn} paramsFn
     * @returns {boolean} true if the state and parameter values for another PathNode are
    equal to the state and param values for this PathNode
     */
    equals(node, paramsFn) {
        const diff = this.diff(node, paramsFn);
        return diff !== false && diff.length === 0;
    }
    /**
     * Finds Params with different parameter values on another PathNode.
     *
     * Given another node (of the same state), finds the parameter values which differ.
     * Returns the [[Param]] (schema objects) whose parameter values differ.
     *
     * Given another node for a different state, returns `false`
     * @param {PathNode} node The node to compare to
     * @param {GetParamsFn} paramsFn A function that returns which parameters should be compared.
     * @returns { Param[] | false} The [[Param]]s which differ, or null if the two nodes are for different states
     */
    diff(node, paramsFn) {
        if (this.state !== node.state)
            return false;
        const params = paramsFn ? paramsFn(this) : this.paramSchema;
        return Param.changed(params, this.paramValues, node.paramValues);
    }
}

export { PathNode };
