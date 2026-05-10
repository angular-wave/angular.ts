import { removeFrom } from "../shared/common.ts";
import { isInstanceOf } from "../shared/utils.ts";
import { compareUrlMatchers, UrlMatcher } from "./url/url-matcher.ts";
import type { RawParams } from "./params/interface.ts";
import type { StateObject } from "./state/state-object.ts";

const EXACT_ROUTE_MATCH_PRIORITY = Number.EPSILON;

/** @internal */
export type RouteMatch = {
  match: RawParams;
  state: StateObject;
  urlMatcher: UrlMatcher;
  weight: number;
};

function stateRouteMatchPriority(
  urlMatcher: UrlMatcher,
  params: RawParams,
): number {
  const path = urlMatcher._cache._path || [urlMatcher];

  let optionalCount = 0;

  let matched = 0;

  path.forEach((matcher) => {
    matcher._params.forEach((param) => {
      if (!param.isOptional) return;
      optionalCount++;

      if (params[param.id]) matched++;
    });
  });

  return optionalCount ? matched / optionalCount : EXACT_ROUTE_MATCH_PRIORITY;
}

/**
 * Tracks states with URL matchers and selects the best match for a URL.
 *
 * @internal
 */
export class RouteTable {
  /** @internal */
  _states: StateObject[];

  constructor() {
    this._states = [];
  }

  /** @internal */
  _add(state: StateObject): void {
    if (!this._states.includes(state)) {
      this._states.push(state);
    }
  }

  /** @internal */
  _remove(state: StateObject): void {
    removeFrom(this._states, state);
  }

  /** @internal */
  _match(
    path: string,
    search: RawParams,
    hash: string,
  ): RouteMatch | undefined {
    let best: RouteMatch | undefined;

    this._states.forEach((state) => {
      const urlMatcher = state._url;

      if (!isInstanceOf(urlMatcher, UrlMatcher)) return;

      const match = urlMatcher._exec(path, search, hash || "");

      if (match === null) return;

      const weight = stateRouteMatchPriority(urlMatcher, match);

      if (!best) {
        best = { match, state, urlMatcher, weight };

        return;
      }

      const specificity = compareUrlMatchers(urlMatcher, best.urlMatcher);

      if (specificity < 0 || (specificity === 0 && weight > best.weight)) {
        best = { match, state, urlMatcher, weight };
      }
    });

    return best;
  }
}
