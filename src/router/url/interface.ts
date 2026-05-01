import { StateDeclaration } from "../state/interface.ts";
import { Param, StateObject } from "../state/state-object.ts";
import { UrlMatcher } from "./url-matcher.ts";
import { ParamType } from "../params/param-type.ts";
import type { RawParams } from "../params/interface.ts";

export interface UrlMatcherCompileConfig {
  // If state is provided, use the configuration in the `params` block
  state?: StateDeclaration;
  strict?: boolean;
  caseInsensitive?: boolean;
  // If params are pre-decoded, set to false to avoid double decoding
  decodeParams?: boolean;
}

/**
 * An object containing the three parts of a URL
 */
export interface UrlParts {
  path: string;
  search?: RawParams;
  hash?: string;
}

/** The result of matching a URL against registered state URLs. */
export interface MatchResult {
  /** The matched state params */
  match: RawParams;
  /** The state that matched */
  state: StateObject;
  /** The state's URL matcher */
  urlMatcher: UrlMatcher;
  /** The match result weight */
  weight: number;
}

export interface UrlMatcherCache {
  segments?: Array<string | Param>;
  weights?: number[] | (2 | 3 | 1 | undefined)[];
  path?: UrlMatcher[];
  parent?: UrlMatcher;
  pattern?: RegExp | null;
}

export interface MatchDetails {
  id: string;
  regexp: string;
  segment: string;
  type: ParamType;
}

export const defaultConfig: UrlMatcherCompileConfig = {
  state: { params: {}, name: "" },
  strict: true,
  caseInsensitive: true,
  decodeParams: true,
};

export interface ParamDetails {
  param: Param;
  value: unknown;
  isValid: boolean;
  isDefaultValue: boolean;
  squash: boolean | string;
  encoded: string | string[];
}
