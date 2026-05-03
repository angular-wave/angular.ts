import { assign, keys } from "../../shared/utils.ts";
import { TargetState } from "../state/target-state.ts";
import { PathNode } from "./path-node.ts";
import {
  createViewConfig,
  type ViewConfig,
  type ViewService,
} from "../view/view.ts";
import type { Param } from "../params/param.ts";
import type { GetParamsFn } from "./interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { RawParams } from "../params/interface.ts";
import type { TreeChanges } from "../transition/interface.ts";

/**
 * Converts a TargetState into the concrete path nodes used by a transition.
 */
export function buildPath(targetState: TargetState): PathNode[] {
  const toParams = targetState.params();

  const stateObject = targetState.$state() as StateObject;

  const states = stateObject.path || [];

  const path: PathNode[] = [];

  states.forEach((state) =>
    path.push(new PathNode(state).applyRawParams(toParams)),
  );

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
 * Creates internal view records and adds them to the nodes for the specified states.
 */
export function applyViewConfigs(
  $view: ViewService,
  path: PathNode[],
  states: StateObject[] | Set<StateObject>,
): void {
  const stateSet = states instanceof Set ? states : new Set(states);

  for (let i = 0; i < path.length; i++) {
    const node = path[i];

    if (!stateSet.has(node.state)) continue;

    const viewDecls = node.state._views || {};

    const viewSubPath = path.slice(0, i + 1);

    const viewConfigs: ViewConfig[] = [];

    keys(viewDecls).forEach((name) => {
      const templateFactory = $view._templateFactory;

      if (!templateFactory) {
        throw new Error("ViewService: No template factory registered");
      }

      viewConfigs.push(
        createViewConfig(viewSubPath, viewDecls[name], templateFactory),
      );
    });

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
  const noInherit = new Set<string>();

  const incomingKeys = new Set(toKeys);

  fromPath.forEach(({ paramSchema }) => {
    paramSchema.forEach((param) => {
      if (!param.inherit) {
        noInherit.add(param.id);
      }
    });
  });

  const inheritedPath: PathNode[] = [];

  for (let i = 0; i < toPath.length; i++) {
    const toNode = toPath[i];

    let fromParamVals: RawParams = {};

    for (let j = 0; j < fromPath.length; j++) {
      const fromNode = fromPath[j];

      if (fromNode.state === toNode.state) {
        fromParamVals = assign({}, fromNode.paramValues);

        break;
      }
    }

    noInherit.forEach((key) => delete fromParamVals[key]);

    const toParamVals: RawParams = {};

    const incomingParamVals: RawParams = {};

    const toNodeParamValues = toNode.paramValues;

    keys(toNodeParamValues).forEach((key) => {
      if (!incomingKeys.has(key)) {
        toParamVals[key] = toNodeParamValues[key];
      } else {
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
export function treeChanges(
  fromPath: PathNode[],
  toPath: PathNode[],
  reloadState?: StateObject,
): TreeChanges {
  const max = Math.min(fromPath.length, toPath.length);

  let keep = 0;

  while (
    keep < max &&
    fromPath[keep].state !== reloadState &&
    fromPath[keep].equals(toPath[keep], nonDynamicParams)
  ) {
    keep++;
  }

  const from = fromPath;

  const retained = from.slice(0, keep);

  const exiting = from.slice(keep);

  const retainedWithToParams: PathNode[] = [];

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

export function nonDynamicParams(node: PathNode): Param[] {
  const nonDynamic: Param[] = [];

  node.paramSchema.forEach((param) => {
    if (!param.dynamic) nonDynamic.push(param);
  });

  return nonDynamic;
}
