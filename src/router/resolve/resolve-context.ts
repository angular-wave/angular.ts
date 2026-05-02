import { stringify } from "../../shared/strings.ts";
import {
  isArray,
  isInstanceOf,
  isString,
  isUndefined,
} from "../../shared/utils.ts";
import type { PathNode } from "../path/path-node.ts";
import type { BuiltStateDeclaration } from "../state/interface.ts";
import type { StateObject } from "../state/state-object.ts";
import type { Transition } from "../transition/transition.ts";
import { Resolvable, type ResolvableLiteral } from "./resolvable.ts";
import type { ResolvableData, ResolvableToken } from "./interface.ts";

export type ResolvedToken = {
  token: ResolvableToken;
  value: ResolvableData;
};

async function resolveToken(
  resolvable: Resolvable,
  context: ResolveContext,
  trans: Transition,
): Promise<ResolvedToken> {
  return {
    token: resolvable.token,
    value: await resolvable.get(context, trans),
  };
}

/**
 * Provides resolve lookup and execution helpers for a specific transition path.
 */
export class ResolveContext {
  /** @internal */
  _path: PathNode[];
  /** @internal */
  _injector: ng.InjectorService | undefined;

  /**
   * @param _path path of nodes whose resolvables are visible in this context
   * @param _injector injector used when dependency tokens are not resolvables in the path
   */
  constructor(_path: PathNode[], _injector?: ng.InjectorService) {
    this._path = _path;
    this._injector = _injector;
  }

  /**
   * Returns the unique tokens available from all resolvables in this path.
   */
  getTokens(): ResolvableToken[] {
    const tokens: ResolvableToken[] = [];

    this._path.forEach(({ resolvables }) => {
      resolvables.forEach(({ token }) => {
        if (!tokens.includes(token)) {
          tokens.push(token);
        }
      });
    });

    return tokens;
  }

  /**
   * Returns the most local resolvable registered for the specified token.
   */
  getResolvable(token: ResolvableToken): Resolvable {
    let matching: Resolvable | undefined;

    this._path.forEach(({ resolvables }) => {
      resolvables.forEach((candidate) => {
        if (candidate.token === token) {
          matching = candidate as Resolvable;
        }
      });
    });

    return matching as Resolvable;
  }

  /**
   * Returns a child resolve context scoped to the specified state.
   */
  subContext(state: StateObject | BuiltStateDeclaration): ResolveContext {
    let contextPath: PathNode[] | undefined;

    for (let i = 0; i < this._path.length; i++) {
      if (this._path[i].state.name === state.name) {
        contextPath = this._path.slice(0, i + 1);
        break;
      }
    }

    return new ResolveContext(
      (contextPath || this._path) as PathNode[],
      this._injector,
    );
  }

  /**
   * Adds or replaces resolvables for a specific state in this path.
   */
  addResolvables(
    newResolvables: Array<Resolvable | ResolvableLiteral>,
    state: StateObject,
  ): void {
    let node: PathNode | undefined;

    for (let i = 0; i < this._path.length; i++) {
      const candidate = this._path[i];

      if (candidate.state === state) {
        node = candidate;
        break;
      }
    }

    if (!node) {
      throw new Error(`Could not find path node for state: ${state.name}`);
    }

    const resolvables: Resolvable[] = [];

    const keys: ResolvableToken[] = [];

    newResolvables.forEach((resolvable) => {
      const normalized = isInstanceOf(resolvable, Resolvable)
        ? resolvable
        : new Resolvable(resolvable);

      resolvables.push(normalized);
      keys.push(normalized.token);
    });

    const nextResolvables: Resolvable[] = [];

    node.resolvables.forEach((existing) => {
      if (!keys.includes(existing.token)) {
        nextResolvables.push(existing);
      }
    });

    resolvables.forEach((resolvable) => nextResolvables.push(resolvable));

    node.resolvables = nextResolvables;
  }

  /**
   * Resolves the path's resolvables.
   */
  resolvePath(eagerOnly = false, trans: Transition): Promise<ResolvedToken[]> {
    const promises: Promise<ResolvedToken>[] = [];

    this._path.forEach((node) => {
      const subContext = this.subContext(node.state);

      node.resolvables.forEach((resolvable) => {
        if (!eagerOnly || resolvable.eager) {
          promises.push(resolveToken(resolvable, subContext, trans));
        }
      });
    });

    return Promise.all(promises);
  }

  /**
   * Finds the path node that owns the provided resolvable.
   */
  findNode(resolvable: Resolvable): PathNode | undefined {
    for (let i = 0; i < this._path.length; i++) {
      const node = this._path[i];

      if (node.resolvables.includes(resolvable)) {
        return node;
      }
    }

    return undefined;
  }

  /**
   * Resolves the dependency tokens required by a resolvable from either
   * the current path or the injector fallback.
   */
  getDependencies(resolvable: Resolvable): Resolvable[] {
    const node = this.findNode(resolvable);

    let dependencyPath = this._path;

    if (node) {
      for (let i = 0; i < this._path.length; i++) {
        if (this._path[i] === node) {
          dependencyPath = this._path.slice(0, i + 1);
          break;
        }
      }
    }

    const availableResolvables: Resolvable[] = [];

    dependencyPath.forEach(({ resolvables }) => {
      resolvables.forEach((candidate) => {
        if (candidate !== resolvable) {
          availableResolvables.push(candidate as Resolvable);
        }
      });
    });

    const latestByToken = new Map<ResolvableToken, Resolvable>();

    availableResolvables.forEach((candidate) => {
      latestByToken.set(candidate.token, candidate);
    });

    const deps = isArray(resolvable.deps) ? resolvable.deps : [resolvable.deps];

    const dependencies: Resolvable[] = [];

    deps.forEach((token) => {
      const matching = latestByToken.get(token);

      if (matching) {
        dependencies.push(matching);

        return;
      }

      let fromInjector: unknown;

      if (this._injector && isString(token)) {
        try {
          fromInjector = this._injector.get(token);
        } catch {
          fromInjector = undefined;
        }
      }

      if (isUndefined(fromInjector)) {
        throw new Error(
          `Could not find Dependency Injection token: ${stringify(token)}`,
        );
      }

      dependencies.push(new Resolvable({ token, data: fromInjector }));
    });

    return dependencies;
  }
}
