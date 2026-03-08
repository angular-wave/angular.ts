import { find, tail, uniqR, unnestR } from "../../shared/common.ts";
import { propEq } from "../../shared/hof.ts";
import { stringify } from "../../shared/strings.ts";
import { isUndefined } from "../../shared/utils.ts";
import { PathUtils } from "../path/path-utils.ts";
import { trace } from "../common/trace.ts";
import type { PathNode } from "../path/path-node.ts";
import type { BuiltStateDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { Transition } from "../transition/transition.ts";
import { Resolvable } from "./resolvable.ts";
import type {
  PolicyWhen,
  ResolvePolicy,
  ResolvableLiteral,
} from "./interface.ts";

export const resolvePolicies = {
  when: {
    LAZY: "LAZY",
    EAGER: "EAGER",
  },
  async: {
    WAIT: "WAIT",
    NOWAIT: "NOWAIT",
  },
} as const;

const ALL_WHENS: PolicyWhen[] = [
  resolvePolicies.when.EAGER,
  resolvePolicies.when.LAZY,
];
const EAGER_WHENS: PolicyWhen[] = [resolvePolicies.when.EAGER];

/**
 * Provides resolve lookup and execution helpers for a specific transition path.
 */
export class ResolveContext {
  _path: PathNode[];

  /**
   * @param _path path of nodes whose resolvables are visible in this context
   */
  constructor(_path: PathNode[]) {
    this._path = _path;
  }

  /**
   * Returns the unique tokens available from all resolvables in this path.
   */
  getTokens(): any[] {
    return this._path
      .reduce(
        (acc: any[], node: PathNode) =>
          acc.concat(node.resolvables.map((resolve) => resolve.token)),
        [],
      )
      .reduce(uniqR, []);
  }

  /**
   * Returns the most local resolvable registered for the specified token.
   */
  getResolvable(token: string): Resolvable {
    const matching = this._path
      .map((node) => node.resolvables)
      .reduce(unnestR, [])
      .filter((resolve: Resolvable) => resolve.token === token);

    return tail(matching) as Resolvable;
  }

  /**
   * Computes the effective resolve policy for a resolvable in this context.
   */
  getPolicy(resolvable: Resolvable): Required<ResolvePolicy> {
    const node = this.findNode(resolvable);

    return resolvable.getPolicy(node?.state);
  }

  /**
   * Returns a child resolve context scoped to the specified state.
   */
  subContext(state: StateObject | BuiltStateDeclaration): ResolveContext {
    const subPath = PathUtils.subPath(
      this._path,
      (node?: PathNode) => node?.state.name === state.name,
    );

    return new ResolveContext((subPath || this._path) as PathNode[]);
  }

  /**
   * Adds or replaces resolvables for a specific state in this path.
   */
  addResolvables(
    newResolvables: Array<Resolvable | ResolvableLiteral>,
    state: StateObject,
  ): void {
    const node = find(this._path, propEq("state", state)) as
      | PathNode
      | undefined;

    if (!node) {
      throw new Error(`Could not find path node for state: ${state.name}`);
    }

    const resolvables = newResolvables.map((resolve) =>
      resolve instanceof Resolvable ? resolve : new Resolvable(resolve),
    );
    const keys = resolvables.map((resolve) => resolve.token);

    node.resolvables = node.resolvables
      .filter((resolve) => keys.indexOf(resolve.token) === -1)
      .concat(resolvables);
  }

  /**
   * Resolves the path's resolvables for the requested policy timing.
   */
  resolvePath(
    when: PolicyWhen = "LAZY",
    trans: Transition,
  ): Promise<any> | any {
    const whenOption = ALL_WHENS.includes(when) ? when : "LAZY";
    const matchedWhens =
      whenOption === resolvePolicies.when.EAGER ? EAGER_WHENS : ALL_WHENS;

    trace.traceResolvePath(this._path, when, trans);

    const matchesPolicy =
      (acceptedVals: any[], whenOrAsync: keyof ResolvePolicy) =>
      (resolvable: Resolvable) =>
        acceptedVals.includes(this.getPolicy(resolvable)[whenOrAsync]);

    const promises = this._path.reduce(
      (acc: Promise<{ token: any; value: any }>[], node: PathNode) => {
        const nodeResolvables = node.resolvables.filter(
          matchesPolicy(matchedWhens, "when"),
        );
        const nowait = nodeResolvables.filter(
          matchesPolicy(["NOWAIT"], "async"),
        );
        const wait = nodeResolvables.filter(
          (resolvable) => !matchesPolicy(["NOWAIT"], "async")(resolvable),
        );
        const subContext = this.subContext(node.state);
        const getResult = (resolve: Resolvable) =>
          resolve
            .get(subContext, trans)
            .then((value) => ({ token: resolve.token, value }));

        nowait.forEach(getResult);

        return acc.concat(wait.map(getResult));
      },
      [],
    );

    return Promise.all(promises);
  }

  /**
   * Finds the path node that owns the provided resolvable.
   */
  findNode(resolvable: Resolvable): PathNode | undefined {
    return find(this._path, (node: PathNode) =>
      node.resolvables.includes(resolvable),
    ) as PathNode | undefined;
  }

  /**
   * Resolves the dependency tokens required by a resolvable from either
   * the current path or the injector fallback.
   */
  getDependencies(resolvable: Resolvable): Resolvable[] {
    const node = this.findNode(resolvable);
    const subPath =
      PathUtils.subPath(this._path, (x) => x === node) || this._path;
    const availableResolvables: Resolvable[] = [];

    for (let i = 0; i < subPath.length; i++) {
      const { resolvables } = subPath[i];

      for (let j = 0; j < resolvables.length; j++) {
        const candidate = resolvables[j] as Resolvable;

        if (candidate !== resolvable) {
          availableResolvables.push(candidate);
        }
      }
    }

    const latestByToken = new Map<any, Resolvable>();

    for (let i = 0; i < availableResolvables.length; i++) {
      const candidate = availableResolvables[i];

      latestByToken.set(candidate.token, candidate);
    }

    const deps = Array.isArray(resolvable.deps)
      ? resolvable.deps
      : [resolvable.deps];

    return deps.map((token: string) => {
      const matching = latestByToken.get(token);

      if (matching) return matching;
      const fromInjector = window.angular.$injector.get(token);

      if (isUndefined(fromInjector)) {
        throw new Error(
          `Could not find Dependency Injection token: ${stringify(token)}`,
        );
      }

      return new Resolvable(
        token,
        () => fromInjector,
        [],
        undefined,
        fromInjector,
      );
    });
  }
}
