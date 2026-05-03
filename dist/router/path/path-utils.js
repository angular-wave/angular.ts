import { keys, assign } from '../../shared/utils.js';
import { PathNode } from './path-node.js';
import { createViewConfig } from '../view/view.js';

/**
 * Converts a TargetState into the concrete path nodes used by a transition.
 */
function buildPath(targetState) {
    const toParams = targetState.params();
    const stateObject = targetState.$state();
    const states = stateObject.path || [];
    const path = [];
    states.forEach((state) => path.push(new PathNode(state).applyRawParams(toParams)));
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
 * Creates internal view records and adds them to the nodes for the specified states.
 */
function applyViewConfigs($view, path, states) {
    const stateSet = states instanceof Set ? states : new Set(states);
    for (let i = 0; i < path.length; i++) {
        const node = path[i];
        if (!stateSet.has(node.state))
            continue;
        const viewDecls = node.state._views || {};
        const viewSubPath = path.slice(0, i + 1);
        const viewConfigs = [];
        keys(viewDecls).forEach((name) => {
            const templateFactory = $view._templateFactory;
            if (!templateFactory) {
                throw new Error("ViewService: No template factory registered");
            }
            viewConfigs.push(createViewConfig(viewSubPath, viewDecls[name], templateFactory));
        });
        node._views = viewConfigs;
    }
}
/**
 * Returns a new to path which inherits parameters from the from path.
 */
function inheritParams(fromPath, toPath, toKeys = []) {
    const noInherit = new Set();
    const incomingKeys = new Set(toKeys);
    fromPath.forEach(({ paramSchema }) => {
        paramSchema.forEach((param) => {
            if (!param.inherit) {
                noInherit.add(param.id);
            }
        });
    });
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
        noInherit.forEach((key) => delete fromParamVals[key]);
        const toParamVals = {};
        const incomingParamVals = {};
        const toNodeParamValues = toNode.paramValues;
        keys(toNodeParamValues).forEach((key) => {
            if (!incomingKeys.has(key)) {
                toParamVals[key] = toNodeParamValues[key];
            }
            else {
                incomingParamVals[key] = toNodeParamValues[key];
            }
        });
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
    while (keep < max &&
        fromPath[keep].state !== reloadState &&
        fromPath[keep].equals(toPath[keep], nonDynamicParams)) {
        keep++;
    }
    const from = fromPath;
    const retained = from.slice(0, keep);
    const exiting = from.slice(keep);
    const retainedWithToParams = [];
    retained.forEach((node, idx) => {
        const cloned = node.clone();
        cloned.paramValues = toPath[idx].paramValues;
        retainedWithToParams.push(cloned);
    });
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
function nonDynamicParams(node) {
    const nonDynamic = [];
    node.paramSchema.forEach((param) => {
        if (!param.dynamic)
            nonDynamic.push(param);
    });
    return nonDynamic;
}

export { applyViewConfigs, buildPath, buildToPath, inheritParams, matching, nonDynamicParams, treeChanges };
