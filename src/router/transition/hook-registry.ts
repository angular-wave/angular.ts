import { removeFrom } from "../../shared/common.ts";
import { assign, isFunction, values, isString } from "../../shared/utils.ts";
import { Glob } from "../glob/glob.ts";
import type { PathNode } from "../path/path-node.ts";
import type { BuiltStateDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import { TransitionHookScope } from "./transition-hook.ts";
import type {
  DeregisterFn,
  HookFn,
  HookMatchCriteria,
  HookMatchCriterion,
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

/**
 * Tests a state against one hook match criterion.
 */
export function matchState(
  state: StateObject,
  criterion: HookMatchCriterion,
  transition: Transition,
): boolean {
  const toMatch = isString(criterion) ? [criterion] : criterion;

  const matchGlobs = (_state: BuiltStateDeclaration): boolean => {
    const globStrings = toMatch as string[];

    for (let i = 0; i < globStrings.length; i++) {
      const glob = new Glob(globStrings[i]);

      if (
        (glob && glob.matches(_state.name)) ||
        (!glob && globStrings[i] === _state.name)
      ) {
        return true;
      }
    }

    return false;
  };

  const matchFn = (isFunction(toMatch) ? toMatch : matchGlobs) as unknown as (
    state: StateObject,
    transition: Transition,
  ) => unknown;

  return !!matchFn(state, transition);
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
  removeHookFromRegistry: (hook: RegisteredHook) => void;
  invokeCount: number;
  /** @internal */
  _deregistered: boolean;
  priority: number;
  bind: unknown;
  invokeLimit: number | undefined;

  constructor(
    tranSvc: TransitionService,
    eventType: unknown,
    callback: HookFn,
    matchCriteria: HookMatchCriteria,
    removeHookFromRegistry: (hook: RegisteredHook) => void,
    options: HookRegOptions = {},
  ) {
    this.tranSvc = tranSvc;
    this._eventType = eventType as TransitionEventType;
    this.callback = callback;
    this.matchCriteria = matchCriteria;
    this.removeHookFromRegistry = removeHookFromRegistry;
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
  _getDefaultMatchCriteria(): HookMatchCriteria {
    const pathTypes = this.tranSvc._getPathTypes();

    const criteria = {} as HookMatchCriteria;

    for (const key in pathTypes) {
      criteria[key] = true;
    }

    return criteria;
  }

  /** @internal */
  _getMatchingNodes(
    treeChanges: TreeChanges,
    transition: Transition,
  ): IMatchingNodes {
    const criteria = assign(
      this._getDefaultMatchCriteria(),
      this.matchCriteria,
    );

    const pathTypes = values(this.tranSvc._getPathTypes());

    const matchingNodes = {} as IMatchingNodes;

    for (let i = 0; i < pathTypes.length; i++) {
      const pathType = pathTypes[i];

      const isStateHook = pathType.scope === TransitionHookScope._STATE;

      const path = (treeChanges[pathType.name] || []) as PathNode[];

      const transitionNode = path.length ? path[path.length - 1] : undefined;

      const nodes: PathNode[] = isStateHook
        ? path
        : transitionNode
          ? [transitionNode]
          : [];

      matchingNodes[pathType.name] = this._matchingNodes(
        nodes,
        criteria[pathType.name] as HookMatchCriterion,
        transition,
      ) as PathNode[];
    }

    return matchingNodes;
  }

  matches(
    treeChanges: TreeChanges,
    transition: Transition,
  ): IMatchingNodes | null {
    const matches = this._getMatchingNodes(treeChanges, transition);

    const matchedPaths = values(matches);

    let allMatched = true;

    for (let i = 0; i < matchedPaths.length; i++) {
      if (!matchedPaths[i]) {
        allMatched = false;
        break;
      }
    }

    return allMatched ? matches : null;
  }

  deregister(): void {
    this.removeHookFromRegistry(this);
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
} & Record<string, any>;

/**
 * Registers a hook on either the transition service or a single transition.
 */
export function registerHook(
  hookSource: HookSource,
  transitionService: TransitionService,
  eventType: unknown,
  matchCriteria: HookMatchCriteria,
  callback: HookFn,
  options: HookRegOptions = {},
): DeregisterFn {
  const typedEventType = eventType as TransitionEventType;

  const _registeredHooks = (hookSource._registeredHooks =
    hookSource._registeredHooks || ({} as RegisteredHooks));

  const hooks = (_registeredHooks[typedEventType.name] =
    _registeredHooks[typedEventType.name] || []);

  const removeHookFn = (hook: RegisteredHook): void => {
    removeFrom(hooks, hook);
  };

  const registeredHook = new RegisteredHook(
    transitionService,
    typedEventType,
    callback,
    matchCriteria,
    removeHookFn,
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
  eventType: unknown,
): (
  matchObject: HookMatchCriteria,
  callback: HookFn,
  options?: HookRegOptions,
) => DeregisterFn {
  const _registeredHooks = (hookSource._registeredHooks =
    hookSource._registeredHooks || ({} as RegisteredHooks));

  const typedEventType = eventType as TransitionEventType;

  const hooks = (_registeredHooks[typedEventType.name] =
    [] as RegisteredHook[]);

  const removeHookFn = (hook: RegisteredHook): void => {
    removeFrom(hooks, hook);
  };

  function hookRegistrationFn(
    matchObject: HookMatchCriteria,
    callback: HookFn,
    options: HookRegOptions = {},
  ): DeregisterFn {
    const registeredHook = new RegisteredHook(
      transitionService,
      typedEventType,
      callback,
      matchObject,
      removeHookFn,
      options,
    );

    hooks.push(registeredHook);

    return registeredHook.deregister.bind(registeredHook);
  }

  hookSource[typedEventType.name] = hookRegistrationFn;

  return hookRegistrationFn;
}
