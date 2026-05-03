import { removeFrom } from "../../shared/common.ts";
import { hasOwn, isFunction, isString } from "../../shared/utils.ts";
import type { PathNode } from "../path/path-node.ts";
import type { StateObject } from "../state/state-object.ts";
import { TransitionHookScope } from "./transition-hook.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookMatchCriterion,
  IStateMatch,
  HookRegOptions,
} from "./interface.ts";
import type { TransitionService } from "./transition-service.ts";
import type { Transition, TreeChanges } from "./transition.ts";
import type { TransitionEventType } from "./transition-event-type.ts";

export interface IMatchingNodes {
  [key: string]: PathNode[];

  to: PathNode[];
  from: PathNode[];
  exiting: PathNode[];
  retained: PathNode[];
  entering: PathNode[];
}

type HookRegistrationFn = (
  matchObject: HookMatchCriteria,
  callback: HookFn,
  options?: HookRegOptions,
) => DeregisterFn;

/**
 * Tests a state against one hook match criterion.
 */
export function matchState(
  state: StateObject,
  criterion: HookMatchCriterion,
  transition: Transition,
): boolean {
  if (isString(criterion)) {
    return criterion === state.name;
  }

  if (isFunction(criterion)) {
    return !!(criterion as IStateMatch)(state, transition);
  }

  return false;
}

/**
 * Stores one registered transition hook and evaluates whether it matches
 * a specific transition tree change set.
 */
export class RegisteredHook {
  tranSvc: TransitionService;
  /** @internal */
  _eventType: TransitionEventType;
  callback: HookFn;
  matchCriteria: HookMatchCriteria;
  /** @internal */
  _hooks: RegisteredHook[];
  invokeCount: number;
  /** @internal */
  _deregistered: boolean;
  priority: number;
  bind: unknown;
  invokeLimit: number | undefined;

  constructor(
    tranSvc: TransitionService,
    eventType: TransitionEventType,
    callback: HookFn,
    matchCriteria: HookMatchCriteria,
    hooks: RegisteredHook[],
    options: HookRegOptions = {},
  ) {
    this.tranSvc = tranSvc;
    this._eventType = eventType as TransitionEventType;
    this.callback = callback;
    this.matchCriteria = matchCriteria;
    this._hooks = hooks;
    this.invokeCount = 0;
    this._deregistered = false;
    this.priority = options.priority || 0;
    this.bind = options.bind || null;
    this.invokeLimit = options.invokeLimit;
  }

  /** @internal */
  _matchingNodes(
    nodes: PathNode[],
    criterion: HookMatchCriterion,
    transition: Transition,
  ): PathNode[] | null {
    if (criterion === true) return nodes;

    const matching: PathNode[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (matchState(node.state, criterion, transition)) {
        matching.push(node);
      }
    }

    return matching.length ? matching : null;
  }

  /** @internal */
  _getMatchingNodes(
    treeChanges: TreeChanges,
    transition: Transition,
  ): IMatchingNodes | null {
    const pathTypes = this.tranSvc._getPathTypes();

    const matchingNodes = {} as IMatchingNodes;

    for (const name in pathTypes) {
      const pathType = pathTypes[name];

      const isStateHook = pathType.scope === TransitionHookScope._STATE;

      const path = (treeChanges[pathType.name] || []) as PathNode[];

      const transitionNode = path.length ? path[path.length - 1] : undefined;

      const criterion = hasOwn(this.matchCriteria, pathType.name)
        ? (this.matchCriteria[pathType.name] as HookMatchCriterion)
        : true;

      if (criterion === true) {
        matchingNodes[pathType.name] = isStateHook
          ? path
          : transitionNode
            ? [transitionNode]
            : [];
        continue;
      }

      const matching = isStateHook
        ? this._matchingNodes(path, criterion, transition)
        : transitionNode &&
            matchState(transitionNode.state, criterion, transition)
          ? [transitionNode]
          : null;

      if (!matching) {
        return null;
      }

      matchingNodes[pathType.name] = matching;
    }

    return matchingNodes;
  }

  matches(
    treeChanges: TreeChanges,
    transition: Transition,
  ): IMatchingNodes | null {
    return this._getMatchingNodes(treeChanges, transition);
  }

  deregister(): void {
    removeFrom(this._hooks, this);
    this._deregistered = true;
  }
}

/** @internal */
export interface RegisteredHooks {
  [key: string]: RegisteredHook[];
}

type HookSource = {
  /** @internal */
  _registeredHooks?: RegisteredHooks;
};

/**
 * Registers a hook on either the transition service or a single transition.
 */
export function registerHook(
  hookSource: HookSource,
  transitionService: TransitionService,
  eventType: TransitionEventType,
  matchCriteria: HookMatchCriteria,
  callback: HookFn,
  options: HookRegOptions = {},
): DeregisterFn {
  const _registeredHooks = (hookSource._registeredHooks =
    hookSource._registeredHooks || ({} as RegisteredHooks));

  const hooks = (_registeredHooks[eventType.name] =
    _registeredHooks[eventType.name] || []);

  const registeredHook = new RegisteredHook(
    transitionService,
    eventType,
    callback,
    matchCriteria,
    hooks,
    options,
  );

  hooks.push(registeredHook);

  return registeredHook.deregister.bind(registeredHook);
}

/**
 * Creates a convenience `onX` registration function for a transition event.
 */
export function makeEvent(
  hookSource: HookSource,
  transitionService: TransitionService,
  eventType: TransitionEventType,
): HookRegistrationFn {
  const _registeredHooks = (hookSource._registeredHooks =
    hookSource._registeredHooks || ({} as RegisteredHooks));

  const hooks = (_registeredHooks[eventType.name] = [] as RegisteredHook[]);

  function hookRegistrationFn(
    matchObject: HookMatchCriteria,
    callback: HookFn,
    options: HookRegOptions = {},
  ): DeregisterFn {
    const registeredHook = new RegisteredHook(
      transitionService,
      eventType,
      callback,
      matchObject,
      hooks,
      options,
    );

    hooks.push(registeredHook);

    return registeredHook.deregister.bind(registeredHook);
  }

  (hookSource as HookSource & Record<string, HookRegistrationFn>)[
    eventType.name
  ] = hookRegistrationFn;

  return hookRegistrationFn;
}
