import { find, omit, pick } from "../../shared/common.ts";
import { propEq } from "../../shared/hof.ts";
import { keys, values } from "../../shared/utils.ts";
import { TargetState } from "../state/target-state.ts";
import { PathNode } from "./path-node.ts";
import type { ViewService } from "../view/view.ts";
import type { Param } from "../params/param.ts";
import type { GetParamsFn } from "./interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { RawParams } from "../params/interface.ts";
import type { TreeChanges } from "../transition/interface.ts";
import type { StateRegistryProvider } from "../state/state-registry.ts";
import type { Predicate } from "../../shared/interface.ts";

/**
 * Converts a TargetState into the concrete path nodes used by a transition.
 */
export function buildPath(targetState: TargetState): PathNode[] {
  const toParams = targetState.params();

  const stateObject = targetState.$state() as StateObject;

  const states = stateObject.path || [];

  const path: PathNode[] = [];

  for (let i = 0; i < states.length; i++) {
    path.push(new PathNode(states[i]).applyRawParams(toParams));
  }

  return path;
}

/**
 * Given a fromPath and a TargetState, builds a toPath.
 */
export function buildToPath(
  fromPath: PathNode[],
  targetState: TargetState,
): PathNode[] {
  const toPath = buildPath(targetState);

  if (targetState.options().inherit) {
    return inheritParams(fromPath, toPath, keys(targetState.params()));
  }

  return toPath;
}

/**
 * Creates ViewConfig objects and adds them to the nodes for the specified states.
 */
export function applyViewConfigs(
  $view: ViewService,
  path: PathNode[],
  states: StateObject[],
): void {
  for (let i = 0; i < path.length; i++) {
    const node = path[i];

    if (!states.includes(node.state)) continue;

    const viewDecls = values(node.state._views || {});

    const viewSubPath = subPath(path, (x) => x === node);

    if (!viewSubPath) {
      node._views = [];

      continue;
    }

    const viewConfigs = [];

    for (let j = 0; j < viewDecls.length; j++) {
      const viewConfig = $view._createViewConfig(viewSubPath, viewDecls[j]);

      if (Array.isArray(viewConfig)) {
        viewConfigs.push(...viewConfig);
      } else {
        viewConfigs.push(viewConfig);
      }
    }

    node._views = viewConfigs;
  }
}

/**
 * Returns a new to path which inherits parameters from the from path.
 */
export function inheritParams(
  fromPath: PathNode[],
  toPath: PathNode[],
  toKeys: string[] = [],
): PathNode[] {
  function nodeParamVals(path: PathNode[], state: StateObject): RawParams {
    const node = find(path, propEq("state", state)) as PathNode | undefined;

    return Object.assign({}, node && node.paramValues);
  }

  const noInherit: string[] = [];

  for (let i = 0; i < fromPath.length; i++) {
    const { paramSchema } = fromPath[i];

    for (let j = 0; j < paramSchema.length; j++) {
      const param = paramSchema[j];

      if (!param.inherit) {
        noInherit.push(param.id);
      }
    }
  }

  function makeInheritedParamsNode(toNode: PathNode): PathNode {
    let toParamVals = Object.assign({}, toNode && toNode.paramValues);

    const incomingParamVals = pick(toParamVals, toKeys);

    toParamVals = omit(toParamVals, toKeys);
    const fromParamVals = omit(
      nodeParamVals(fromPath, toNode.state) || {},
      noInherit,
    );

    const ownParamVals = Object.assign(
      toParamVals,
      fromParamVals,
      incomingParamVals,
    );

    return new PathNode(toNode.state).applyRawParams(ownParamVals);
  }

  const inheritedPath: PathNode[] = [];

  for (let i = 0; i < toPath.length; i++) {
    inheritedPath.push(makeInheritedParamsNode(toPath[i]));
  }

  return inheritedPath;
}

/**
 * Computes the tree changes between a fromPath and toPath.
 */
export function treeChanges(
  fromPath: PathNode[],
  toPath: PathNode[],
  reloadState?: StateObject,
): TreeChanges {
  const max = Math.min(fromPath.length, toPath.length);

  let keep = 0;

  const nodesMatch = (node1: PathNode, node2: PathNode) =>
    node1.equals(node2, nonDynamicParams);

  while (
    keep < max &&
    fromPath[keep].state !== reloadState &&
    nodesMatch(fromPath[keep], toPath[keep])
  ) {
    keep++;
  }

  function applyToParams(retainedNode: PathNode, idx: number): PathNode {
    const cloned = retainedNode.clone();

    cloned.paramValues = toPath[idx].paramValues;

    return cloned;
  }

  const from = fromPath;

  const retained = from.slice(0, keep);

  const exiting = from.slice(keep);

  const retainedWithToParams: PathNode[] = [];

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
export function matching(
  pathA: PathNode[],
  pathB: PathNode[],
  paramsFn?: GetParamsFn,
): PathNode[] {
  const matchingPath: PathNode[] = [];

  const max = Math.min(pathA.length, pathB.length);

  for (let i = 0; i < max; i++) {
    const nodeA = pathA[i];

    const nodeB = pathB[i];

    if (!nodeA.equals(nodeB, paramsFn)) break;

    matchingPath.push(nodeA);
  }

  return matchingPath;
}

/**
 * Return a subpath of a path which stops at the first matching node.
 */
export function subPath(
  path: PathNode[],
  predicate: Predicate<PathNode>,
): PathNode[] | undefined {
  const node = find(path, predicate);

  if (!node) return undefined;

  const elementIdx = path.indexOf(node);

  return elementIdx === -1 ? undefined : path.slice(0, elementIdx + 1);
}

export function nonDynamicParams(node: PathNode): Param[] {
  return node.state
    .parameters({ inherit: false })
    .filter((param) => !param.dynamic);
}

/** Given a PathNode[], create an TargetState
 * @param {StateRegistryProvider} registry
 * @param {Array<PathNode>} path
 * @returns {TargetState}
 */
export function makeTargetState(
  registry: StateRegistryProvider,
  path: PathNode[],
): TargetState {
  const tailNode = path.at(-1);

  if (!tailNode)
    throw new Error("Cannot create TargetState from an empty path");

  return new TargetState(
    registry,
    tailNode.state,
    path.reduce((params, node) => Object.assign(params, node.paramValues), {}),
    {},
  );
}
