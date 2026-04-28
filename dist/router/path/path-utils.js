import { keys, values, assign, isArray } from '../../shared/utils.js';
import { TargetState } from '../state/target-state.js';
import { PathNode } from './path-node.js';

/**
 * Converts a TargetState into the concrete path nodes used by a transition.
 */
function buildPath(targetState) {
    const toParams = targetState.params();
    const stateObject = targetState.$state();
    const states = stateObject.path || [];
    const path = [];
    for (let i = 0; i < states.length; i++) {
        path.push(new PathNode(states[i]).applyRawParams(toParams));
    }
    return path;
}
/**
 * Given a fromPath and a TargetState, builds a toPath.
 */
function buildToPath(fromPath, targetState) {
    const toPath = buildPath(targetState);
    if (targetState.options().inherit) {
        return inheritParams(fromPath, toPath, keys(targetState.params()));
    }
    return toPath;
}
/**
 * Creates ViewConfig objects and adds them to the nodes for the specified states.
 */
function applyViewConfigs($view, path, states) {
    for (let i = 0; i < path.length; i++) {
        const node = path[i];
        if (!states.includes(node.state))
            continue;
        const viewDecls = values(node.state._views || {});
        const viewSubPath = subPath(path, (x) => x === node);
        if (!viewSubPath) {
            node._views = [];
            continue;
        }
        const viewConfigs = [];
        for (let j = 0; j < viewDecls.length; j++) {
            const viewConfig = $view._createViewConfig(viewSubPath, viewDecls[j]);
            if (isArray(viewConfig)) {
                viewConfigs.push(...viewConfig);
            }
            else {
                viewConfigs.push(viewConfig);
            }
        }
        node._views = viewConfigs;
    }
}
/**
 * Returns a new to path which inherits parameters from the from path.
 */
function inheritParams(fromPath, toPath, toKeys = []) {
    const noInherit = [];
    for (let i = 0; i < fromPath.length; i++) {
        const { paramSchema } = fromPath[i];
        for (let j = 0; j < paramSchema.length; j++) {
            const param = paramSchema[j];
            if (!param.inherit) {
                noInherit.push(param.id);
            }
        }
    }
    const inheritedPath = [];
    for (let i = 0; i < toPath.length; i++) {
        const toNode = toPath[i];
        let fromParamVals = {};
        for (let j = 0; j < fromPath.length; j++) {
            const fromNode = fromPath[j];
            if (fromNode.state === toNode.state) {
                fromParamVals = assign({}, fromNode.paramValues);
                break;
            }
        }
        for (let j = 0; j < noInherit.length; j++) {
            delete fromParamVals[noInherit[j]];
        }
        const toParamVals = {};
        const incomingParamVals = {};
        const toNodeParamValues = toNode.paramValues;
        for (const key in toNodeParamValues) {
            if (toKeys.indexOf(key) === -1) {
                toParamVals[key] = toNodeParamValues[key];
            }
            else {
                incomingParamVals[key] = toNodeParamValues[key];
            }
        }
        const ownParamVals = assign(toParamVals, fromParamVals, incomingParamVals);
        inheritedPath.push(new PathNode(toNode.state).applyRawParams(ownParamVals));
    }
    return inheritedPath;
}
/**
 * Computes the tree changes between a fromPath and toPath.
 */
function treeChanges(fromPath, toPath, reloadState) {
    const max = Math.min(fromPath.length, toPath.length);
    let keep = 0;
    const nodesMatch = (node1, node2) => node1.equals(node2, nonDynamicParams);
    while (keep < max &&
        fromPath[keep].state !== reloadState &&
        nodesMatch(fromPath[keep], toPath[keep])) {
        keep++;
    }
    function applyToParams(retainedNode, idx) {
        const cloned = retainedNode.clone();
        cloned.paramValues = toPath[idx].paramValues;
        return cloned;
    }
    const from = fromPath;
    const retained = from.slice(0, keep);
    const exiting = from.slice(keep);
    const retainedWithToParams = [];
    for (let i = 0; i < retained.length; i++) {
        retainedWithToParams.push(applyToParams(retained[i], i));
    }
    const entering = toPath.slice(keep);
    const to = retainedWithToParams.concat(entering);
    return { from, to, retained, retainedWithToParams, exiting, entering };
}
/**
 * Returns the path prefix whose nodes match both paths.
 */
function matching(pathA, pathB, paramsFn) {
    const matchingPath = [];
    const max = Math.min(pathA.length, pathB.length);
    for (let i = 0; i < max; i++) {
        const nodeA = pathA[i];
        const nodeB = pathB[i];
        if (!nodeA.equals(nodeB, paramsFn))
            break;
        matchingPath.push(nodeA);
    }
    return matchingPath;
}
/**
 * Return a subpath of a path which stops at the first matching node.
 */
function subPath(path, predicate) {
    let elementIdx = -1;
    for (let i = 0; i < path.length; i++) {
        if (predicate(path[i])) {
            elementIdx = i;
            break;
        }
    }
    return elementIdx === -1 ? undefined : path.slice(0, elementIdx + 1);
}
function nonDynamicParams(node) {
    const params = node.state.parameters({ inherit: false });
    const nonDynamic = [];
    for (let i = 0; i < params.length; i++) {
        const param = params[i];
        if (!param.dynamic)
            nonDynamic.push(param);
    }
    return nonDynamic;
}
/** Given a PathNode[], create an TargetState
 * @param {StateRegistryProvider} registry
 * @param {Array<PathNode>} path
 * @returns {TargetState}
 */
function makeTargetState(registry, path) {
    const tailNode = path.at(-1);
    if (!tailNode)
        throw new Error("Cannot create TargetState from an empty path");
    return new TargetState(registry, tailNode.state, pathToParams(path), {});
}
function pathToParams(path) {
    const params = {};
    for (let i = 0; i < path.length; i++) {
        assign(params, path[i].paramValues);
    }
    return params;
}

export { applyViewConfigs, buildPath, buildToPath, inheritParams, makeTargetState, matching, nonDynamicParams, subPath, treeChanges };
